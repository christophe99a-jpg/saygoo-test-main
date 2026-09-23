const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const qrcode = require('qrcode');

const prisma = require('../config/prisma');
const { genererAccessToken, genererRefreshToken, genererJetonUsage, DUREE_ACCESS } = require('../utils/jwt');
const logger = require('../utils/logger');

const MAX_TENTATIVES = 5;
const DUREE_VERROU_MINUTES = 15;

// Ne jamais renvoyer le hash ni le secret 2FA au client
const nettoyer = (u) => {
  const { motDePasseHash, twoFactorSecret, ...reste } = u;
  return reste;
};

const journaliser = (data) =>
  prisma.journalAuth.create({ data }).catch((err) =>
    logger.warn('Échec écriture journal auth', { err: err.message }),
  );

const contexteRequete = (req) => ({
  adresseIp: req.ip,
  userAgent: req.headers['user-agent'],
});

/**
 * Rôles qu'un visiteur peut choisir lui-même en s'inscrivant.
 *
 * Les rôles du personnel SAYGOO (SUPER_ADMIN, ADMIN, COMPTABLE, MANAGER)
 * sont exclus : ils ne s'attribuent que depuis l'administration des comptes.
 * Auparavant, l'API acceptait n'importe quel rôle, et seule la validation
 * manuelle par un administrateur empêchait qu'un inconnu devienne
 * super-administrateur.
 */
const ROLES_INSCRIPTION = [
  'OPERATEUR_ECONOMIQUE',
  'CDA',
  'CONSIGNATAIRE',
  'GESTIONNAIRE_ENTREPOT',
  'TRANSPORTEUR',
];

// ── INSCRIPTION ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { email, motDePasse, prenom, nom, telephone, role, raisonSociale } = req.body;

    if (!email || !motDePasse || !prenom || !nom || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, mot de passe, prénom, nom et rôle sont obligatoires.',
      });
    }
    if (motDePasse.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }
    if (!ROLES_INSCRIPTION.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Ce rôle ne peut pas être choisi à l'inscription.",
      });
    }

    const emailNormalise = email.toLowerCase().trim();

    const existant = await prisma.utilisateur.findUnique({ where: { email: emailNormalise } });
    if (existant) {
      return res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email.' });
    }

    const motDePasseHash = await bcrypt.hash(motDePasse, 12);

    // Chaque compte est, pour l'instant, sa propre organisation.
    // L'identifiant est tiré ici pour servir aussi d'identifiant
    // d'organisation dès la création.
    //
    // Toute valeur d'organisation envoyée par le client est ignorée :
    // l'accepter permettrait de s'inscrire dans l'organisation d'une autre
    // société et d'en consulter les paiements.
    const id = crypto.randomUUID();

    const utilisateur = await prisma.utilisateur.create({
      data: {
        id,
        email: emailNormalise,
        motDePasseHash,
        prenom,
        nom,
        telephone,
        role,
        organisationId: id,
        raisonSociale,
        statut: 'EN_ATTENTE_VALIDATION',
      },
    });

    // Jeton de vérification d'email (à transmettre via le notification-service)
    const { token, expireAt } = genererJetonUsage(48);
    await prisma.jetonUsage.create({
      data: { token, type: 'VERIFICATION_EMAIL', utilisateurId: utilisateur.id, expireAt },
    });

    await journaliser({
      utilisateurId: utilisateur.id,
      email: emailNormalise,
      action: 'INSCRIPTION',
      ...contexteRequete(req),
    });

    logger.info('Nouveau compte créé', { email: emailNormalise, role });

    return res.status(201).json({
      success: true,
      message: 'Compte créé. Il doit être vérifié puis activé avant la première connexion.',
      data: {
        utilisateur: nettoyer(utilisateur),
        // En production, ce jeton part par email et n'est pas renvoyé ici.
        jetonVerification: process.env.NODE_ENV === 'production' ? undefined : token,
      },
    });
  } catch (err) {
    logger.error('Erreur inscription', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── CONNEXION ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, motDePasse, codeTotp } = req.body;

    if (!email || !motDePasse) {
      return res.status(400).json({ success: false, message: 'Email et mot de passe sont obligatoires.' });
    }

    const emailNormalise = email.toLowerCase().trim();
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email: emailNormalise } });

    // Message identique que le compte existe ou non : on n'indique pas
    // à un attaquant si l'email est enregistré.
    const echecGenerique = { success: false, message: 'Identifiants invalides.' };

    if (!utilisateur) {
      await journaliser({ email: emailNormalise, action: 'ECHEC_CONNEXION', succes: false, detail: 'Compte inexistant', ...contexteRequete(req) });
      return res.status(401).json(echecGenerique);
    }

    if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua > new Date()) {
      const minutes = Math.ceil((utilisateur.verrouilleJusqua - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Compte temporairement verrouillé. Réessayez dans ${minutes} minute(s).`,
      });
    }

    const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.motDePasseHash);

    if (!motDePasseValide) {
      const tentatives = utilisateur.tentativesEchouees + 1;
      const doitVerrouiller = tentatives >= MAX_TENTATIVES;

      await prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: {
          tentativesEchouees: tentatives,
          verrouilleJusqua: doitVerrouiller
            ? new Date(Date.now() + DUREE_VERROU_MINUTES * 60000)
            : utilisateur.verrouilleJusqua,
        },
      });

      await journaliser({ utilisateurId: utilisateur.id, email: emailNormalise, action: 'ECHEC_CONNEXION', succes: false, detail: `Tentative ${tentatives}`, ...contexteRequete(req) });

      if (doitVerrouiller) {
        return res.status(423).json({
          success: false,
          message: `Trop de tentatives. Compte verrouillé pendant ${DUREE_VERROU_MINUTES} minutes.`,
        });
      }
      return res.status(401).json(echecGenerique);
    }

    if (utilisateur.statut !== 'ACTIF') {
      const messages = {
        EN_ATTENTE_VALIDATION: 'Votre compte est en attente de validation par un administrateur.',
        SUSPENDU: 'Votre compte est suspendu. Contactez l\'administrateur.',
        DESACTIVE: 'Ce compte a été désactivé.',
      };
      return res.status(403).json({ success: false, message: messages[utilisateur.statut] });
    }

    // Double authentification si activée
    if (utilisateur.twoFactorActive) {
      if (!codeTotp) {
        return res.status(200).json({
          success: true,
          twoFactorRequis: true,
          message: 'Code de double authentification requis.',
        });
      }
      const codeValide = authenticator.verify({ token: codeTotp, secret: utilisateur.twoFactorSecret });
      if (!codeValide) {
        await journaliser({ utilisateurId: utilisateur.id, email: emailNormalise, action: 'ECHEC_2FA', succes: false, ...contexteRequete(req) });
        return res.status(401).json({ success: false, message: 'Code de double authentification invalide.' });
      }
    }

    // Émission des jetons
    const accessToken = genererAccessToken(utilisateur);
    const { token: refreshToken, expireAt } = genererRefreshToken();

    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: refreshToken,
          utilisateurId: utilisateur.id,
          expireAt,
          userAgent: req.headers['user-agent'],
          adresseIp: req.ip,
        },
      }),
      prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { derniereConnexion: new Date(), tentativesEchouees: 0, verrouilleJusqua: null },
      }),
    ]);

    await journaliser({ utilisateurId: utilisateur.id, email: emailNormalise, action: 'CONNEXION', ...contexteRequete(req) });

    return res.json({
      success: true,
      message: 'Connexion réussie.',
      data: {
        accessToken,
        refreshToken,
        expiresIn: DUREE_ACCESS,
        utilisateur: nettoyer(utilisateur),
      },
    });
  } catch (err) {
    logger.error('Erreur connexion', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── RAFRAÎCHISSEMENT DU TOKEN ────────────────────────────────────────────────────
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Le refresh token est obligatoire.' });
    }

    const stocke = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { utilisateur: true },
    });

    if (!stocke || stocke.revoque || stocke.expireAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token invalide ou expiré.' });
    }
    if (stocke.utilisateur.statut !== 'ACTIF') {
      return res.status(403).json({ success: false, message: 'Ce compte n\'est plus actif.' });
    }

    // Rotation : l'ancien jeton est révoqué et remplacé
    const nouveau = genererRefreshToken();

    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: stocke.id }, data: { revoque: true } }),
      prisma.refreshToken.create({
        data: {
          token: nouveau.token,
          utilisateurId: stocke.utilisateurId,
          expireAt: nouveau.expireAt,
          userAgent: req.headers['user-agent'],
          adresseIp: req.ip,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        accessToken: genererAccessToken(stocke.utilisateur),
        refreshToken: nouveau.token,
        expiresIn: DUREE_ACCESS,
      },
    });
  } catch (err) {
    logger.error('Erreur rafraîchissement token', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── DÉCONNEXION ──────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const { refreshToken, toutesSessions } = req.body;

    if (toutesSessions) {
      await prisma.refreshToken.updateMany({
        where: { utilisateurId: req.user.sub, revoque: false },
        data: { revoque: true },
      });
    } else if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, utilisateurId: req.user.sub },
        data: { revoque: true },
      });
    }

    await journaliser({ utilisateurId: req.user.sub, action: 'DECONNEXION', ...contexteRequete(req) });

    return res.json({ success: true, message: 'Déconnexion effectuée.' });
  } catch (err) {
    logger.error('Erreur déconnexion', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── PROFIL COURANT ───────────────────────────────────────────────────────────────
const me = async (req, res) => {
  try {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.sub } });
    if (!utilisateur) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }
    return res.json({ success: true, data: { utilisateur: nettoyer(utilisateur) } });
  } catch (err) {
    logger.error('Erreur profil', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── CHANGEMENT DE MOT DE PASSE ───────────────────────────────────────────────────
const changerMotDePasse = async (req, res) => {
  try {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;

    if (!ancienMotDePasse || !nouveauMotDePasse) {
      return res.status(400).json({ success: false, message: 'L\'ancien et le nouveau mot de passe sont obligatoires.' });
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.sub } });
    const valide = await bcrypt.compare(ancienMotDePasse, utilisateur.motDePasseHash);

    if (!valide) {
      return res.status(401).json({ success: false, message: 'Ancien mot de passe incorrect.' });
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);

    // Toutes les sessions sont invalidées après un changement de mot de passe
    await prisma.$transaction([
      prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { motDePasseHash: hash } }),
      prisma.refreshToken.updateMany({ where: { utilisateurId: utilisateur.id, revoque: false }, data: { revoque: true } }),
    ]);

    await journaliser({ utilisateurId: utilisateur.id, action: 'CHANGEMENT_MDP', ...contexteRequete(req) });

    return res.json({ success: true, message: 'Mot de passe modifié. Veuillez vous reconnecter.' });
  } catch (err) {
    logger.error('Erreur changement mot de passe', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── MOT DE PASSE OUBLIÉ ──────────────────────────────────────────────────────────
const motDePasseOublie = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'L\'email est obligatoire.' });
    }

    const emailNormalise = email.toLowerCase().trim();
    const utilisateur = await prisma.utilisateur.findUnique({ where: { email: emailNormalise } });

    // Réponse identique dans tous les cas : on ne révèle pas si l'email existe.
    const reponse = {
      success: true,
      message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
    };

    if (!utilisateur) return res.json(reponse);

    const { token, expireAt } = genererJetonUsage(2);
    await prisma.jetonUsage.create({
      data: { token, type: 'REINITIALISATION_MDP', utilisateurId: utilisateur.id, expireAt },
    });

    logger.info('Jeton de réinitialisation généré', { email: emailNormalise });

    return res.json({
      ...reponse,
      // En production, ce jeton part par email et n'est pas renvoyé ici.
      jetonReinitialisation: process.env.NODE_ENV === 'production' ? undefined : token,
    });
  } catch (err) {
    logger.error('Erreur mot de passe oublié', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { token, nouveauMotDePasse } = req.body;

    if (!token || !nouveauMotDePasse) {
      return res.status(400).json({ success: false, message: 'Le jeton et le nouveau mot de passe sont obligatoires.' });
    }
    if (nouveauMotDePasse.length < 8) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const jeton = await prisma.jetonUsage.findUnique({ where: { token } });

    if (!jeton || jeton.utilise || jeton.type !== 'REINITIALISATION_MDP' || jeton.expireAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Jeton invalide ou expiré.' });
    }

    const hash = await bcrypt.hash(nouveauMotDePasse, 12);

    await prisma.$transaction([
      prisma.utilisateur.update({
        where: { id: jeton.utilisateurId },
        data: { motDePasseHash: hash, tentativesEchouees: 0, verrouilleJusqua: null },
      }),
      prisma.jetonUsage.update({ where: { id: jeton.id }, data: { utilise: true } }),
      prisma.refreshToken.updateMany({ where: { utilisateurId: jeton.utilisateurId, revoque: false }, data: { revoque: true } }),
    ]);

    await journaliser({ utilisateurId: jeton.utilisateurId, action: 'REINITIALISATION_MDP', ...contexteRequete(req) });

    return res.json({ success: true, message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
  } catch (err) {
    logger.error('Erreur réinitialisation mot de passe', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── VÉRIFICATION D'EMAIL ─────────────────────────────────────────────────────────
const verifierEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Le jeton est obligatoire.' });
    }

    const jeton = await prisma.jetonUsage.findUnique({ where: { token } });

    if (!jeton || jeton.utilise || jeton.type !== 'VERIFICATION_EMAIL' || jeton.expireAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Jeton invalide ou expiré.' });
    }

    await prisma.$transaction([
      prisma.utilisateur.update({ where: { id: jeton.utilisateurId }, data: { emailVerifie: true } }),
      prisma.jetonUsage.update({ where: { id: jeton.id }, data: { utilise: true } }),
    ]);

    return res.json({
      success: true,
      message: 'Email vérifié. Votre compte doit encore être activé par un administrateur.',
    });
  } catch (err) {
    logger.error('Erreur vérification email', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

// ── DOUBLE AUTHENTIFICATION ──────────────────────────────────────────────────────
const initialiser2FA = async (req, res) => {
  try {
    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.sub } });

    if (utilisateur.twoFactorActive) {
      return res.status(400).json({ success: false, message: 'La double authentification est déjà active.' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(utilisateur.email, 'SAYGOO', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    // Le secret est stocké mais 2FA reste inactif tant qu'un code n'a pas été validé
    await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { twoFactorSecret: secret } });

    return res.json({
      success: true,
      message: 'Scannez le QR code puis validez avec un code pour activer.',
      data: { qrCode: qrCodeDataUrl, secret },
    });
  } catch (err) {
    logger.error('Erreur initialisation 2FA', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const activer2FA = async (req, res) => {
  try {
    const { codeTotp } = req.body;
    if (!codeTotp) {
      return res.status(400).json({ success: false, message: 'Le code est obligatoire.' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.sub } });

    if (!utilisateur.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Initialisez d\'abord la double authentification.' });
    }

    if (!authenticator.verify({ token: codeTotp, secret: utilisateur.twoFactorSecret })) {
      return res.status(401).json({ success: false, message: 'Code invalide.' });
    }

    await prisma.utilisateur.update({ where: { id: utilisateur.id }, data: { twoFactorActive: true } });
    await journaliser({ utilisateurId: utilisateur.id, action: 'ACTIVATION_2FA', ...contexteRequete(req) });

    return res.json({ success: true, message: 'Double authentification activée.' });
  } catch (err) {
    logger.error('Erreur activation 2FA', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

const desactiver2FA = async (req, res) => {
  try {
    const { motDePasse } = req.body;
    if (!motDePasse) {
      return res.status(400).json({ success: false, message: 'Le mot de passe est requis pour désactiver.' });
    }

    const utilisateur = await prisma.utilisateur.findUnique({ where: { id: req.user.sub } });
    if (!(await bcrypt.compare(motDePasse, utilisateur.motDePasseHash))) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect.' });
    }

    await prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { twoFactorActive: false, twoFactorSecret: null },
    });
    await journaliser({ utilisateurId: utilisateur.id, action: 'DESACTIVATION_2FA', ...contexteRequete(req) });

    return res.json({ success: true, message: 'Double authentification désactivée.' });
  } catch (err) {
    logger.error('Erreur désactivation 2FA', { err: err.message });
    return res.status(500).json({ success: false, message: 'Erreur interne.' });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changerMotDePasse,
  motDePasseOublie,
  reinitialiserMotDePasse,
  verifierEmail,
  initialiser2FA,
  activer2FA,
  desactiver2FA,
};

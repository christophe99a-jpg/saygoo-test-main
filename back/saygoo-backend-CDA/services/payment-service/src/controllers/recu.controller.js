const prisma = require('../config/prisma');
const logger = require('../utils/logger');
const { LIBELLES } = require('../services/paiement.etats');
const { peutAcceder } = require('../services/acces');
const {
  STATUTS_RECU,
  signatureValide,
  formaterMontant,
  genererRecuPDF
} = require('../services/recu');

const erreurInterne = (res) =>
  res.status(500).json({ success: false, message: 'Erreur interne.' });

/**
 * Attribue un numéro de reçu au paiement s'il n'en a pas encore.
 *
 * Format : REC-2026-008742, numérotation annuelle par séquence PostgreSQL.
 *
 * Le numéro est attribué une seule fois, à la première émission, puis
 * conservé : télécharger à nouveau le reçu redonne le même numéro. C'est
 * indispensable, sinon un même paiement aurait plusieurs reçus différents
 * en circulation.
 *
 * La mise à jour est conditionnelle (« seulement si numeroRecu est encore
 * vide ») pour résister à deux premiers téléchargements simultanés : le
 * second constate que le numéro a déjà été posé et relit celui du premier.
 */
const attribuerNumeroRecu = async (paiement) => {
  if (paiement.numeroRecu) return paiement;

  return prisma.$transaction(async (tx) => {
    const annee = new Date().getUTCFullYear();
    const sequence = `seq_recu_${annee}`;

    await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${sequence}`);
    const [resultat] = await tx.$queryRawUnsafe(`SELECT nextval('${sequence}') AS valeur`);
    const numeroRecu = `REC-${annee}-${String(resultat.valeur).padStart(6, '0')}`;

    const { count } = await tx.paiement.updateMany({
      where: { id: paiement.id, numeroRecu: null },
      data: { numeroRecu }
    });

    // count === 0 : un téléchargement concurrent a posé son numéro juste avant.
    // Le numéro que nous venions de tirer est perdu, ce qui est sans gravité :
    // une séquence peut avoir des trous, elle ne peut pas avoir de doublons.
    return tx.paiement.findUnique({ where: { id: paiement.id } });
  });
};

/**
 * GET /paiements/:id/recu
 *
 * Télécharge le reçu PDF d'un paiement encaissé.
 */
const telechargerRecu = async (req, res) => {
  try {
    const paiement = await prisma.paiement.findUnique({ where: { id: req.params.id } });
    if (!paiement || !peutAcceder(req.user, paiement)) {
      return res.status(404).json({ success: false, message: 'Paiement non trouvé.' });
    }

    if (!STATUTS_RECU.includes(paiement.statut)) {
      return res.status(409).json({
        success: false,
        message: 'Un reçu ne peut être émis que pour un paiement confirmé.'
      });
    }

    const avecNumero = await attribuerNumeroRecu(paiement);
    const pdf = await genererRecuPDF(avecNumero);

    logger.info('Reçu émis', {
      numeroRecu: avecNumero.numeroRecu,
      reference: avecNumero.reference,
      par: req.user?.sub
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${avecNumero.numeroRecu}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    // Le reçu contient des données personnelles : aucun cache intermédiaire.
    res.setHeader('Cache-Control', 'no-store');
    return res.send(pdf);
  } catch (err) {
    logger.error('Erreur émission reçu', { err: err.message, stack: err.stack });
    return erreurInterne(res);
  }
};

/**
 * GET /recus/verifier/:numeroRecu?s=<signature>
 *
 * Route PUBLIQUE, appelée en scannant le QR code du reçu.
 *
 * Elle répond de façon identique à un reçu inexistant et à une signature
 * invalide : distinguer les deux permettrait de découvrir quels numéros de
 * reçu existent en les essayant un par un.
 *
 * Seules les informations imprimées sur le reçu sont renvoyées, pour que le
 * vérificateur puisse les comparer au document qu'il a entre les mains.
 * Aucune donnée supplémentaire (téléphone, identifiants internes) n'est
 * exposée.
 */
const verifierRecu = async (req, res) => {
  const refus = () => res.status(404).json({
    success: false,
    authentique: false,
    message: 'Reçu introuvable ou signature invalide.'
  });

  try {
    const { numeroRecu } = req.params;
    const signature = req.query.s;

    if (!numeroRecu || !signature) return refus();

    const paiement = await prisma.paiement.findUnique({ where: { numeroRecu } });
    if (!paiement || !signatureValide(paiement, String(signature))) {
      logger.warn('Vérification de reçu refusée', { numeroRecu });
      return refus();
    }

    // Le reçu est authentique. Reste à savoir s'il vaut toujours preuve de
    // paiement : un remboursement survenu depuis l'émission l'invalide.
    let alerte = null;
    if (paiement.statut === 'REMBOURSEMENT_DEMANDE') {
      alerte = 'Ce paiement a fait l\'objet d\'une demande de remboursement : ' +
        'ce reçu ne vaut plus preuve de paiement.';
    } else if (!STATUTS_RECU.includes(paiement.statut)) {
      alerte = `Le paiement n'est plus confirmé (statut actuel : ${LIBELLES[paiement.statut]?.texte || paiement.statut}).`;
    }

    return res.json({
      success: true,
      authentique: true,
      valable: alerte === null,
      alerte,
      recu: {
        numeroRecu: paiement.numeroRecu,
        reference: paiement.reference,
        clientNom: paiement.clientNom,
        factureNum: paiement.factureNum || null,
        montant: paiement.montant,
        devise: paiement.devise,
        montantFormate: formaterMontant(paiement.montant, paiement.devise),
        datePaiement: paiement.datePaiement,
        statut: paiement.statut,
        libelleStatut: LIBELLES[paiement.statut]?.texte || paiement.statut
      }
    });
  } catch (err) {
    logger.error('Erreur vérification reçu', { err: err.message });
    return erreurInterne(res);
  }
};

module.exports = { telechargerRecu, verifierRecu, attribuerNumeroRecu };

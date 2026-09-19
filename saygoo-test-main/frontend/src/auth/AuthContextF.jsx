/* eslint-disable react-refresh/only-export-components */
// src/auth/AuthContextF.jsx
// Contexte d'authentification — s'appuie exclusivement sur l'auth-service SAYGOO
// via l'API Gateway. Aucune session n'est créée si le back-end est injoignable.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ROLE_DEFINITIONS_BY_KEY, versRoleBackend, versRoleFrontend } from './roles';
import { AuthAPI, lireSession, ecrireSession } from '../lib/apiF';

const ROLE_STORAGE_KEY = 'saygoo.auth.selected-role.v1';

const AuthContext = createContext(null);

function lireRoleChoisi() {
  try {
    const raw = localStorage.getItem(ROLE_STORAGE_KEY);
    const cle = raw ? JSON.parse(raw) : null;
    return ROLE_DEFINITIONS_BY_KEY[cle] ? cle : null;
  } catch {
    return null;
  }
}

function ecrireRoleChoisi(cle) {
  if (!cle) {
    localStorage.removeItem(ROLE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(cle));
}

// Construit la session applicative à partir de la réponse de l'auth-service.
function construireSession({ accessToken, refreshToken, utilisateur }, mode) {
  const roleFront = versRoleFrontend(utilisateur.role);

  return {
    accessToken,
    refreshToken,
    role: roleFront,
    roleBackend: utilisateur.role,
    mode,
    email: utilisateur.email,
    issuedAt: Date.now(),
    profile: {
      fullName: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
      companyName: utilisateur.raisonSociale || '',
      roleIdentifier: utilisateur.organisationId || '',
    },
    utilisateur,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => lireSession());
  const [selectedRole, setSelectedRoleState] = useState(() => lireRoleChoisi());

  const appliquerSession = useCallback((nouvelleSession) => {
    setSession(nouvelleSession);
    ecrireSession(nouvelleSession);

    if (nouvelleSession?.role) {
      setSelectedRoleState(nouvelleSession.role);
      ecrireRoleChoisi(nouvelleSession.role);
    }
  }, []);

  const logout = useCallback(async () => {
    const courante = lireSession();

    // On tente de révoquer le refresh token côté serveur, sans bloquer
    // la déconnexion locale si le service ne répond pas.
    if (courante?.refreshToken) {
      try {
        await AuthAPI.deconnexion(courante.refreshToken);
      } catch {
        /* déconnexion locale malgré tout */
      }
    }

    setSession(null);
    ecrireSession(null);
    setSelectedRoleState(null);
    ecrireRoleChoisi(null);
  }, []);

  // Le client API émet cet événement quand le refresh échoue :
  // la session est alors devenue inutilisable.
  useEffect(() => {
    const surExpiration = () => {
      setSession(null);
      setSelectedRoleState(null);
      ecrireRoleChoisi(null);
    };
    window.addEventListener('saygoo:session-expiree', surExpiration);
    return () => window.removeEventListener('saygoo:session-expiree', surExpiration);
  }, []);

  const selectRole = (cle) => {
    const role = ROLE_DEFINITIONS_BY_KEY[cle] ? cle : 'ROLE_CLIENT';
    setSelectedRoleState(role);
    ecrireRoleChoisi(role);
  };

  const clearSelectedRole = () => {
    setSelectedRoleState(null);
    ecrireRoleChoisi(null);
  };

  // ─── CONNEXION / INSCRIPTION ────────────────────────────────────
  const login = async ({ mode, email, password, fullName, companyName, role }) => {
    if (mode === 'signup') {
      const [prenom, ...resteNom] = (fullName || '').trim().split(' ');

      const reponse = await AuthAPI.inscription({
        email: email.trim(),
        motDePasse: password,
        prenom: prenom || 'Utilisateur',
        nom: resteNom.join(' ') || 'SAYGOO',
        raisonSociale: (companyName || '').trim() || undefined,
        role: versRoleBackend(role),
      });

      // Le compte est créé mais reste à valider : aucune session n'est ouverte.
      return {
        inscriptionReussie: true,
        message: reponse.message,
        utilisateur: reponse.data?.utilisateur,
      };
    }

    const reponse = await AuthAPI.connexion({
      email: email.trim(),
      motDePasse: password,
    });

    // Le compte a la double authentification activée : un code est attendu.
    if (reponse.twoFactorRequis) {
      return { twoFactorRequis: true, message: reponse.message };
    }

    const nouvelleSession = construireSession(reponse.data, mode);
    appliquerSession(nouvelleSession);
    return nouvelleSession;
  };

  // Second temps de la connexion lorsque la 2FA est active.
  const validerDoubleAuthentification = async ({ email, password, codeTotp }) => {
    const reponse = await AuthAPI.connexion({
      email: email.trim(),
      motDePasse: password,
      codeTotp,
    });

    const nouvelleSession = construireSession(reponse.data, 'login');
    appliquerSession(nouvelleSession);
    return nouvelleSession;
  };

  // Recharge le profil depuis le serveur (après une modification par exemple).
  const rafraichirProfil = async () => {
    const reponse = await AuthAPI.monProfil();
    const utilisateur = reponse.data.utilisateur;

    setSession((precedente) => {
      if (!precedente) return precedente;
      const maj = {
        ...precedente,
        utilisateur,
        role: versRoleFrontend(utilisateur.role),
        roleBackend: utilisateur.role,
        profile: {
          ...precedente.profile,
          fullName: `${utilisateur.prenom} ${utilisateur.nom}`.trim(),
          companyName: utilisateur.raisonSociale || '',
        },
      };
      ecrireSession(maj);
      return maj;
    });

    return utilisateur;
  };

  const value = {
    session,
    selectedRole,
    isAuthenticated: Boolean(session?.accessToken),
    selectRole,
    clearSelectedRole,
    login,
    validerDoubleAuthentification,
    rafraichirProfil,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

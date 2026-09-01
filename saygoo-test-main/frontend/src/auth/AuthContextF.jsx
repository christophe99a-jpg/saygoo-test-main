/* eslint-disable react-refresh/only-export-components */
// front-F/src/auth/AuthContextF.jsx
// Contexte d'authentification unifié — appels réels au back-end Express avec fallback local.

import React, { createContext, useContext, useState } from 'react';
import { ROLE_DEFINITIONS_BY_KEY } from './roles';

const SESSION_STORAGE_KEY = 'saygoo.auth.session.v1';
const ROLE_STORAGE_KEY = 'saygoo.auth.selected-role.v1';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

const AuthContext = createContext(null);

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson(key) {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;

  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredRole() {
  const roleKey = readJson(ROLE_STORAGE_KEY);
  return ROLE_DEFINITIONS_BY_KEY[roleKey] ? roleKey : null;
}

function readStoredSession() {
  const session = readJson(SESSION_STORAGE_KEY);

  if (!session) return null;
  if (session.role && !ROLE_DEFINITIONS_BY_KEY[session.role]) {
    writeJson(SESSION_STORAGE_KEY, null);
    return null;
  }

  if (!session.expiresAt || session.expiresAt < Date.now()) {
    writeJson(SESSION_STORAGE_KEY, null);
    return null;
  }

  return session;
}

function createSessionToken(email) {
  const entropy =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 14);

  const payload = `${email}:${Date.now()}`;
  const encoded =
    typeof btoa === 'function'
      ? btoa(payload).replace(/=/g, '')
      : payload.replace(/[^a-zA-Z0-9]/g, '');

  return `saygoo.${encoded}.${entropy}`;
}

function normalizeRole(roleKey) {
  return ROLE_DEFINITIONS_BY_KEY[roleKey] ? roleKey : 'ROLE_CLIENT';
}

// Mapping des rôles front-end vers les rôles back-end
const ROLE_MAP_TO_BACKEND = {
  ROLE_CDA: 'CDA',
  ROLE_CLIENT: 'OPERATEUR',
  ROLE_CONSIGNATEUR: 'CONSIGNATEUR',
  ROLE_TRANSPORTEUR: 'TRANSPORTEUR',
  ROLE_ENTREPOSEUR: 'ENTREPOSEUR',
};

const ROLE_MAP_FROM_BACKEND = Object.fromEntries(
  Object.entries(ROLE_MAP_TO_BACKEND).map(([k, v]) => [v, k])
);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [selectedRole, setSelectedRoleState] = useState(() => readStoredRole());

  const selectRole = (roleKey) => {
    const nextRole = normalizeRole(roleKey);
    setSelectedRoleState(nextRole);
    writeJson(ROLE_STORAGE_KEY, nextRole);
  };

  const clearSelectedRole = () => {
    setSelectedRoleState(null);
    writeJson(ROLE_STORAGE_KEY, null);
  };

  // ─── LOGIN : appel réel au back-end avec fallback local ───────
  const login = async ({
    mode,
    email,
    password,
    fullName,
    companyName,
    role,
  }) => {
    const now = Date.now();
    const normalizedRole = role ? normalizeRole(role) : null;
    const backendRole = normalizedRole ? (ROLE_MAP_TO_BACKEND[normalizedRole] || 'OPERATEUR') : 'OPERATEUR';

    try {
      if (mode === 'signup') {
        // ── INSCRIPTION ──
        const res = await fetch('/api/v1/auth/inscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raisonSociale: (companyName || '').trim() || 'Organisation SAYGOO',
            nomRepresentant: (fullName || '').trim().split(' ')[0] || 'Utilisateur',
            prenomRepresentant: (fullName || '').trim().split(' ').slice(1).join(' ') || 'SAYGOO',
            email: email.trim(),
            telephone: '00000000',
            motDePasse: password,
            role: backendRole,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const nextSession = {
            token: data.data.accessToken,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            role: normalizedRole,
            mode,
            email: email.trim(),
            issuedAt: now,
            expiresAt: now + SESSION_DURATION_MS,
            profile: {
              fullName: data.data.user?.nomRepresentant
                ? `${data.data.user.nomRepresentant} ${data.data.user.prenomRepresentant}`
                : (fullName || '').trim() || 'Utilisateur SAYGOO',
              companyName: data.data.user?.raisonSociale || (companyName || '').trim() || 'Organisation SAYGOO',
              roleIdentifier: '',
            },
            credentials: { passwordLength: password.length },
            backendUser: data.data.user,
          };

          if (normalizedRole) {
            setSelectedRoleState(normalizedRole);
            writeJson(ROLE_STORAGE_KEY, normalizedRole);
          }

          setSession(nextSession);
          writeJson(SESSION_STORAGE_KEY, nextSession);
          return nextSession;
        }

        // En cas d'erreur API (ex: email déjà pris), on laisse l'erreur remonter
        console.warn('[AuthContextF] Inscription erreur API :', data.message);
        // Fallback local si l'erreur n'est pas critique
        if (res.status === 409) {
          throw new Error(data.message || 'Un compte existe déjà avec cet email');
        }
      } else {
        // ── CONNEXION ──
        const res = await fetch('/api/v1/auth/connexion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            motDePasse: password,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const serverRole = data.data.user?.role;
          const frontendRole = ROLE_MAP_FROM_BACKEND[serverRole] || normalizedRole || 'ROLE_CLIENT';

          const nextSession = {
            token: data.data.accessToken,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            role: frontendRole,
            mode,
            email: email.trim(),
            issuedAt: now,
            expiresAt: now + SESSION_DURATION_MS,
            profile: {
              fullName: data.data.user?.nomRepresentant
                ? `${data.data.user.nomRepresentant} ${data.data.user.prenomRepresentant}`
                : 'Utilisateur SAYGOO',
              companyName: data.data.user?.raisonSociale || 'Organisation SAYGOO',
              roleIdentifier: '',
            },
            credentials: { passwordLength: password.length },
            backendUser: data.data.user,
          };

          setSelectedRoleState(frontendRole);
          writeJson(ROLE_STORAGE_KEY, frontendRole);
          setSession(nextSession);
          writeJson(SESSION_STORAGE_KEY, nextSession);
          return nextSession;
        }

        if (res.status === 401) {
          throw new Error(data.message || 'Email ou mot de passe incorrect');
        }
      }
    } catch (err) {
      // Si c'est une erreur d'authentification (401 / 409), on la remonte
      if (err.message && (err.message.includes('incorrect') || err.message.includes('existe déjà'))) {
        throw err;
      }
      // Sinon, c'est probablement un problème réseau → fallback local
      console.warn('[AuthContextF] Backend indisponible, fallback session locale :', err.message);
    }

    // ─── FALLBACK LOCAL (quand le back-end est indisponible) ────
    if (normalizedRole) {
      setSelectedRoleState(normalizedRole);
      writeJson(ROLE_STORAGE_KEY, normalizedRole);
    }

    const nextSession = {
      token: createSessionToken(email),
      role: normalizedRole,
      mode,
      email: email.trim(),
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      profile: {
        fullName: (fullName || '').trim() || 'Utilisateur SAYGOO',
        companyName: (companyName || '').trim() || 'Organisation SAYGOO',
        roleIdentifier: '',
      },
      credentials: {
        passwordLength: password.length,
      },
    };

    setSession(nextSession);
    writeJson(SESSION_STORAGE_KEY, nextSession);

    return nextSession;
  };

  const assignRole = (roleKey) => {
    const normalizedRole = normalizeRole(roleKey);
    setSelectedRoleState(normalizedRole);
    writeJson(ROLE_STORAGE_KEY, normalizedRole);

    setSession((prev) => {
      if (!prev) return prev;

      const nextSession = {
        ...prev,
        role: normalizedRole,
      };

      writeJson(SESSION_STORAGE_KEY, nextSession);
      return nextSession;
    });

    return normalizedRole;
  };

  const clearRole = () => {
    clearSelectedRole();

    setSession((prev) => {
      if (!prev) return prev;

      const nextSession = {
        ...prev,
        role: null,
      };

      writeJson(SESSION_STORAGE_KEY, nextSession);
      return nextSession;
    });
  };

  const logout = () => {
    setSession(null);
    writeJson(SESSION_STORAGE_KEY, null);
    clearSelectedRole();
  };

  const value = {
    session,
    selectedRole,
    isAuthenticated: Boolean(session),
    selectRole,
    clearSelectedRole,
    login,
    assignRole,
    clearRole,
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

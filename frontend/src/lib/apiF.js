// src/lib/apiF.js
// Client API unifié — toutes les requêtes passent par l'API Gateway (/api/v1),
// qui les répartit vers les microservices SAYGOO.

export const API_BASE = '/api/v1';
export const SESSION_STORAGE_KEY = 'saygoo.auth.session.v1';

// ──────────────────────────────────────────────────────────────────
// Session : lecture / écriture dans le localStorage
// ──────────────────────────────────────────────────────────────────
export function lireSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ecrireSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

// Prévient l'application quand la session devient invalide, pour que
// le contexte d'authentification puisse rediriger vers l'écran de connexion.
function signalerSessionExpiree() {
  ecrireSession(null);
  window.dispatchEvent(new CustomEvent('saygoo:session-expiree'));
}

// ──────────────────────────────────────────────────────────────────
// Rafraîchissement du token
// ──────────────────────────────────────────────────────────────────
// Une seule requête de refresh à la fois : si plusieurs appels échouent
// simultanément en 401, ils attendent tous le même rafraîchissement.
let refreshEnCours = null;

async function rafraichirToken() {
  const session = lireSession();
  if (!session?.refreshToken) return null;

  if (!refreshEnCours) {
    refreshEnCours = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) return null;

        const majSession = {
          ...lireSession(),
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
        };
        ecrireSession(majSession);
        return majSession.accessToken;
      } catch {
        return null;
      } finally {
        refreshEnCours = null;
      }
    })();
  }

  return refreshEnCours;
}

// ──────────────────────────────────────────────────────────────────
// Appel HTTP générique
// ──────────────────────────────────────────────────────────────────
export async function apiFetch(chemin, options = {}) {
  const { sansAuth = false, ...reste } = options;

  const executer = async (token) => {
    const headers = { 'Content-Type': 'application/json', ...reste.headers };
    if (token && !sansAuth) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${chemin}`, { ...reste, headers });
  };

  const session = lireSession();
  let res = await executer(session?.accessToken);

  // Token expiré : on rafraîchit une fois puis on rejoue la requête.
  if (res.status === 401 && !sansAuth && session?.refreshToken) {
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) {
      res = await executer(nouveauToken);
    } else {
      signalerSessionExpiree();
    }
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    if (res.status === 401 && !sansAuth) signalerSessionExpiree();
    const err = new Error(json.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json;
}

const get = (chemin, params) => {
  const entrees = params
    ? Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    : [];
  const qs = entrees.length ? `?${new URLSearchParams(Object.fromEntries(entrees))}` : '';
  return apiFetch(`${chemin}${qs}`);
};

const post = (chemin, body, options) =>
  apiFetch(chemin, { method: 'POST', body: JSON.stringify(body ?? {}), ...options });

const patch = (chemin, body) =>
  apiFetch(chemin, { method: 'PATCH', body: JSON.stringify(body ?? {}) });

// ──────────────────────────────────────────────────────────────────
// Authentification
// ──────────────────────────────────────────────────────────────────
export const AuthAPI = {
  inscription: (payload) => post('/auth/register', payload, { sansAuth: true }),
  connexion: (payload) => post('/auth/login', payload, { sansAuth: true }),
  monProfil: () => get('/auth/me'),
  deconnexion: (refreshToken) => post('/auth/logout', { refreshToken }),
  changerMotDePasse: (payload) => post('/auth/changer-mot-de-passe', payload),
  motDePasseOublie: (email) => post('/auth/mot-de-passe-oublie', { email }, { sansAuth: true }),
  reinitialiserMotDePasse: (payload) => post('/auth/reinitialiser-mot-de-passe', payload, { sansAuth: true }),
};

// ──────────────────────────────────────────────────────────────────
// Espace Opérateur Économique (service 3009 via /oe)
// ──────────────────────────────────────────────────────────────────
export const OperateurAPI = {
  // Dédouanement
  creerDedouanement: (payload) => post('/oe/dedouanement', payload),
  mesDedouanements: (filtres) => get('/oe/dedouanement', filtres),
  detailDedouanement: (id) => get(`/oe/dedouanement/${id}`),
  ajouterDocumentDedouanement: (id, doc) => post(`/oe/dedouanement/${id}/documents`, doc),

  // Stockage
  entrepotsDisponibles: () => get('/oe/stockage/entrepots-disponibles'),
  creerDemandeStockage: (payload) => post('/oe/stockage', payload),
  mesDemandesStockage: (filtres) => get('/oe/stockage', filtres),
  detailDemandeStockage: (id) => get(`/oe/stockage/${id}`),

  // Véhicules
  catalogueVehicules: (search) => get('/oe/vehicules', { search }),
  ficheVehicule: (id) => get(`/oe/vehicules/${id}`),
  reserverVehicule: (id) => patch(`/oe/vehicules/${id}/reserver`),
  acheterVehicule: (id, payload) => post(`/oe/vehicules/${id}/acheter`, payload),
  mesAchatsVehicules: () => get('/oe/vehicules/mes-achats'),
  suiviAchatVehicule: (id) => get(`/oe/vehicules/achats/${id}/suivi`),

  // Suivi centralisé
  suiviGlobal: () => get('/oe/suivi'),
};

// ──────────────────────────────────────────────────────────────────
// Tarification transport (service 3002)
// ──────────────────────────────────────────────────────────────────
export const TarificationAPI = {
  bareme: () => get('/tarification/bareme'),
  calculer: (payload) => post('/tarification/calculer', payload),
  comparerPaliers: (payload) => post('/tarification/comparer', payload),
  coutRevient: (payload) => post('/tarification/cout-revient', payload),
  emissionsCO2: (payload) => post('/tarification/co2', payload),
};

// ──────────────────────────────────────────────────────────────────
// Dossiers de dédouanement (service 3007) — espace CDA
// ──────────────────────────────────────────────────────────────────
export const DossierAPI = {
  lister: (filtres) => get('/dossiers', filtres),
  detail: (id) => get(`/dossiers/${id}`),
  creer: (payload) => post('/dossiers', payload),
  prendreEnCharge: (id) => patch(`/dossiers/${id}/prendre-en-charge`),
  rejeter: (id, motif) => patch(`/dossiers/${id}/rejeter`, { motif }),
  demanderDocuments: (id, payload) => post(`/dossiers/${id}/demander-documents`, payload),
  majTraitement: (id, payload) => patch(`/dossiers/${id}/traitement`, payload),
  cloturer: (id) => post(`/dossiers/${id}/cloturer`),
  historique: (id) => get(`/dossiers/${id}/historique`),
};

// ──────────────────────────────────────────────────────────────────
// Compte Logistique Numérique (service 3006)
// ──────────────────────────────────────────────────────────────────
export const CompteAPI = {
  solde: () => get('/compte/solde'),
  historique: (filtres) => get('/compte/historique', filtres),
  releve: (filtres) => get('/compte/releve', filtres),
  depensesParDossier: (dossierId) => get(`/compte/dossiers/${dossierId}/depenses`),

  // Instructions de paiement : Demande -> Transmise -> En traitement -> Exécutée
  instructions: () => get('/compte/instructions'),
  creerInstruction: (payload) => post('/compte/instructions', payload),
  transmettreInstruction: (id) => patch(`/compte/instructions/${id}/transmettre`),
  traiterInstruction: (id) => patch(`/compte/instructions/${id}/traiter`),
  validerInstruction: (id) => patch(`/compte/instructions/${id}/valider`),
  refuserInstruction: (id, motif) => patch(`/compte/instructions/${id}/refuser`, { motif }),

  // Réservation de fonds (escrow interne)
  reservations: () => get('/compte/reservations'),
  creerReservation: (payload) => post('/compte/reservations', payload),
  libererReservation: (id) => patch(`/compte/reservations/${id}/liberer`),
  consommerReservation: (id) => patch(`/compte/reservations/${id}/consommer`),

  // Crédits internes, paiement de services et compensation
  crediter: (payload) => post('/compte/credits', payload),
  payerService: (payload) => post('/compte/services/payer', payload),
  compenser: (payload) => post('/compte/compensation', payload),
};


// ──────────────────────────────────────────────────────────────────
// Facturation CDA (service 3005)
// ──────────────────────────────────────────────────────────────────
export const FactureAPI = {
  lister: (filtres) => get('/factures', filtres),
  detail: (id) => get(`/factures/${id}`),
  creer: (payload) => post('/factures', payload),
  ajouterLigne: (id, ligne) => post(`/factures/${id}/lignes`, ligne),
  supprimerLigne: (id, ligneId) => apiFetch(`/factures/${id}/lignes/${ligneId}`, { method: 'DELETE' }),
  emettre: (id) => post(`/factures/${id}/emettre`),
  marquerPayee: (id) => post(`/factures/${id}/payer`),
  simulerHonoraire: (params) => get('/factures/simuler-honoraire', params),
};


// ──────────────────────────────────────────────────────────────────
// Entrepôt (service 3008, exposé sous /entrepot par la gateway)
// ──────────────────────────────────────────────────────────────────
export const EntrepotAPI = {
  // Cockpit
  cockpit: (warehouseId) => get('/entrepot/cockpit', { warehouseId }),
  demandesEnAttente: () => get('/entrepot/cockpit/demandes-en-attente'),

  // Entrepôts
  entrepots: () => get('/entrepot/warehouses'),

  // Demandes de stockage
  demandes: (filtres) => get('/entrepot/stockage', filtres),
  demande: (id) => get(`/entrepot/stockage/${id}`),
  accepter: (id) => patch(`/entrepot/stockage/${id}/accepter`),
  refuser: (id, motif) => patch(`/entrepot/stockage/${id}/refuser`, { motif }),
  demanderInfos: (id, commentaire) => post(`/entrepot/stockage/${id}/demander-infos`, { commentaire }),
  historique: (id) => get(`/entrepot/stockage/${id}/historique`),

  // Emplacements
  emplacementsDisponibles: (params) => get('/entrepot/stockage/emplacements/disponibles', params),
  occupationParZone: (warehouseId) => get(`/entrepot/stockage/emplacements/occupation/${warehouseId}`),
  affecter: (id, payload) => post(`/entrepot/stockage/${id}/affecter`, payload),

  // Stock et sorties
  stockActuel: (search) => get('/entrepot/stockage/stock-actuel', { search }),
  autoriserSortie: (id, payload) => post(`/entrepot/stockage/${id}/autoriser-sortie`, payload),

  // Facturation du stockage
  facturer: (id, tarifParTonneJour) => post(`/entrepot/stockage/${id}/facturer`, { tarifParTonneJour }),
  factures: (id) => get(`/entrepot/stockage/${id}/factures`),

  // Incidents et alertes
  alertes: (warehouseId) => get('/entrepot/incidents/alertes', { warehouseId }),
  incidents: (filtres) => get('/entrepot/incidents', filtres),
  declarerIncident: (payload) => post('/entrepot/incidents', payload),
  resoudreIncident: (id) => patch(`/entrepot/incidents/${id}/resoudre`),
};


// ──────────────────────────────────────────────────────────────────
// Consignataire (service 3010 via /consignataire)
// ──────────────────────────────────────────────────────────────────
export const ConsignataireAPI = {
  // Arrivages — annonce des navires
  navires: (params) => get('/consignataire/vessels', params),
  navire: (id) => get(`/consignataire/vessels/${id}`),
  creerNavire: (payload) => post('/consignataire/vessels', payload),
  modifierNavire: (id, payload) => patch(`/consignataire/vessels/${id}`, payload),
  statutNavire: (id, statut) => patch(`/consignataire/vessels/${id}/status`, { status: statut }),

  // Déchargement — compteurs
  statsDechargement: () => get('/consignataire/stats/dechargement'),

  // Connaissements
  listerBl: () => get('/consignataire/bl'),

  // e-BAD
  listerBad: () => get('/consignataire/do'),
  badParBl: (blId) => get(`/consignataire/do/bl/${blId}`),
  emettreBad: (blId, payload) => post(`/consignataire/do/emit/${blId}`, payload),
  modifierBad: (id, payload) => patch(`/consignataire/do/${id}`, payload),
  annulerBad: (id, payload) => post(`/consignataire/do/${id}/cancel`, payload),
  historiqueBad: (id) => get(`/consignataire/do/${id}/history`),

  // Facturation consignataire
  listerFactures: () => get('/consignataire/invoice'),
  creerFactureManuelle: (blId, payload) => post(`/consignataire/invoice/manual/${blId}`, payload),
  emettreFacture: (id) => post(`/consignataire/invoice/${id}/issue`),
  payerFacture: (id) => post(`/consignataire/invoice/${id}/pay`),

  // Gestion documentaire
  documentsParBl: (blId) => get(`/consignataire/documents/bl/${blId}`),
  deposerDocument: (blId, payload) => post(`/consignataire/documents/${blId}`, payload),
  signerDocument: (id, signedBy) => post(`/consignataire/documents/${id}/sign`, { signed_by: signedBy }),

  // Booking Export
  listerBookings: () => get('/consignataire/bookings'),
  creerBooking: (payload) => post('/consignataire/bookings', payload),
  validerBooking: (id) => post(`/consignataire/bookings/${id}/validate`),
  refuserBooking: (id, reason) => post(`/consignataire/bookings/${id}/refuse`, { reason }),
};


// ──────────────────────────────────────────────────────────────────
// Administration des comptes (auth-service, réservé ADMIN)
// ──────────────────────────────────────────────────────────────────
export const UtilisateursAPI = {
  lister: (filtres) => get('/utilisateurs', filtres),
  detail: (id) => get(`/utilisateurs/${id}`),
  changerStatut: (id, statut) => patch(`/utilisateurs/${id}/statut`, { statut }),
  changerRole: (id, role) => patch(`/utilisateurs/${id}/role`, { role }),
  journal: (filtres) => get('/utilisateurs/journal', filtres),
};


// ──────────────────────────────────────────────────────────────────
// Téléversement de fichiers (multipart)
// ──────────────────────────────────────────────────────────────────
// `apiFetch` impose Content-Type: application/json, ce qui casserait un envoi
// multipart : le navigateur doit poser lui-même l'en-tête avec sa frontière.
// D'où cette fonction distincte, qui reprend la même logique de session.
export async function apiUpload(chemin, formData) {
  const executer = async (token) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${chemin}`, { method: 'POST', body: formData, headers });
  };

  const session = lireSession();
  let res = await executer(session?.accessToken);

  if (res.status === 401 && session?.refreshToken) {
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) res = await executer(nouveauToken);
  }

  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    const err = new Error(json.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }

  return json;
}

export const FichierAPI = {
  // Le champ du formulaire doit s'appeler « fichier » : c'est ce qu'attend
  // upload.single('fichier') côté serveur.
  televerser: (dossierId, type, fichier, commentaire) => {
    const formData = new FormData();
    formData.append('fichier', fichier);
    formData.append('dossierId', dossierId);
    formData.append('type', type);
    if (commentaire) formData.append('commentaire', commentaire);
    return apiUpload('/documents/upload', formData);
  },

  nouvelleVersion: (documentId, fichier) => {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return apiUpload(`/documents/${documentId}/version`, formData);
  },

  // Le téléchargement exige le token : on passe par un blob plutôt qu'un
  // lien direct, que le navigateur ouvrirait sans en-tête d'authentification.
  telecharger: async (documentId, nomFichier) => {
    const session = lireSession();
    const res = await fetch(`${API_BASE}/documents/${documentId}/fichier`, {
      headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const err = new Error(json.message || 'Téléchargement impossible.');
      err.status = res.status;
      throw err;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier || 'document';
    lien.click();
    URL.revokeObjectURL(url);
  },

  infos: (documentId) => apiFetch(`/documents/${documentId}/infos`),
};

// ──────────────────────────────────────────────────────────────────
// Notifications (service 3004)
// ──────────────────────────────────────────────────────────────────
export const NotificationAPI = {
  lister: (filtres) => get('/notifications', filtres),
  marquerLue: (id) => patch(`/notifications/${id}/lire`),
  toutMarquerLu: () => patch('/notifications/tout-lire'),
};

// ──────────────────────────────────────────────────────────────────
// État de santé des services (diagnostic)
// ──────────────────────────────────────────────────────────────────
export const SanteAPI = {
  services: () => apiFetch('/health/services', { sansAuth: true }),
};
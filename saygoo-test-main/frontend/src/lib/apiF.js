// front-F/src/lib/apiF.js
// Client API unifié — tente d'abord le back-end Express, puis retombe sur le calcul local.

export const API_BASE = '/api/v1';

/**
 * Helper – appel fetch JSON générique avec gestion d'erreur.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Ajouter le token JWT s'il existe
  const session = (() => {
    try {
      const raw = localStorage.getItem('saygoo.auth.session.v1');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.message || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

// ──────────────────────────────────────────────────────────────────
// Helper definition to structure an RFC 7807 problem detail response.
// ──────────────────────────────────────────────────────────────────
export function buildApiError(status, type, title, detail, extensions = {}) {
  return { status, type, title, detail, ...extensions };
}

export function buildApiResponse(data, meta = null) {
  return {
    data,
    meta: meta || {
      total: Array.isArray(data) ? data.length : 1,
      page: 1,
      size: Array.isArray(data) ? data.length : 1,
    },
  };
}

// ──────────────────────────────────────────────────────────────────
// Calcul local de transport (fallback si le back-end est indisponible)
// ──────────────────────────────────────────────────────────────────
function localCalculateTransport(payload) {
  const {
    distance_km,
    fuel_price,
    consumption_l_per_km,
    weight_tons,
    axle_capacity_tons,
    cost_per_km,
    cargo_value,
    risk_level,
    conditions,
    carbon_price_per_kg,
  } = payload;

  let timeFactor = 1;
  if (conditions?.night) timeFactor += 0.10;
  if (conditions?.rain) timeFactor += 0.15;
  if (conditions?.heat) timeFactor += 0.05;

  const fuelCost = distance_km * consumption_l_per_km * fuel_price;
  const baseTransport = distance_km * cost_per_km * timeFactor;
  const weightCost = weight_tons * 3000;
  const axleCost = (weight_tons / (axle_capacity_tons || 1)) * 10000;
  const riskRates = { low: 0.005, medium: 0.01, high: 0.02 };
  const insuranceCost = cargo_value * (riskRates[risk_level || 'low']);
  const carbonCost = distance_km * 0.8 * carbon_price_per_kg;
  const totalCost = baseTransport + fuelCost + weightCost + axleCost + insuranceCost + carbonCost;
  const finalPrice = totalCost * 1.15;

  return {
    distance_km,
    cost_breakdown: {
      base_transport: baseTransport,
      fuel_cost: fuelCost,
      weight_cost: weightCost,
      axle_cost: axleCost,
      insurance_cost: insuranceCost,
      carbon_cost: carbonCost,
    },
    time_factor: timeFactor,
    total_cost: totalCost,
    recommended_price_with_margin: finalPrice,
  };
}

// ──────────────────────────────────────────────────────────────────
// Mock data for accounts (fallback)
// ──────────────────────────────────────────────────────────────────
let DATABASE = {
  comptes: [
    { id: '1234', montant: 50000, statut: 'IRREVOCABLE', currency: 'XOF' },
    { id: '5678', montant: 752000, statut: 'INITIE', currency: 'XOF' },
  ],
  demandes_dedouanement: [],
  transferts: [],
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ──────────────────────────────────────────────────────────────────
// Business API Client — Real API with local fallback
// ──────────────────────────────────────────────────────────────────
export const BusinessAPI = {
  /**
   * Calculate Transport Cost
   * Tries POST /api/v1/transport/simuler on the back-end, falls back to local.
   */
  async calculateTransport(payload) {
    try {
      // Map the front-end payload keys to back-end expected keys
      const backendPayload = {
        distanceKm: payload.distance_km,
        poidsTonnes: payload.weight_tons,
        valeurMarchandise: payload.cargo_value,
        niveauRisque: payload.risk_level === 'low' ? 'faible' : payload.risk_level === 'high' ? 'eleve' : 'moyen',
        capaciteEssieu: payload.axle_capacity_tons,
        prixCarboneKg: payload.carbon_price_per_kg,
        conditions: {
          nuit: payload.conditions?.night || false,
          pluie: payload.conditions?.rain || false,
          chaleur: payload.conditions?.heat || false,
        },
      };

      const json = await apiFetch('/transport/simuler', {
        method: 'POST',
        body: JSON.stringify(backendPayload),
      });

      // Map back-end response to the format the front-end expects
      const d = json.data;
      return buildApiResponse({
        distance_km: d.trajet?.distanceKm || payload.distance_km,
        cost_breakdown: {
          base_transport: d.detail?.coutTransportBase || 0,
          fuel_cost: d.detail?.coutCarburant || 0,
          weight_cost: d.detail?.coutPoids || 0,
          axle_cost: d.detail?.coutEssieu || 0,
          insurance_cost: d.detail?.coutAssurance || 0,
          carbon_cost: d.detail?.coutCarbone || 0,
        },
        time_factor: d.conditions?.facteurTemps || 1,
        total_cost: d.totaux?.coutTotal || 0,
        recommended_price_with_margin: d.totaux?.prixRecommande || 0,
      });
    } catch (err) {
      console.warn('[apiF] Backend transport indisponible, fallback local :', err.message);
      return buildApiResponse(localCalculateTransport(payload));
    }
  },

  /**
   * Lists available accounts — local mock (no back-end endpoint yet)
   */
  async getComptes(params = { page: 1, size: 20 }) {
    await delay(400);
    const start = (params.page - 1) * params.size;
    const paginated = DATABASE.comptes.slice(start, start + params.size);

    return buildApiResponse(paginated, {
      total: DATABASE.comptes.length,
      page: params.page,
      size: params.size,
    });
  },

  /**
   * Creates a new 'Demande de dédouanement'
   */
  async createDemandeDedouanement(payload) {
    await delay(800);

    if (!payload.type_operation || !payload.valeur_fob) {
      throw buildApiError(
        400,
        'format-invalide',
        'Bad Request',
        'Payload is missing required fields.',
        { invalid_params: ['type_operation', 'valeur_fob'] }
      );
    }

    const newDemande = {
      id: `DEDOU-2026-${Math.floor(Math.random() * 10000)}`,
      status: 'EN_ATTENTE',
      createdAt: new Date().toISOString(),
      ...payload,
    };

    DATABASE.demandes_dedouanement.push(newDemande);
    return buildApiResponse(newDemande);
  },

  /**
   * Creates a new 'Transfert MAD / Entrepôt'
   */
  async createTransfertStock(payload) {
    await delay(700);
    const newTransfert = {
      id: `TRSF-2026-${Math.floor(Math.random() * 10000)}`,
      status: 'EN_COURS',
      createdAt: new Date().toISOString(),
      ...payload,
    };
    DATABASE.transferts.push(newTransfert);
    return buildApiResponse(newTransfert);
  }
};

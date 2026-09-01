import { lazy } from 'react';

const CdaBoard = lazy(() => import('../components/dashboard/CdaBoard'));
const ConsignateurBoard = lazy(() => import('../components/dashboard/ConsignateurBoard'));
const TransporteurBoard = lazy(() => import('../components/dashboard/TransporteurBoard'));
const ProfileOperateur = lazy(() => import('../components/dashboard/ProfileOperateur'));

export const ROLE_SCREENS = {
  ROLE_CDA: {
    component: CdaBoard,
    subtitle: 'Centre de Dédouanement et Agréage',
    focusModes: ['Dédouanement', 'Contrôle', 'Portefeuille'],
    heroMetrics: [
      { label: 'Dossiers en attente', value: '12', detail: '+3 depuis hier' },
      { label: 'Dédouanés ce jour', value: '45', detail: 'Objectif: 50' },
      { label: 'Valeur totale', value: '1.2M', detail: 'XOF' }
    ],
    stats: [
      { label: 'Temps moyen', value: '2.5h', detail: '-15min' },
      { label: 'Anomalies', value: '2', detail: 'Alerte' }
    ]
  },
  ROLE_CONSIGNATEUR: {
    component: ConsignateurBoard,
    subtitle: 'Gestion Consignataire',
    focusModes: ['Arrivages', 'Livraisons', 'Portefeuille'],
    heroMetrics: [
      { label: 'Navires en approche', value: '4', detail: 'Dans les 48h' },
      { label: 'Conteneurs au port', value: '120', detail: '80% capacité' },
      { label: 'Frais de surestarie', value: '0', detail: 'Optimal' }
    ],
    stats: [
      { label: 'Temps de rotation', value: '4j', detail: 'Stable' },
      { label: 'Retards', value: '1', detail: 'Mineur' }
    ]
  },
  ROLE_TRANSPORTEUR: {
    component: TransporteurBoard,
    subtitle: 'Logistique et Transport',
    focusModes: ['Flotte', 'Missions', 'Portefeuille'],
    heroMetrics: [
      { label: 'Camions disponibles', value: '8/15', detail: '5 en route' },
      { label: 'Missions du jour', value: '12', detail: '8 terminées' },
      { label: 'Carburant consommé', value: '450L', detail: '-5% vs hier' }
    ],
    stats: [
      { label: 'Taux de service', value: '98%', detail: 'Excellent' },
      { label: 'Incidents', value: '0', detail: 'RAS' }
    ]
  },
  ROLE_CLIENT: {
    component: ProfileOperateur,
    subtitle: 'Opérateur Économique',
    focusModes: ['Opérations', 'Marchandises', 'Portefeuille'],
    heroMetrics: [
      { label: 'Commandes actives', value: '5', detail: '2 en transit' },
      { label: 'Stock disponible', value: '85%', detail: 'Entrepôt A' },
      { label: 'Dépenses du mois', value: '450K', detail: 'XOF' }
    ],
    stats: [
      { label: 'Livraisons reçues', value: '12', detail: 'Ce mois' },
      { label: 'Litiges', value: '0', detail: 'RAS' }
    ]
  },
  ROLE_ENTREPOSEUR: {
    component: ProfileOperateur, // Fallback en attendant un composant spécifique Entreposeur
    subtitle: 'Gestion d\'Entrepôt',
    focusModes: ['Stockage', 'Mouvements', 'Portefeuille'],
    heroMetrics: [
      { label: 'Taux d\'occupation', value: '75%', detail: 'Optimal' },
      { label: 'Entrées du jour', value: '25', detail: 'Palettes' },
      { label: 'Sorties du jour', value: '18', detail: 'Palettes' }
    ],
    stats: [
      { label: 'Alertes de stock', value: '2', detail: 'Niveau bas' },
      { label: 'Anomalies', value: '0', detail: 'RAS' }
    ]
  }
};

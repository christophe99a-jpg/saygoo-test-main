import { lazy } from 'react';

const CdaBoard = lazy(() => import('../components/dashboard/CdaBoard'));
const DossiersCDA = lazy(() => import('../components/dashboard/DossiersCDA'));
const FacturationCDA = lazy(() => import('../components/dashboard/FacturationCDA'));
const AdministrationComptes = lazy(() => import('../components/dashboard/AdministrationComptes'));
const CockpitEntrepot = lazy(() => import('../components/dashboard/CockpitEntrepot'));
const CockpitConsignataire = lazy(() => import('../components/dashboard/CockpitConsignataire'));
const ConsignateurBoard = lazy(() => import('../components/dashboard/ConsignateurBoard'));
const TransporteurBoard = lazy(() => import('../components/dashboard/TransporteurBoard'));
const ProfileOperateur = lazy(() => import('../components/dashboard/ProfileOperateur'));

export const ROLE_SCREENS = {
  ROLE_CDA: {
    component: DossiersCDA,
    // Chaque focus peut pointer vers un composant dédié ; à défaut, `component` est utilisé.
    composantsParFocus: {
      Dossiers: DossiersCDA,
      Facturation: FacturationCDA,
      Administration: AdministrationComptes,
      'Vue d\u2019ensemble': CdaBoard,
    },
    subtitle: 'Centre de Dédouanement et Agréage',
    focusModes: ['Dossiers', 'Facturation', 'Administration', 'Vue d\u2019ensemble', 'Portefeuille'],
    // NOTE : ces indicateurs sont encore des valeurs de maquette. Les chiffres
    // réels sont ceux affichés dans l'onglet « Dossiers », alimenté par l'API.
    heroMetrics: [
      { label: 'Dossiers en attente', value: '—', detail: 'Voir onglet Dossiers' },
      { label: 'Dédouanés ce jour', value: '—', detail: 'Voir onglet Dossiers' },
      { label: 'Valeur totale', value: '—', detail: 'XOF' }
    ],
    stats: [
      { label: 'Temps moyen', value: '—', detail: 'Non calculé' },
      { label: 'Anomalies', value: '—', detail: 'Non calculé' }
    ]
  },
  ROLE_CONSIGNATEUR: {
    component: CockpitConsignataire,
    composantsParFocus: {
      Cockpit: CockpitConsignataire,
      'Vue d\u2019ensemble': ConsignateurBoard,
    },
    subtitle: 'Gestion Consignataire',
    focusModes: ['Cockpit', 'Vue d\u2019ensemble', 'Portefeuille'],
    // NOTE : indicateurs de maquette. Les chiffres réels sont dans le cockpit,
    // alimenté par le service Consignataire.
    heroMetrics: [
      { label: 'Navires en approche', value: '—', detail: 'Voir cockpit' },
      { label: 'Conteneurs au port', value: '—', detail: 'Voir cockpit' },
      { label: 'Frais de surestarie', value: '—', detail: 'Voir cockpit' }
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
    component: CockpitEntrepot,
    composantsParFocus: {
      Cockpit: CockpitEntrepot,
    },
    subtitle: 'Gestion d\'Entrepôt',
    focusModes: ['Cockpit', 'Portefeuille'],
    // NOTE : indicateurs de maquette. Les chiffres réels sont dans le cockpit,
    // alimenté par le service Entrepôt.
    heroMetrics: [
      { label: 'Taux d\'occupation', value: '—', detail: 'Voir cockpit' },
      { label: 'Entrées du jour', value: '—', detail: 'Voir cockpit' },
      { label: 'Sorties du jour', value: '—', detail: 'Voir cockpit' }
    ],
    stats: [
      { label: 'Alertes de stock', value: '—', detail: 'Voir cockpit' },
      { label: 'Anomalies', value: '—', detail: 'Voir cockpit' }
    ]
  }
};
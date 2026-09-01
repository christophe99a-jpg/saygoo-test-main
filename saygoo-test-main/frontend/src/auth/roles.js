export const ROLE_DEFINITIONS = [
  {
    key: 'ROLE_CDA',
    slug: 'cda',
    shortLabel: 'CDA / Transitaire',
    title: 'Commissaire en Douane Agréé / Transitaire',
    description: 'Superviser les declarations, la conformite et les agréments douaniers.',
    accent: 'from-[#2A1A10] via-[#5D371A] to-[#F36F21]',
    highlight: 'border-[#F36F21]/30 bg-[#F36F21]/10',
    fieldLabel: "Numero d'agrement",
    fieldPlaceholder: 'Ex: CDA-2026-004',
    dashboardTitle: 'Cockpit Douane',
    dashboardSummary: 'Votre espace CDA pilotera les declarations, les controles et les workflows de validation.',
  },
  {
    key: 'ROLE_CLIENT',
    slug: 'client',
    shortLabel: 'Opérateur Économique / Client',
    title: 'Opérateur Économique / Client Chargeur',
    description: 'Suivre les dossiers, creer des demandes et piloter les operations logistiques.',
    accent: 'from-[#F36F21] via-[#F3921F] to-[#FFD8B5]',
    highlight: 'border-[#F36F21]/30 bg-[#FFF1E8]',
    fieldLabel: 'Raison sociale',
    fieldPlaceholder: 'Ex: Logistique SARL',
    dashboardTitle: 'Espace Opérateur Économique',
    dashboardSummary: 'Votre interface suit les dossiers, les cargaisons et les demandes.',
  },
  {
    key: 'ROLE_CONSIGNATEUR',
    slug: 'consignateur',
    shortLabel: 'Consignateur',
    title: 'Consignateur',
    description: 'Coordonner les escales, manifestes et operations portuaires.',
    accent: 'from-[#10243A] via-[#184B6A] to-[#3C9AB7]',
    highlight: 'border-[#3C9AB7]/30 bg-[#E8F7FB]',
    fieldLabel: "Reference d'agence",
    fieldPlaceholder: 'Ex: CSG-LOME-08',
    dashboardTitle: 'Hub Consignateur',
    dashboardSummary: 'Votre futur hub consignateur centralisera navires, escales et manifestes.',
  },
  {
    key: 'ROLE_TRANSPORTEUR',
    slug: 'transporteur',
    shortLabel: 'Transporteur',
    title: 'Transporteur',
    description: 'Planifier la flotte, les missions et la disponibilite des equipages.',
    accent: 'from-[#13231A] via-[#1D5A3A] to-[#4CC38A]',
    highlight: 'border-[#4CC38A]/30 bg-[#EAFBF2]',
    fieldLabel: 'Code flotte',
    fieldPlaceholder: 'Ex: TRS-ROUTE-12',
    dashboardTitle: 'Centre Transport',
    dashboardSummary: 'Votre futur centre transport suivra les missions, vehicules et capacites.',
  },
  {
    key: 'ROLE_ENTREPOSEUR',
    slug: 'entrepot',
    shortLabel: 'Entrepot',
    title: 'Gestionnaire d\'Entrepot / MAD',
    description: 'Gérer les stocks, les MAD (Marchandises à Destination) et les entrées/sorties.',
    accent: 'from-[#1B1B1B] via-[#4A4A4A] to-[#8E8E8E]',
    highlight: 'border-white/10 bg-white/5',
    fieldLabel: 'Nom du MAD',
    fieldPlaceholder: 'Ex: MAD Terminal A',
    dashboardTitle: 'Console Entrepot',
    dashboardSummary: 'Votre console entrepot pilotera les stocks, les transferts et la visibilité e-Livraison.',
  },
];

export const ROLE_DEFINITIONS_BY_KEY = Object.fromEntries(
  ROLE_DEFINITIONS.map((role) => [role.key, role])
);

export function getRoleDefinition(roleKey) {
  return ROLE_DEFINITIONS_BY_KEY[roleKey] ?? ROLE_DEFINITIONS_BY_KEY.ROLE_CLIENT;
}

export function getDashboardPath(roleKey) {
  const role = getRoleDefinition(roleKey);
  return `/dashboard/${role.slug}`;
}


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StockageService {
  constructor(private prisma: PrismaService) {}

  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ST-${year}-`;
    const count = await this.prisma.demandeStockageEntrepot.count({
      where: { reference: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  private logHistorique(demandeId: string, action: string, userId?: string, description?: string) {
    return this.prisma.historiqueStockageEntrepot.create({
      data: { demandeId, action, userId, description },
    });
  }

  // ── 1. RÉCEPTION D'UNE DEMANDE DE STOCKAGE (transférée par le CDA) ────────────
    async create(data: {
    dossierRef?: string;
    clientId?: string;
    clientNom: string;
    contactTelephone?: string;
    typeStockage: string;
    marchandise: string;
    quantite?: number;
    uniteQuantite?: string;
    dureeEstimeeJours?: number;
    warehouseId?: string;
  }) {
    const reference = await this.generateReference();

    const demande = await this.prisma.demandeStockageEntrepot.create({
      data: { ...data, reference, statut: 'NOUVEAU' },
    });

    await this.logHistorique(demande.id, 'Demande reçue');

    return demande;
  }

  // ── LISTE / RECHERCHE (Demandes en attente + toutes) ───────────────────────────
  async findAll(search?: string, statut?: string, clientId?: string) {
    return this.prisma.demandeStockageEntrepot.findMany({
      where: {
        ...(statut && { statut }),
        ...(clientId && { clientId }),
        ...(search && {
          OR: [
            { reference: { contains: search, mode: 'insensitive' } },
            { clientNom: { contains: search, mode: 'insensitive' } },
            { marchandise: { contains: search, mode: 'insensitive' } },
            { dossierRef: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { emplacement: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── 4. GESTION DU STOCK : marchandises actuellement stockées ────────────────────
  async getStockActuel(search?: string) {
    return this.prisma.demandeStockageEntrepot.findMany({
      where: {
        statut: 'STOCKE',
        ...(search && {
          OR: [
            { reference: { contains: search, mode: 'insensitive' } },
            { clientNom: { contains: search, mode: 'insensitive' } },
            { marchandise: { contains: search, mode: 'insensitive' } },
            { dossierRef: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { emplacement: true },
      orderBy: { dateEntreeReelle: 'desc' },
    });
  }

  async findOne(id: string) {
    const demande = await this.prisma.demandeStockageEntrepot.findUnique({
      where: { id },
      include: { emplacement: true, historique: { orderBy: { createdAt: 'asc' } } },
    });
    if (!demande) throw new NotFoundException('Demande de stockage non trouvée');
    return demande;
  }

  // ── ACCEPTER / REFUSER / DEMANDER DES INFOS ─────────────────────────────────────
  async accepter(id: string, userId?: string) {
    const demande = await this.findOne(id);
    if (demande.statut !== 'NOUVEAU') {
      throw new BadRequestException('Seule une demande Nouvelle peut être acceptée.');
    }

    const updated = await this.prisma.demandeStockageEntrepot.update({
      where: { id },
      data: { statut: 'ACCEPTE' },
    });
    await this.logHistorique(id, 'Demande acceptée', userId);
    return updated;
  }

  async refuser(id: string, motif: string, userId?: string) {
    if (!motif) throw new BadRequestException('Le motif de refus est obligatoire.');

    const demande = await this.findOne(id);
    if (demande.statut !== 'NOUVEAU') {
      throw new BadRequestException('Seule une demande Nouvelle peut être refusée.');
    }

    const updated = await this.prisma.demandeStockageEntrepot.update({
      where: { id },
      data: { statut: 'REFUSE', motifRefus: motif },
    });
    await this.logHistorique(id, 'Demande refusée', userId, motif);
    return updated;
  }

  async demanderInfos(id: string, commentaire: string, userId?: string) {
    if (!commentaire) throw new BadRequestException('Le commentaire est obligatoire.');
    await this.findOne(id);
    await this.logHistorique(id, 'Informations complémentaires demandées', userId, commentaire);
    return { success: true, message: 'Demande d\'informations envoyée au client.' };
  }

  // ── 2. AFFECTATION D'EMPLACEMENT ────────────────────────────────────────────────

  // Emplacements disponibles (pour le sélecteur Zone -> Allée -> Slot)
  async getEmplacementsDisponibles(warehouseId?: string, zone?: string) {
    return this.prisma.emplacement.findMany({
      where: {
        occupe: false,
        ...(warehouseId && { warehouseId }),
        ...(zone && { zone }),
      },
      orderBy: [{ zone: 'asc' }, { allee: 'asc' }, { slot: 'asc' }],
    });
  }

  // Occupation par zone (pour le cockpit : "Zone A - Occupation 70%")
  async getOccupationParZone(warehouseId: string) {
    const emplacements = await this.prisma.emplacement.findMany({ where: { warehouseId } });

    const parZone: Record<string, { total: number; occupes: number }> = {};
    for (const e of emplacements) {
      if (!parZone[e.zone]) parZone[e.zone] = { total: 0, occupes: 0 };
      parZone[e.zone].total += 1;
      if (e.occupe) parZone[e.zone].occupes += 1;
    }

    return Object.entries(parZone).map(([zone, { total, occupes }]) => ({
      zone,
      total,
      occupes,
      tauxOccupation: total > 0 ? Math.round((occupes / total) * 100) : 0,
    }));
  }

  async affecterEmplacement(
    id: string,
    data: { emplacementId: string; dateEntreeReelle?: string; dureeEstimeeJours?: number },
    userId?: string,
  ) {
    const demande = await this.findOne(id);
    if (demande.statut !== 'ACCEPTE') {
      throw new BadRequestException('Seule une demande Acceptée peut recevoir un emplacement.');
    }

    const emplacement = await this.prisma.emplacement.findUnique({ where: { id: data.emplacementId } });
    if (!emplacement) throw new NotFoundException('Emplacement non trouvé.');
    if (emplacement.occupe) throw new BadRequestException('Cet emplacement est déjà occupé.');

    const entree = data.dateEntreeReelle ? new Date(data.dateEntreeReelle) : new Date();
    const duree = data.dureeEstimeeJours ?? demande.dureeEstimeeJours ?? undefined;
    const dateSortiePrevue = duree ? new Date(entree.getTime() + duree * 24 * 60 * 60 * 1000) : null;

    const [updated] = await this.prisma.$transaction([
      this.prisma.demandeStockageEntrepot.update({
        where: { id },
        data: {
          statut: 'STOCKE',
          warehouseId: emplacement.warehouseId,
          emplacementId: emplacement.id,
          dateEntreeReelle: entree,
          dureeEstimeeJours: duree,
          dateSortiePrevue,
        },
      }),
      this.prisma.emplacement.update({ where: { id: emplacement.id }, data: { occupe: true } }),
    ]);

    await this.logHistorique(
      id,
      'Emplacement affecté',
      userId,
      `${emplacement.zone} / Allée ${emplacement.allee} / ${emplacement.slot}`,
    );

    return updated;
  }

  async getHistorique(id: string) {
    await this.findOne(id);
    return this.prisma.historiqueStockageEntrepot.findMany({
      where: { demandeId: id },
      orderBy: { createdAt: 'asc' },
    });
  }


    // ── 5. SORTIE MARCHANDISE ────────────────────────────────────────────────────────
  async autoriserSortie(
    id: string,
    data: {
      modeTransport: 'CAMION_INTERNE_SAYGOO' | 'TRANSPORTEUR_EXTERNE';
      dateSortie: string;
      badConfirme: boolean;
      autorisationDouaneConfirmee: boolean;
      factureStockageConfirmee: boolean;
    },
    userId?: string,
  ) {
    const demande = await this.findOne(id);

    if (demande.statut !== 'STOCKE') {
      throw new BadRequestException('Seule une marchandise Stockée peut faire l\'objet d\'une sortie.');
    }
    if (!data.modeTransport || !data.dateSortie) {
      throw new BadRequestException('Le mode de transport et la date de sortie sont obligatoires.');
    }

    const documentsManquants: string[] = [];
    if (!data.badConfirme) documentsManquants.push('Bon à délivrer');
    if (!data.autorisationDouaneConfirmee) documentsManquants.push('Autorisation douane');
    if (!data.factureStockageConfirmee) documentsManquants.push('Facture stockage');

    if (documentsManquants.length > 0) {
      throw new BadRequestException(
        `Impossible d'autoriser la sortie : documents manquants (${documentsManquants.join(', ')}).`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.demandeStockageEntrepot.update({
        where: { id },
        data: {
          statut: 'LIBERE',
          modeTransportSortie: data.modeTransport,
          dateSortieReelle: new Date(data.dateSortie),
        },
      }),
      ...(demande.emplacementId
        ? [this.prisma.emplacement.update({ where: { id: demande.emplacementId }, data: { occupe: false } })]
        : []),
    ]);

    await this.logHistorique(
      id,
      'Sortie autorisée',
      userId,
      `Transport : ${data.modeTransport} — Emplacement libéré`,
    );

    return updated;
  }

    // ── 8. FACTURATION STOCKAGE ──────────────────────────────────────────────────────
  private async generateFactureReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `FACST-${year}-`;
    const count = await this.prisma.factureStockage.count({ where: { reference: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  async genererFacture(id: string, tarifParTonneJour: number | undefined, userId?: string) {
    const demande = await this.findOne(id);

    if (!demande.quantite) {
      throw new BadRequestException('La quantité (tonnage) de la demande est requise pour facturer.');
    }
    if (!demande.dateEntreeReelle) {
      throw new BadRequestException('La marchandise doit être entrée en stock avant facturation.');
    }

    const dateFin = demande.dateSortieReelle || new Date();
    const dureeJours = Math.max(
      1,
      Math.ceil((dateFin.getTime() - demande.dateEntreeReelle.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const tarif = tarifParTonneJour ?? 3500;
    const montant = tarif * demande.quantite * dureeJours;

    const reference = await this.generateFactureReference();

    const facture = await this.prisma.factureStockage.create({
      data: {
        demandeId: id,
        reference,
        tarifParTonneJour: tarif,
        quantite: demande.quantite,
        dureeJours,
        montant,
      },
    });

    await this.logHistorique(id, 'Facture de stockage générée', userId, `${reference} — ${montant.toLocaleString('fr-FR')} FCFA`);

    return facture;
  }

  async listerFactures(id: string) {
    await this.findOne(id);
    return this.prisma.factureStockage.findMany({ where: { demandeId: id }, orderBy: { createdAt: 'desc' } });
  }

  async marquerFacturePayee(factureId: string) {
    const facture = await this.prisma.factureStockage.findUnique({ where: { id: factureId } });
    if (!facture) throw new NotFoundException('Facture non trouvée.');
    if (facture.statut === 'PAYEE') {
      throw new BadRequestException('Cette facture est déjà payée.');
    }

    return this.prisma.factureStockage.update({ where: { id: factureId }, data: { statut: 'PAYEE' } });
  }
}

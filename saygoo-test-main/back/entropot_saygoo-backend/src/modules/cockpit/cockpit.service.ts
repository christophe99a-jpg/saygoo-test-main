import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CockpitService {
  constructor(private prisma: PrismaService) {}

  async getTableauDeBord(warehouseId?: string) {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const finJour = new Date();
    finJour.setHours(23, 59, 59, 999);

    const filtreEntrepot = warehouseId ? { warehouseId } : {};

    // 📦 Stock en cours (Vrac + Conteneurs actuellement stockés)
    const stocke = await this.prisma.demandeStockageEntrepot.findMany({
      where: { statut: 'STOCKE', ...filtreEntrepot },
    });
    const vracTonnes = stocke
      .filter((d) => d.typeStockage === 'VRAC')
      .reduce((sum, d) => sum + (d.quantite || 0), 0);
    const conteneursUnites = stocke
      .filter((d) => d.typeStockage === 'CONTENEUR')
      .reduce((sum, d) => sum + (d.quantite || 1), 0);

    // Occupation globale des emplacements
    const emplacements = await this.prisma.emplacement.findMany({ where: filtreEntrepot });
    const totalEmplacements = emplacements.length;
    const occupes = emplacements.filter((e) => e.occupe).length;
    const occupation = totalEmplacements > 0 ? Math.round((occupes / totalEmplacements) * 100) : 0;

    // 🚚 Entrées du jour
    const entreesAujourdhui = await this.prisma.demandeStockageEntrepot.count({
      where: { dateEntreeReelle: { gte: debutJour, lte: finJour }, ...filtreEntrepot },
    });

    // 📤 Sorties du jour
    const sortiesAujourdhui = await this.prisma.demandeStockageEntrepot.count({
      where: { dateSortieReelle: { gte: debutJour, lte: finJour }, ...filtreEntrepot },
    });

    // ⚠ Incidents en cours
    const incidentsEnCours = await this.prisma.incident.count({
      where: { statut: 'EN_COURS', ...(warehouseId && { warehouseId }) },
    });

    return {
      stockEnCours: { vracTonnes, conteneursUnites, occupation },
      entreesAujourdhui,
      sortiesAujourdhui,
      incidents: incidentsEnCours,
    };
  }

  // Onglet "Demandes en attente" du cockpit (raccourci pratique)
  async getDemandesEnAttente() {
    return this.prisma.demandeStockageEntrepot.findMany({
      where: { statut: 'NOUVEAU' },
      orderBy: { createdAt: 'asc' },
    });
  }
}
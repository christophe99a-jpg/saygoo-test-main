import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const TYPES_VALIDES = ['SECURITE', 'MATERIEL', 'LOGISTIQUE', 'DOUANE'];

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  private async generateReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INC-${year}-`;
    const count = await this.prisma.incident.count({ where: { reference: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(6, '0')}`;
  }

  // ── 7. DÉCLARATION RAPIDE D'UN INCIDENT ─────────────────────────────────────────
  async declarer(data: {
    type: string;
    description: string;
    zone?: string;
    latitude?: number;
    longitude?: number;
    photoUrl?: string;
    warehouseId?: string;
    declarePar?: string;
  }) {
    if (!TYPES_VALIDES.includes(data.type)) {
      throw new BadRequestException(`Type d'incident invalide. Valeurs possibles : ${TYPES_VALIDES.join(', ')}`);
    }
    if (!data.description) {
      throw new BadRequestException('La description est obligatoire.');
    }

    const reference = await this.generateReference();

    // Gravité déduite du type (par défaut) — ajustable manuellement ensuite
    const gravite = data.type === 'SECURITE' || data.type === 'DOUANE' ? 'ROUGE' : 'ORANGE';

    return this.prisma.incident.create({
      data: { ...data, reference, gravite, statut: 'EN_COURS' },
    });
  }

  // ── 6. LISTE DES INCIDENTS (table Réf/Type/Zone/Statut) ─────────────────────────
  async findAll(statut?: string, type?: string, zone?: string) {
    return this.prisma.incident.findMany({
      where: {
        ...(statut && { statut }),
        ...(type && { type }),
        ...(zone && { zone }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident non trouvé.');
    return incident;
  }

  async resoudre(id: string) {
    const incident = await this.findOne(id);
    if (incident.statut === 'RESOLU') {
      throw new BadRequestException('Cet incident est déjà résolu.');
    }

    return this.prisma.incident.update({
      where: { id },
      data: { statut: 'RESOLU', resoluAt: new Date() },
    });
  }

  async ajusterGravite(id: string, gravite: 'ROUGE' | 'ORANGE' | 'JAUNE') {
    await this.findOne(id);
    return this.prisma.incident.update({ where: { id }, data: { gravite } });
  }

  // ── ALERTES AUTOMATIQUES (calculées, pas stockées) ──────────────────────────────
  // Ex: "Stock proche saturation zone B", "Retard entrée conteneur"
  async getAlertesAutomatiques(warehouseId?: string) {
    const alertes: { gravite: string; message: string }[] = [];

    // Saturation de zone (>= 80% d'occupation)
    const emplacements = await this.prisma.emplacement.findMany({
      where: warehouseId ? { warehouseId } : undefined,
    });
    const parZone: Record<string, { total: number; occupes: number }> = {};
    for (const e of emplacements) {
      if (!parZone[e.zone]) parZone[e.zone] = { total: 0, occupes: 0 };
      parZone[e.zone].total += 1;
      if (e.occupe) parZone[e.zone].occupes += 1;
    }
    for (const [zone, { total, occupes }] of Object.entries(parZone)) {
      const taux = total > 0 ? Math.round((occupes / total) * 100) : 0;
      if (taux >= 80) {
        alertes.push({ gravite: taux >= 95 ? 'ROUGE' : 'JAUNE', message: `Stock proche saturation zone ${zone} (${taux}%)` });
      }
    }

    // Retard d'entrée (demande acceptée depuis plus de 2 jours mais toujours pas stockée)
    const seuilRetard = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const enRetard = await this.prisma.demandeStockageEntrepot.findMany({
      where: {
        statut: 'ACCEPTE',
        createdAt: { lt: seuilRetard },
        ...(warehouseId && { warehouseId }),
      },
    });
    for (const d of enRetard) {
      alertes.push({ gravite: 'ORANGE', message: `Retard entrée — ${d.reference} (${d.clientNom})` });
    }

    // Incidents non résolus de gravité rouge
    const incidentsCritiques = await this.prisma.incident.findMany({
      where: { statut: 'EN_COURS', gravite: 'ROUGE', ...(warehouseId && { warehouseId }) },
    });
    for (const i of incidentsCritiques) {
      alertes.push({ gravite: 'ROUGE', message: `Incident : ${i.description}` });
    }

    return alertes;
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WarehousesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    capacity_m2: number;
    capacity_pallet: number;
    temperature_type: string;
    security_level: number;
  }) {
    return this.prisma.warehouse.create({ data });
  }

  async findAll() {
    return this.prisma.warehouse.findMany();
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new NotFoundException('Entrepôt non trouvé');
    return warehouse;
  }

  async update(id: string, data: Partial<{
    name: string;
    type: string;
    status: string;
    capacity_m2: number;
    capacity_pallet: number;
    security_level: number;
  }>) {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.warehouse.delete({ where: { id } });
  }

    // Coordonnées du Port Autonome de Lomé (référence fixe pour la distance)
  private readonly PAL_LAT = 6.1176;
  private readonly PAL_LNG = 1.2769;

  async getAvailability(
    latitude?: number,
    longitude?: number,
    temperature_type?: string,
  ) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        status: { not: 'FULL' },
        ...(temperature_type && { temperature_type }),
      },
      include: { reservations: true },
    });

    return warehouses.map((w) => {
      const reserved = w.reservations
        .filter((r) => r.status === 'CONFIRMED' || r.status === 'BLOCKED')
        .reduce((sum, r) => sum + r.capacity_reserved, 0);

      const available = w.capacity_m2 - reserved;

      let score = 100;
      if (latitude && longitude) {
        const distance = Math.sqrt(
          Math.pow(w.latitude - latitude, 2) +
          Math.pow(w.longitude - longitude, 2),
        ) * 111;
        score = Math.round(distance + (100 - w.security_level * 10));
      }

      // Distance par rapport au Port Autonome de Lomé (affichage "📍 X km du Port")
      const distanceFromPortKm = Math.round(
        Math.sqrt(
          Math.pow(w.latitude - this.PAL_LAT, 2) +
          Math.pow(w.longitude - this.PAL_LNG, 2),
        ) * 111,
      );

      return {
        id: w.id,
        name: w.name,
        type: w.type,
        status: w.status,
        temperature_type: w.temperature_type,
        capacity_total: w.capacity_m2,
        capacity_available: available,
        capaciteEVP20: w.capaciteEVP20,
        tarifStockageParTonneJour: w.tarifStockageParTonneJour,
        distanceFromPortKm,
        security_level: w.security_level,
        latitude: w.latitude,
        longitude: w.longitude,
        score_optimisation: score,
      };
    });
  }
}
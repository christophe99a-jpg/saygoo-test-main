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

      return {
        id: w.id,
        name: w.name,
        type: w.type,
        status: w.status,
        temperature_type: w.temperature_type,
        capacity_total: w.capacity_m2,
        capacity_available: available,
        security_level: w.security_level,
        latitude: w.latitude,
        longitude: w.longitude,
        score_optimisation: score,
      };
    });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async addEntry(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
  }) {
    const existing = await this.prisma.inventory.findFirst({
      where: {
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
      },
    });

    if (existing) {
      return this.prisma.inventory.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + data.quantity,
          entries: existing.entries + data.quantity,
        },
      });
    }

    return this.prisma.inventory.create({
      data: {
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
        quantity: data.quantity,
        entries: data.quantity,
      },
    });
  }

  async addExit(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
  }) {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
      },
    });

    if (!inventory) throw new NotFoundException('Produit non trouvé dans cet entrepôt');
    if (inventory.quantity < data.quantity) {
      throw new NotFoundException(`Stock insuffisant. Disponible : ${inventory.quantity}`);
    }

    return this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: inventory.quantity - data.quantity,
        exits: inventory.exits + data.quantity,
      },
    });
  }

  async addLoss(data: {
    warehouse_id: string;
    product_id: string;
    quantity: number;
  }) {
    const inventory = await this.prisma.inventory.findFirst({
      where: {
        warehouse_id: data.warehouse_id,
        product_id: data.product_id,
      },
    });

    if (!inventory) throw new NotFoundException('Produit non trouvé');

    return this.prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantity: inventory.quantity - data.quantity,
        losses: inventory.losses + data.quantity,
      },
    });
  }

  async getByWarehouse(warehouse_id: string) {
    const items = await this.prisma.inventory.findMany({
      where: { warehouse_id },
      include: { warehouse: true },
    });

    return items.map((item) => {
      const rotation = item.exits > 0
        ? (item.exits / ((item.quantity + item.exits) / 2)).toFixed(2)
        : '0';

      const occupancyRate = item.warehouse
        ? ((item.quantity / item.warehouse.capacity_m2) * 100).toFixed(2)
        : '0';

      return {
        ...item,
        rotation_rate: rotation,
        occupancy_rate: `${occupancyRate}%`,
        is_dormant: item.exits === 0 && item.entries > 0,
      };
    });
  }

  async getStock(warehouse_id: string, product_id: string) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { warehouse_id, product_id },
    });

    if (!inventory) throw new NotFoundException('Produit non trouvé');

    const avgStock = (inventory.quantity + inventory.entries) / 2;
    const rotationRate = inventory.exits > 0 ? inventory.exits / avgStock : 0;
    const avgDuration = inventory.exits > 0
      ? (avgStock / inventory.exits) * 30
      : null;

    return {
      ...inventory,
      stock_actuel: inventory.quantity,
      taux_rotation: rotationRate.toFixed(2),
      duree_moyenne_stockage: avgDuration ? `${avgDuration.toFixed(0)} jours` : 'N/A',
      stock_dormant: inventory.exits === 0,
    };
  }

  async getAlerts(warehouse_id: string) {
    const items = await this.prisma.inventory.findMany({
      where: { warehouse_id },
    });

    const alerts: any[] = [];

    for (const item of items) {
      if (item.exits === 0 && item.entries > 0) {
        alerts.push({
          type: 'STOCK_DORMANT',
          product_id: item.product_id,
          message: `Le produit ${item.product_id} n'a aucune sortie enregistrée`,
          quantity: item.quantity,
        });
      }

      if (item.quantity < item.entries * 0.1) {
        alerts.push({
          type: 'STOCK_FAIBLE',
          product_id: item.product_id,
          message: `Stock faible pour ${item.product_id}`,
          quantity: item.quantity,
        });
      }

      if (item.losses > item.entries * 0.05) {
        alerts.push({
          type: 'PERTES_ELEVEES',
          product_id: item.product_id,
          message: `Pertes élevées pour ${item.product_id}`,
          losses: item.losses,
        });
      }
    }

    return {
      warehouse_id,
      total_alerts: alerts.length,
      alerts,
    };
  }
}
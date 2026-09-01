import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShipmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    order_id: string;
    carrier: string;
    tracking_number: string;
  }) {
    return this.prisma.shipment.create({
      data: {
        order_id: data.order_id,
        carrier: data.carrier,
        tracking_number: data.tracking_number,
        status: 'PREPARATION',
      },
      include: { order: true },
    });
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!shipment) throw new NotFoundException('Livraison non trouvée');
    return shipment;
  }

  async track(tracking_number: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { tracking_number },
      include: { order: true },
    });
    if (!shipment) throw new NotFoundException('Numéro de tracking invalide');
    return {
      tracking_number: shipment.tracking_number,
      carrier: shipment.carrier,
      status: shipment.status,
      order_id: shipment.order_id,
      statuts_possibles: ['PREPARATION', 'EXPEDIE', 'EN_TRANSIT', 'LIVRE'],
    };
  }

  async updateStatus(id: string, status: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Livraison non trouvée');
    return this.prisma.shipment.update({
      where: { id },
      data: { status },
    });
  }
}
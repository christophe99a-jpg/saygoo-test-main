import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    customer_id: string;
    items: { product_id: string; quantity: number }[];
    total_amount: number;
  }) {
    return this.prisma.order.create({
      data: {
        customer_id: data.customer_id,
        total_amount: data.total_amount,
        status: 'PENDING',
        items: {
          create: data.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, shipment: true },
    });
    if (!order) throw new NotFoundException('Commande non trouvée');
    return order;
  }

  async findByCustomer(customer_id: string) {
    return this.prisma.order.findMany({
      where: { customer_id },
      include: { items: true, shipment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Commande non trouvée');
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async process(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Commande non trouvée');

    // Workflow : PENDING → CONFIRMED → PICKING → PACKED → SHIPPED
    const workflow: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PICKING',
      PICKING: 'PACKED',
      PACKED: 'SHIPPED',
    };

    const nextStatus = workflow[order.status];
    if (!nextStatus) throw new NotFoundException(`Statut final atteint : ${order.status}`);

    return this.prisma.order.update({
      where: { id },
      data: { status: nextStatus },
      include: { items: true },
    });
  }
}
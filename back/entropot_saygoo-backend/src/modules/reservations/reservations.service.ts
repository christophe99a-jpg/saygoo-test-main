import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    warehouse_id: string;
    user_id: string;
    capacity_reserved: number;
    start_date: string;
    end_date: string;
    price_per_m2: number;
  }) {
    const { warehouse_id, user_id, capacity_reserved, start_date, end_date, price_per_m2 } = data;

    return this.prisma.$transaction(async (tx) => {
      const warehouse = await tx.warehouse.findUnique({
        where: { id: warehouse_id },
        include: { reservations: true },
      });

      if (!warehouse) throw new NotFoundException('Entrepôt non trouvé');
      if (warehouse.status === 'FULL') throw new BadRequestException('Entrepôt complet');

      const reserved = warehouse.reservations
        .filter((r) => r.status === 'CONFIRMED' || r.status === 'BLOCKED')
        .reduce((sum, r) => sum + r.capacity_reserved, 0);

      const available = warehouse.capacity_m2 - reserved;

      if (capacity_reserved > available) {
        throw new BadRequestException(`Capacité insuffisante. Disponible : ${available} m²`);
      }

      const start = new Date(start_date);
      const end = new Date(end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const total_price = capacity_reserved * price_per_m2 * days;

      const reservation = await tx.reservation.create({
        data: {
          warehouse_id,
          user_id,
          capacity_reserved,
          start_date: start,
          end_date: end,
          status: 'BLOCKED',
          total_price,
        },
      });

      const newReserved = reserved + capacity_reserved;
      const newStatus =
        newReserved >= warehouse.capacity_m2 ? 'FULL' :
        newReserved > warehouse.capacity_m2 * 0.7 ? 'PARTIAL' : 'AVAILABLE';

      await tx.warehouse.update({
        where: { id: warehouse_id },
        data: { status: newStatus },
      });

      return {
        reservation,
        message: 'Réservation bloquée. En attente de paiement.',
        expires_in: '15 minutes',
      };
    });
  }

  async confirm(id: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException('Réservation non trouvée');
    if (reservation.status !== 'BLOCKED') throw new BadRequestException('Réservation non confirmable');

    return this.prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async cancel(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new NotFoundException('Réservation non trouvée');
      if (reservation.status === 'CANCELLED') throw new BadRequestException('Déjà annulée');

      const now = new Date();
      const refund = now < new Date(reservation.start_date) ? 100 : 50;

      const warehouse = await tx.warehouse.findUnique({
        where: { id: reservation.warehouse_id },
        include: { reservations: true },
      });

      if (!warehouse) throw new NotFoundException('Entrepôt non trouvé');

      const reserved = warehouse.reservations
        .filter((r) => (r.status === 'CONFIRMED' || r.status === 'BLOCKED') && r.id !== id)
        .reduce((sum, r) => sum + r.capacity_reserved, 0);

      const newStatus =
        reserved >= warehouse.capacity_m2 ? 'FULL' :
        reserved > warehouse.capacity_m2 * 0.7 ? 'PARTIAL' : 'AVAILABLE';

      await tx.warehouse.update({
        where: { id: reservation.warehouse_id },
        data: { status: newStatus },
      });

      await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      return {
        message: 'Réservation annulée',
        refund_percentage: refund,
        refund_amount: (Number(reservation.total_price) * refund) / 100,
      };
    });
  }

  async update(id: string, data: {
    capacity_reserved?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException('Réservation non trouvée');

    return this.prisma.reservation.update({
      where: { id },
      data: {
        ...(data.capacity_reserved && { capacity_reserved: data.capacity_reserved }),
        ...(data.start_date && { start_date: new Date(data.start_date) }),
        ...(data.end_date && { end_date: new Date(data.end_date) }),
      },
    });
  }

  async findByUser(user_id: string) {
    return this.prisma.reservation.findMany({
      where: { user_id },
      include: { warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: { warehouse: true },
    });
    if (!reservation) throw new NotFoundException('Réservation non trouvée');
    return reservation;
  }
}
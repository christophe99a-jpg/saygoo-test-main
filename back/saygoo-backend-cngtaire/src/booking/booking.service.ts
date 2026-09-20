import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus, ContainerType } from './booking.entity';

export interface BookingInput {
  client_reference?: string;
  booking_reference?: string;
  shipping_company?: string;
  port_of_departure?: string;
  port_of_destination?: string;
  loading_date?: Date;
  cargo_nature?: string;
  cargo_weight?: number;
  cargo_volume?: number;
  dangerous_goods?: boolean;
  container_type?: ContainerType;
  container_quantity?: number;
  company_name?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  observations?: string;
}

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  // Réception d'une demande client ou création interne par le consignataire.
  async create(data: BookingInput): Promise<Booking> {
    return this.bookingRepository.save(
      this.bookingRepository.create({
        ...data,
        booking_reference: data.booking_reference || this.generateBookingReference(),
        status: BookingStatus.PENDING,
      }),
    );
  }

  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking non trouvé');
    return booking;
  }

  async validate(id: string): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seul un booking En attente peut être validé');
    }
    await this.bookingRepository.update(id, { status: BookingStatus.VALIDATED });
    return this.findOne(id);
  }

  async refuse(id: string, reason: string): Promise<Booking> {
    if (!reason) {
      throw new BadRequestException('Le motif de refus est obligatoire');
    }

    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seul un booking En attente peut être refusé');
    }

    await this.bookingRepository.update(id, {
      status: BookingStatus.REFUSED,
      refusal_reason: reason,
    });
    return this.findOne(id);
  }

  private generateBookingReference(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `SAYGOO-BK-${year}-${random}`;
  }
}

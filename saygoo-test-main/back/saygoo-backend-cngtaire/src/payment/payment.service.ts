import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private invoiceService: InvoiceService,
  ) {}

  async pay(invoice_id: string, phone_number: string, payment_method: string): Promise<Payment> {
    const invoice = await this.invoiceService.findOne(invoice_id);

    // Simulation paiement MVP
    const success = true; // En production : appel API Mobile Money

    const payment = this.paymentRepository.create({
      invoice_id: invoice.id,
      amount: invoice.amount,
      phone_number,
      payment_method,
      status: success ? PaymentStatus.PAID : PaymentStatus.FAILED,
    });

    const saved = await this.paymentRepository.save(payment);

    // Si paiement OK → marquer facture comme payée
    if (success) {
      await this.invoiceService.markAsPaid(invoice_id);
    }

    return saved;
  }

  async getStatus(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoice'],
    });
    if (!payment) throw new NotFoundException('Paiement non trouvé');
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepository.find({ relations: ['invoice'] });
  }
}
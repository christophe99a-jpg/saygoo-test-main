import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { BlService } from '../bl/bl.service';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private blService: BlService,
  ) {}

  async generate(bl_id: string): Promise<Invoice> {
    const bl = await this.blService.findOne(bl_id);

    // Calcul simple des surestaries
    const BASE_AMOUNT = 150000; // en FCFA
    const DAILY_RATE = 25000;   // par jour
    const demurrage_days = 3;   // MVP: valeur fixe
    const demurrage_amount = demurrage_days * DAILY_RATE;
    const amount = BASE_AMOUNT + demurrage_amount;

    const invoice = this.invoiceRepository.create({
      bl_id: bl.id,
      amount,
      demurrage_days,
      demurrage_amount,
      status: InvoiceStatus.PENDING,
    });

    return this.invoiceRepository.save(invoice);
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({ relations: ['bl'] });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['bl'],
    });
    if (!invoice) throw new NotFoundException('Facture non trouvée');
    return invoice;
  }

  async findByBl(bl_id: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({ where: { bl_id }, relations: ['bl'] });
  }

  async markAsPaid(id: string): Promise<Invoice> {
    await this.invoiceRepository.update(id, { status: InvoiceStatus.PAID });
    return this.findOne(id);
  }
}
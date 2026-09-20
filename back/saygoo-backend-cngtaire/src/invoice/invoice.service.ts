import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus, ServiceNature } from './invoice.entity';
import { BlService } from '../bl/bl.service';

export interface ManualInvoiceInput {
  client_name: string;
  amount: number;
  service_nature?: ServiceNature[];
  observations?: string;
  consignee_invoice_reference?: string;
  file_path?: string;
}

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private blService: BlService,
  ) {}

  async generate(bl_id: string): Promise<Invoice> {
    const bl = await this.blService.findOne(bl_id);

    const BASE_AMOUNT = 150000;
    const DAILY_RATE = 25000;
    const demurrage_days = 3;
    const demurrage_amount = demurrage_days * DAILY_RATE;

    return this.invoiceRepository.save(
      this.invoiceRepository.create({
        bl_id: bl.id,
        amount: BASE_AMOUNT + demurrage_amount,
        demurrage_days,
        demurrage_amount,
        status: InvoiceStatus.PENDING,
      }),
    );
  }

  // Création manuelle par le consignataire : la facture démarre en Brouillon.
  async createManualInvoice(bl_id: string, data: ManualInvoiceInput): Promise<Invoice> {
    const bl = await this.blService.findOne(bl_id);

    if (!data.client_name) {
      throw new BadRequestException('Le client est obligatoire');
    }
    if (data.amount == null || data.amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }

    return this.invoiceRepository.save(
      this.invoiceRepository.create({
        bl_id: bl.id,
        amount: data.amount,
        client_name: data.client_name,
        service_nature: data.service_nature,
        observations: data.observations,
        consignee_invoice_reference: data.consignee_invoice_reference,
        file_path: data.file_path,
        status: InvoiceStatus.DRAFT,
      }),
    );
  }

  async updateDraft(id: string, data: Partial<ManualInvoiceInput>): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Seule une facture en Brouillon peut être modifiée');
    }
    await this.invoiceRepository.update(id, data);
    return this.findOne(id);
  }

  // Brouillon -> Émise
  async issue(id: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Seule une facture en Brouillon peut être émise');
    }
    await this.invoiceRepository.update(id, { status: InvoiceStatus.PENDING });
    return this.findOne(id);
  }

  // Émise -> Payée
  async markAsPaid(id: string): Promise<Invoice> {
    const invoice = await this.findOne(id);
    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Seule une facture Émise peut être marquée comme Payée');
    }
    await this.invoiceRepository.update(id, { status: InvoiceStatus.PAID });
    return this.findOne(id);
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({ relations: ['bl'] });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({ where: { id }, relations: ['bl'] });
    if (!invoice) throw new NotFoundException('Facture non trouvée');
    return invoice;
  }

  async findByBl(bl_id: string): Promise<Invoice[]> {
    return this.invoiceRepository.find({ where: { bl_id }, relations: ['bl'] });
  }
}

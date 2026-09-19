import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryOrder, DOStatus } from './delivery-order.entity';
import { DeliveryOrderHistory } from './delivery-order-history.entity';
import { BlService } from '../bl/bl.service';
import { BLStatus } from '../bl/bl.entity';

// Champs modifiables après émission du BAD
export interface BadEditableFields {
  consignee?: string;
  validity_date?: Date;
  deadline_date?: Date;
  consignee_reference?: string;
  observations?: string;
}

@Injectable()
export class DeliveryOrderService {
  constructor(
    @InjectRepository(DeliveryOrder)
    private doRepository: Repository<DeliveryOrder>,
    @InjectRepository(DeliveryOrderHistory)
    private historyRepository: Repository<DeliveryOrderHistory>,
    private blService: BlService,
  ) {}

  async generate(bl_id: string): Promise<DeliveryOrder> {
    const bl = await this.blService.findOne(bl_id);
    return this.doRepository.save(
      this.doRepository.create({ bl_id: bl.id, status: DOStatus.PENDING }),
    );
  }

  async validate(id: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.findOne(id);
    await this.doRepository.update(id, {
      status: DOStatus.VALIDATED,
      validated_at: new Date(),
    });
    await this.blService.updateStatus(deliveryOrder.bl_id, BLStatus.RELEASED);
    return this.findOne(id);
  }

  // Émission : le BAD devient ACTIF et reçoit un numéro unique SAYGOO.
  async emitBad(
    bl_id: string,
    data: {
      importer?: string;
      container_number?: string;
      consignee?: string;
      validity_date?: Date;
      deadline_date?: Date;
      consignee_reference?: string;
      observations?: string;
      issued_by: string;
    },
  ): Promise<DeliveryOrder> {
    const bl = await this.blService.findOne(bl_id);

    return this.doRepository.save(
      this.doRepository.create({
        bl_id: bl.id,
        status: DOStatus.VALIDATED,
        validated_at: new Date(),
        bad_number: this.generateBadNumber(),
        ...data,
      }),
    );
  }

  // Seuls certains champs restent modifiables, et chaque changement est tracé.
  async update(id: string, data: BadEditableFields, changed_by: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.findOne(id);

    if (deliveryOrder.status === DOStatus.CANCELLED) {
      throw new BadRequestException('Ce BAD est annulé, il ne peut plus être modifié');
    }

    const editableFields: (keyof BadEditableFields)[] = [
      'consignee',
      'validity_date',
      'deadline_date',
      'consignee_reference',
      'observations',
    ];

    for (const field of editableFields) {
      if (data[field] === undefined) continue;

      const oldValue = deliveryOrder[field];
      const newValue = data[field];
      if (String(oldValue ?? '') === String(newValue ?? '')) continue;

      await this.historyRepository.save(
        this.historyRepository.create({
          delivery_order_id: id,
          field_name: field,
          old_value: oldValue != null ? String(oldValue) : null,
          new_value: newValue != null ? String(newValue) : null,
          changed_by,
        }),
      );
    }

    await this.doRepository.update(id, data as Partial<DeliveryOrder>);
    return this.findOne(id);
  }

  // Annulation : motif obligatoire.
  async cancel(id: string, reason: string, changed_by: string): Promise<DeliveryOrder> {
    if (!reason) {
      throw new BadRequestException("Le motif d'annulation est obligatoire");
    }

    const deliveryOrder = await this.findOne(id);
    if (deliveryOrder.status === DOStatus.CANCELLED) {
      throw new BadRequestException('Ce BAD est déjà annulé');
    }

    await this.doRepository.update(id, {
      status: DOStatus.CANCELLED,
      cancel_reason: reason,
      cancelled_at: new Date(),
    });

    await this.historyRepository.save(
      this.historyRepository.create({
        delivery_order_id: id,
        field_name: 'status',
        old_value: deliveryOrder.status,
        new_value: DOStatus.CANCELLED,
        changed_by,
      }),
    );

    return this.findOne(id);
  }

  async getHistory(id: string): Promise<DeliveryOrderHistory[]> {
    await this.findOne(id);
    return this.historyRepository.find({
      where: { delivery_order_id: id },
      order: { changed_at: 'DESC' },
    });
  }

  private generateBadNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `SAYGOO-BAD-${year}-${random}`;
  }

  async findOne(id: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.doRepository.findOne({ where: { id }, relations: ['bl'] });
    if (!deliveryOrder) throw new NotFoundException('Delivery Order non trouvé');
    return deliveryOrder;
  }

  async findByBl(bl_id: string): Promise<DeliveryOrder[]> {
    return this.doRepository.find({ where: { bl_id }, relations: ['bl'] });
  }

  async findAll(): Promise<DeliveryOrder[]> {
    return this.doRepository.find({ relations: ['bl'] });
  }
}

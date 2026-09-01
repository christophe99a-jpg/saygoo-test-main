import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryOrder, DOStatus } from './delivery-order.entity';
import { BlService } from '../bl/bl.service';
import { BLStatus } from '../bl/bl.entity';

@Injectable()
export class DeliveryOrderService {
  constructor(
    @InjectRepository(DeliveryOrder)
    private doRepository: Repository<DeliveryOrder>,
    private blService: BlService,
  ) {}

  async generate(bl_id: string): Promise<DeliveryOrder> {
    const bl = await this.blService.findOne(bl_id);

    const deliveryOrder = this.doRepository.create({
      bl_id: bl.id,
      status: DOStatus.PENDING,
    });

    return this.doRepository.save(deliveryOrder);
  }

  async validate(id: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.findOne(id);

    await this.doRepository.update(id, {
      status: DOStatus.VALIDATED,
      validated_at: new Date(),
    });

    // Mettre à jour le statut du BL
    await this.blService.updateStatus(deliveryOrder.bl_id, BLStatus.RELEASED);

    return this.findOne(id);
  }

  async findOne(id: string): Promise<DeliveryOrder> {
    const deliveryOrder = await this.doRepository.findOne({
      where: { id },
      relations: ['bl'],
    });
    if (!deliveryOrder) throw new NotFoundException('Delivery Order non trouvé');
    return deliveryOrder;
  }

  async findByBl(bl_id: string): Promise<DeliveryOrder[]> {
    return this.doRepository.find({
      where: { bl_id },
      relations: ['bl'],
    });
  }

  async findAll(): Promise<DeliveryOrder[]> {
    return this.doRepository.find({ relations: ['bl'] });
  }
}
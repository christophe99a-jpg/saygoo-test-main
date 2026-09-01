import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tracking, TrackingStatus } from './tracking.entity';
import { BlService } from '../bl/bl.service';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(Tracking)
    private trackingRepository: Repository<Tracking>,
    private blService: BlService,
  ) {}

  async create(bl_id: string): Promise<Tracking> {
    const bl = await this.blService.findOne(bl_id);
    const tracking = this.trackingRepository.create({
      bl_id: bl.id,
      status: TrackingStatus.AT_PORT,
    });
    return this.trackingRepository.save(tracking);
  }

  async updateStatus(
    bl_id: string,
    status: TrackingStatus,
    location?: string,
    notes?: string,
  ): Promise<Tracking> {
    let tracking = await this.trackingRepository.findOne({ where: { bl_id } });

    if (!tracking) {
      tracking = await this.create(bl_id);
    }

    await this.trackingRepository.update(tracking.id, {
      status,
      location,
      notes,
    });

    return this.findByBl(bl_id);
  }

  async findByBl(bl_id: string): Promise<Tracking> {
    const tracking = await this.trackingRepository.findOne({
      where: { bl_id },
      relations: ['bl'],
    });
    if (!tracking) throw new NotFoundException('Tracking non trouvé');
    return tracking;
  }

  async findAll(): Promise<Tracking[]> {
    return this.trackingRepository.find({ relations: ['bl'] });
  }
}
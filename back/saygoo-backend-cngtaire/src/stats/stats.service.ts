import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vessel } from '../vessel/vessel.entity';
import { BL } from '../bl/bl.entity';
import { DeliveryOrder, DOStatus } from '../delivery-order/delivery-order.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Vessel) private vesselRepository: Repository<Vessel>,
    @InjectRepository(BL) private blRepository: Repository<BL>,
    @InjectRepository(DeliveryOrder) private doRepository: Repository<DeliveryOrder>,
  ) {}

  // Compteurs de l'onglet DECHARGEMENT : conteneurs annoncés et traités
  // (issus des manifestes navires), nombre de BL, e-BAD validés.
  async getDechargementStats() {
    const vessels = await this.vesselRepository.find();

    const containersAnnounced = vessels.reduce((s, v) => s + (v.containers_announced || 0), 0);
    const containersProcessed = vessels.reduce((s, v) => s + (v.containers_processed || 0), 0);

    const [blCount, badValidatedCount] = await Promise.all([
      this.blRepository.count(),
      this.doRepository.count({ where: { status: DOStatus.VALIDATED } }),
    ]);

    return { containersAnnounced, containersProcessed, blCount, badValidatedCount };
  }
}

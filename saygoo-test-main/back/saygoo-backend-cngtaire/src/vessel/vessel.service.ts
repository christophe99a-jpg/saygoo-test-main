import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Vessel, VesselStatus } from './vessel.entity';

@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
  ) {}

  async create(data: Partial<Vessel>): Promise<Vessel> {
    return this.vesselRepository.save(this.vesselRepository.create(data));
  }

  // Onglet ARRIVAGES : navires annoncés, filtrables par mois sur l'ETA.
  async findAll(month?: number, year?: number): Promise<Vessel[]> {
    if (month && year) {
      return this.vesselRepository.find({
        where: { eta: Between(new Date(year, month - 1, 1), new Date(year, month, 1)) },
        order: { eta: 'ASC' },
      });
    }
    return this.vesselRepository.find({ order: { eta: 'ASC' } });
  }

  async findOne(id: string): Promise<Vessel> {
    const vessel = await this.vesselRepository.findOne({ where: { id } });
    if (!vessel) throw new NotFoundException('Navire non trouvé');
    return vessel;
  }

  async update(id: string, data: Partial<Vessel>): Promise<Vessel> {
    await this.vesselRepository.update(id, data);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: VesselStatus): Promise<Vessel> {
    await this.vesselRepository.update(id, { status });
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.vesselRepository.delete(id);
  }
}

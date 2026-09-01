import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BL, BLStatus } from './bl.entity';

@Injectable()
export class BlService {
  constructor(
    @InjectRepository(BL)
    private blRepository: Repository<BL>,
  ) {}

  async create(data: Partial<BL>): Promise<BL> {
    const bl = this.blRepository.create(data);
    return this.blRepository.save(bl);
  }

  async findAll(): Promise<BL[]> {
    return this.blRepository.find();
  }

  async findOne(id: string): Promise<BL> {
    const bl = await this.blRepository.findOne({ where: { id } });
    if (!bl) throw new NotFoundException('BL non trouvé');
    return bl;
  }

  async update(id: string, data: Partial<BL>): Promise<BL> {
    await this.blRepository.update(id, data);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: BLStatus): Promise<BL> {
    await this.blRepository.update(id, { status });
    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    await this.blRepository.delete(id);
  }
}
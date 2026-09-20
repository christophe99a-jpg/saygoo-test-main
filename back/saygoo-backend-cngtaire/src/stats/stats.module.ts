import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from '../vessel/vessel.entity';
import { BL } from '../bl/bl.entity';
import { DeliveryOrder } from '../delivery-order/delivery-order.entity';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vessel, BL, DeliveryOrder])],
  providers: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryOrder } from './delivery-order.entity';
import { DeliveryOrderService } from './delivery-order.service';
import { DeliveryOrderController } from './delivery-order.controller';
import { BlModule } from '../bl/bl.module';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryOrder]), BlModule],
  providers: [DeliveryOrderService],
  controllers: [DeliveryOrderController],
  exports: [DeliveryOrderService],
})
export class DeliveryOrderModule {}
import { Controller, Get, Post, Param } from '@nestjs/common';
import { DeliveryOrderService } from './delivery-order.service';

@Controller('do')
export class DeliveryOrderController {
  constructor(private deliveryOrderService: DeliveryOrderService) {}

  @Post('generate/:bl_id')
  generate(@Param('bl_id') bl_id: string) {
    return this.deliveryOrderService.generate(bl_id);
  }

  @Post('validate/:id')
  validate(@Param('id') id: string) {
    return this.deliveryOrderService.validate(id);
  }

  @Get()
  findAll() {
    return this.deliveryOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryOrderService.findOne(id);
  }

  @Get('bl/:bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.deliveryOrderService.findByBl(bl_id);
  }
}
import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
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

  // Émettre un BAD
  @Post('emit/:bl_id')
  emitBad(
    @Param('bl_id') bl_id: string,
    @Body() body: {
      importer?: string;
      container_number?: string;
      consignee?: string;
      validity_date?: Date;
      deadline_date?: Date;
      consignee_reference?: string;
      observations?: string;
      issued_by: string;
    },
  ) {
    return this.deliveryOrderService.emitBad(bl_id, body);
  }

  // Mise à jour avec historique automatique
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: {
      consignee?: string;
      validity_date?: Date;
      deadline_date?: Date;
      consignee_reference?: string;
      observations?: string;
      changed_by: string;
    },
  ) {
    const { changed_by, ...data } = body;
    return this.deliveryOrderService.update(id, data, changed_by);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: { reason: string; changed_by: string }) {
    return this.deliveryOrderService.cancel(id, body.reason, body.changed_by);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.deliveryOrderService.getHistory(id);
  }

  @Get()
  findAll() {
    return this.deliveryOrderService.findAll();
  }

  @Get('bl/:bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.deliveryOrderService.findByBl(bl_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryOrderService.findOne(id);
  }
}

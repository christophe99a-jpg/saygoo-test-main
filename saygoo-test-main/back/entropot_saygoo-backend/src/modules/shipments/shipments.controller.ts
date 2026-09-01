import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  create(@Body() body: any) {
    return this.shipmentsService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Get('track/:tracking_number')
  track(@Param('tracking_number') tracking_number: string) {
    return this.shipmentsService.track(tracking_number);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.shipmentsService.updateStatus(id, body.status);
  }
}
import { Controller, Get, Post, Param } from '@nestjs/common';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Post('generate/:bl_id')
  generate(@Param('bl_id') bl_id: string) {
    return this.invoiceService.generate(bl_id);
  }

  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Get('bl/:bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.invoiceService.findByBl(bl_id);
  }
}
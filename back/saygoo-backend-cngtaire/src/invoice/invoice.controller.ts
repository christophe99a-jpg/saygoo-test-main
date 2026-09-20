import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { ServiceNature } from './invoice.entity';

@Controller('invoice')
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Post('generate/:bl_id')
  generate(@Param('bl_id') bl_id: string) {
    return this.invoiceService.generate(bl_id);
  }

  @Post('manual/:bl_id')
  createManualInvoice(
    @Param('bl_id') bl_id: string,
    @Body() body: {
      client_name: string;
      amount: number;
      service_nature?: ServiceNature[];
      observations?: string;
      consignee_invoice_reference?: string;
      file_path?: string;
    },
  ) {
    return this.invoiceService.createManualInvoice(bl_id, body);
  }

  @Post(':id/issue')
  issue(@Param('id') id: string) {
    return this.invoiceService.issue(id);
  }

  @Post(':id/pay')
  markAsPaid(@Param('id') id: string) {
    return this.invoiceService.markAsPaid(id);
  }

  @Get()
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get('bl/:bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.invoiceService.findByBl(bl_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  updateDraft(
    @Param('id') id: string,
    @Body() body: Partial<{
      client_name: string;
      amount: number;
      service_nature: ServiceNature[];
      observations: string;
      consignee_invoice_reference: string;
      file_path: string;
    }>,
  ) {
    return this.invoiceService.updateDraft(id, body);
  }
}

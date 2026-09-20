import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('pay')
  pay(@Body() body: {
    invoice_id: string;
    phone_number: string;
    payment_method: string;
  }) {
    return this.paymentService.pay(body.invoice_id, body.phone_number, body.payment_method);
  }

  @Get('status/:id')
  getStatus(@Param('id') id: string) {
    return this.paymentService.getStatus(id);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }
}
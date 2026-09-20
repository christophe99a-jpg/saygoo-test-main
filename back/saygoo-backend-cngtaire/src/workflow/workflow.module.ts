import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { InvoiceModule } from '../invoice/invoice.module';
import { DeliveryOrderModule } from '../delivery-order/delivery-order.module';

@Module({
  imports: [InvoiceModule, DeliveryOrderModule],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
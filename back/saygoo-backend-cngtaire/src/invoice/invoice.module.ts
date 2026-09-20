import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { BlModule } from '../bl/bl.module';
import { BL } from '../bl/bl.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, BL]), BlModule],
  providers: [InvoiceService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
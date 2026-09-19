import { Module } from '@nestjs/common';
import { StockageController } from './stockage.controller';
import { StockageService } from './stockage.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [StockageController],
  providers: [StockageService, PrismaService],
  exports: [StockageService],
})
export class StockageModule {}
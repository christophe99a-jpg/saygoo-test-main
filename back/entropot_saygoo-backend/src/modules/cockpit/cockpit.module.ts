import { Module } from '@nestjs/common';
import { CockpitController } from './cockpit.controller';
import { CockpitService } from './cockpit.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [CockpitController],
  providers: [CockpitService, PrismaService],
})
export class CockpitModule {}
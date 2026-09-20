import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tracking } from './tracking.entity';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { BlModule } from '../bl/bl.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tracking]), BlModule],
  providers: [TrackingService],
  controllers: [TrackingController],
  exports: [TrackingService],
})
export class TrackingModule {}
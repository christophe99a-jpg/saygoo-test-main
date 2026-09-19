import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vessel } from './vessel.entity';
import { VesselService } from './vessel.service';
import { VesselController } from './vessel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vessel])],
  providers: [VesselService],
  controllers: [VesselController],
  exports: [VesselService],
})
export class VesselModule {}

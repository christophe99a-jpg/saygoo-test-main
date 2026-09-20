import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BL } from './bl.entity';
import { BlService } from './bl.service';
import { BlController } from './bl.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BL])],
  providers: [BlService],
  controllers: [BlController],
  exports: [BlService],
})
export class BlModule {}
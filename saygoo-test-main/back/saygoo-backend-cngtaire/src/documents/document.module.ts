import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './document.entity';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { BlModule } from '../bl/bl.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity]), BlModule],
  providers: [DocumentService],
  controllers: [DocumentController],
  exports: [DocumentService],
})
export class DocumentModule {}

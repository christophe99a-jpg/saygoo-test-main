import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentType } from './document.entity';

@Controller('documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post(':bl_id')
  upload(
    @Param('bl_id') bl_id: string,
    @Body() body: { document_type: DocumentType; file_path: string; uploaded_by: string },
  ) {
    return this.documentService.upload(bl_id, body);
  }

  @Get('bl/:bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.documentService.findByBl(bl_id);
  }

  @Get(':id/download')
  download(@Param('id') id: string) {
    return this.documentService.download(id);
  }

  @Post(':id/sign')
  sign(@Param('id') id: string, @Body('signed_by') signed_by: string) {
    return this.documentService.sign(id, signed_by);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentEntity, DocumentType, DocumentStatus } from './document.entity';
import { BlService } from '../bl/bl.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    private blService: BlService,
  ) {}

  async upload(
    bl_id: string,
    data: { document_type: DocumentType; file_path: string; uploaded_by: string },
  ): Promise<DocumentEntity> {
    const bl = await this.blService.findOne(bl_id);

    return this.documentRepository.save(
      this.documentRepository.create({
        bl_id: bl.id,
        document_type: data.document_type,
        file_path: data.file_path,
        uploaded_by: data.uploaded_by,
        status: DocumentStatus.DEPOSITED,
      }),
    );
  }

  async findByBl(bl_id: string): Promise<DocumentEntity[]> {
    return this.documentRepository.find({ where: { bl_id }, relations: ['bl'] });
  }

  async findOne(id: string): Promise<DocumentEntity> {
    const document = await this.documentRepository.findOne({ where: { id }, relations: ['bl'] });
    if (!document) throw new NotFoundException('Document non trouvé');
    return document;
  }

  // Le chemin réel du fichier est servi par le stockage ; on renvoie les métadonnées.
  async download(id: string): Promise<DocumentEntity> {
    return this.findOne(id);
  }

  // Signature électronique, suivie d'un archivage automatique.
  async sign(id: string, signed_by: string): Promise<DocumentEntity> {
    const document = await this.findOne(id);

    if (document.status !== DocumentStatus.DEPOSITED) {
      throw new BadRequestException('Seul un document Déposé peut être signé');
    }

    const now = new Date();
    await this.documentRepository.update(id, {
      status: DocumentStatus.ARCHIVED,
      signed_by,
      signed_at: now,
      archived_at: now,
    });

    return this.findOne(id);
  }
}

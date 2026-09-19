import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BL } from '../bl/bl.entity';

export enum DocumentType {
  BL = 'BL',
  AWB = 'AWB',
  FACTURE_COMMERCIALE = 'FACTURE_COMMERCIALE',
  PACKING_LIST = 'PACKING_LIST',
  CERTIFICAT_ORIGINE = 'CERTIFICAT_ORIGINE',
  DOCUMENT_DOUANIER = 'DOCUMENT_DOUANIER',
}

export enum DocumentStatus {
  DEPOSITED = 'DEPOSITED',
  SIGNED = 'SIGNED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BL)
  @JoinColumn({ name: 'bl_id' })
  bl!: BL;

  @Column()
  bl_id!: string;

  @Column({ type: 'enum', enum: DocumentType })
  document_type!: DocumentType;

  @Column()
  file_path!: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.DEPOSITED })
  status!: DocumentStatus;

  @Column()
  uploaded_by!: string;

  @Column({ nullable: true })
  signed_by!: string;

  @Column({ nullable: true })
  signed_at!: Date;

  @Column({ nullable: true })
  archived_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}

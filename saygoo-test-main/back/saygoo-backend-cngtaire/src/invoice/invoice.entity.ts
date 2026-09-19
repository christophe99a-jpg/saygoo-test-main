import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BL } from '../bl/bl.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',     // Brouillon
  PENDING = 'PENDING', // Émise
  PAID = 'PAID',       // Payée
  CANCELLED = 'CANCELLED',
}

// Nature de la prestation (plusieurs valeurs possibles)
export enum ServiceNature {
  CONSIGNATION = 'CONSIGNATION',
  MANUTENTION = 'MANUTENTION',
  MAGASINAGE = 'MAGASINAGE',
  DOCUMENTATION = 'DOCUMENTATION',
  AUTRES = 'AUTRES',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BL)
  @JoinColumn({ name: 'bl_id' })
  bl!: BL;

  @Column()
  bl_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  demurrage_days!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  demurrage_amount!: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status!: InvoiceStatus;

  @Column({ nullable: true })
  client_name!: string;

  @Column({ type: 'simple-array', nullable: true })
  service_nature!: ServiceNature[];

  @Column({ type: 'text', nullable: true })
  observations!: string;

  @Column({ nullable: true })
  consignee_invoice_reference!: string;

  @Column({ nullable: true })
  file_path!: string;

  @CreateDateColumn()
  created_at!: Date;
}

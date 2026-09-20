import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BL } from '../bl/bl.entity';

export enum DOStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED', // = BAD ACTIF
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED', // = BAD ANNULÉ
}

@Entity('delivery_orders')
export class DeliveryOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BL)
  @JoinColumn({ name: 'bl_id' })
  bl!: BL;

  @Column()
  bl_id!: string;

  @Column({ type: 'enum', enum: DOStatus, default: DOStatus.PENDING })
  status!: DOStatus;

  @Column({ nullable: true })
  validated_at!: Date;

  // Numéro unique attribué par SAYGOO à l'émission
  @Column({ nullable: true, unique: true })
  bad_number!: string;

  @Column({ nullable: true })
  importer!: string;

  @Column({ nullable: true })
  container_number!: string;

  @Column({ nullable: true })
  consignee!: string;

  @Column({ type: 'date', nullable: true })
  validity_date!: Date;

  @Column({ type: 'date', nullable: true })
  deadline_date!: Date;

  @Column({ nullable: true })
  consignee_reference!: string;

  @Column({ type: 'text', nullable: true })
  observations!: string;

  @Column({ nullable: true })
  issued_by!: string;

  @Column({ type: 'text', nullable: true })
  cancel_reason!: string;

  @Column({ nullable: true })
  cancelled_at!: Date;

  @CreateDateColumn()
  created_at!: Date;
}

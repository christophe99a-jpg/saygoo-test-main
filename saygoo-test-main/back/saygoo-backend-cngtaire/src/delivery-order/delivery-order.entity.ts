import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BL } from '../bl/bl.entity';

export enum DOStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
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

  @CreateDateColumn()
  created_at!: Date;
}
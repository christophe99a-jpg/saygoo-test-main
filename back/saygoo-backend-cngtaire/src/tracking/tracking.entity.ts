import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BL } from '../bl/bl.entity';

export enum TrackingStatus {
  AT_PORT = 'AT_PORT',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
}

@Entity('tracking')
export class Tracking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => BL)
  @JoinColumn({ name: 'bl_id' })
  bl!: BL;

  @Column()
  bl_id!: string;

  @Column({ type: 'enum', enum: TrackingStatus, default: TrackingStatus.AT_PORT })
  status!: TrackingStatus;

  @Column({ nullable: true })
  location!: string;

  @Column({ nullable: true })
  notes!: string;

  @CreateDateColumn()
  updated_at!: Date;
}
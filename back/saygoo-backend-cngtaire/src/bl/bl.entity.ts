import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BLStatus {
  ARRIVED = 'ARRIVED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  RELEASED = 'RELEASED',
}

@Entity('bl')
export class BL {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  bl_number!: string;

  @Column({ nullable: true })
  vessel_name!: string;

  @Column({ nullable: true })
  client_name!: string;

  @Column({ nullable: true })
  cargo!: string;

  @Column({ nullable: true })
  arrival_date!: string;

  @Column({ nullable: true })
  file_path!: string;

  @Column({ type: 'enum', enum: BLStatus, default: BLStatus.ARRIVED })
  status!: BLStatus;

  @CreateDateColumn()
  created_at!: Date;
}
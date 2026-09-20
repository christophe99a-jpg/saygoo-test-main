import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  REFUSED = 'REFUSED',
}

export enum ContainerType {
  DRY_20 = 'DRY_20',
  DRY_40 = 'DRY_40',
  REEFER_20 = 'REEFER_20',
  REEFER_40 = 'REEFER_40',
  OPEN_TOP = 'OPEN_TOP',
  FLAT_RACK = 'FLAT_RACK',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  client_reference!: string;

  // Référence attribuée par le système consignataire
  @Column({ nullable: true, unique: true })
  booking_reference!: string;

  @Column({ nullable: true })
  shipping_company!: string;

  @Column({ nullable: true })
  port_of_departure!: string;

  @Column({ nullable: true })
  port_of_destination!: string;

  @Column({ type: 'date', nullable: true })
  loading_date!: Date;

  @Column({ nullable: true })
  cargo_nature!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cargo_weight!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cargo_volume!: number;

  @Column({ default: false })
  dangerous_goods!: boolean;

  @Column({ type: 'enum', enum: ContainerType, nullable: true })
  container_type!: ContainerType;

  @Column({ type: 'int', default: 1 })
  container_quantity!: number;

  @Column({ nullable: true })
  company_name!: string;

  @Column({ nullable: true })
  contact_name!: string;

  @Column({ nullable: true })
  contact_phone!: string;

  @Column({ nullable: true })
  contact_email!: string;

  @Column({ type: 'text', nullable: true })
  observations!: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column({ type: 'text', nullable: true })
  refusal_reason!: string;

  @CreateDateColumn()
  created_at!: Date;
}

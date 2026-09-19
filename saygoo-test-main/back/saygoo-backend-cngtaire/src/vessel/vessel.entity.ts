import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum VesselStatus {
  ANNOUNCED = 'ANNOUNCED',
  ARRIVED = 'ARRIVED',
  DEPARTED = 'DEPARTED',
}

@Entity('vessels')
export class Vessel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  vessel_name!: string;

  // ATP : Autorisation de Traitement du navire au Port
  @Column({ nullable: true })
  atp!: string;

  @Column({ type: 'timestamp', nullable: true })
  manifest_timestamp!: Date;

  @Column({ default: false })
  manifest_customs_ok!: boolean;

  // Manutentionnaire (Togo Terminal, Lomé Container Terminal...)
  @Column({ nullable: true })
  handler!: string;

  @Column({ nullable: true })
  berth!: string;

  @Column({ type: 'timestamp', nullable: true })
  eta!: Date;

  @Column({ type: 'timestamp', nullable: true })
  etd!: Date;

  // Compteurs alimentant l'onglet DECHARGEMENT
  @Column({ type: 'int', default: 0 })
  containers_announced!: number;

  @Column({ type: 'int', default: 0 })
  containers_processed!: number;

  @Column({ type: 'enum', enum: VesselStatus, default: VesselStatus.ANNOUNCED })
  status!: VesselStatus;

  @CreateDateColumn()
  created_at!: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryOrder } from './delivery-order.entity';

// Trace chaque modification d'un BAD : date, utilisateur, ancienne et nouvelle valeur.
@Entity('delivery_order_history')
export class DeliveryOrderHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => DeliveryOrder)
  @JoinColumn({ name: 'delivery_order_id' })
  deliveryOrder!: DeliveryOrder;

  @Column()
  delivery_order_id!: string;

  @Column()
  field_name!: string;

  @Column({ type: 'text', nullable: true })
  old_value!: string | null;

  @Column({ type: 'text', nullable: true })
  new_value!: string | null;

  @Column()
  changed_by!: string;

  @CreateDateColumn()
  changed_at!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { User } from '../../users/entities/user.entity';

export enum JobStatus {
  PUBLICADO = 'PUBLICADO',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  CANCELADO = 'CANCELADO',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  presupuesto: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  ubicacion: string | null;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PUBLICADO,
  })
  estado: JobStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

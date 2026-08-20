import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Application } from '../../applications/entities/application.entity';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';

export enum MatchStatus {
  ACTIVO = 'ACTIVO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  // Una application solo puede generar un match
  @Index({ unique: true })
  @Column({ name: 'application_id' })
  applicationId: number;

  @OneToOne(() => Application, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  // Un trabajo solo debe tener un match activo/seleccionado
  @Index({ unique: true })
  @Column({ name: 'job_id' })
  jobId: number;

  @OneToOne(() => Job, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'employer_id' })
  employerId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'employer_id' })
  employer: User;

  @Column({ name: 'worker_id' })
  workerId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'worker_id' })
  worker: User;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.ACTIVO,
  })
  estado: MatchStatus;

  @Column({
    name: 'started_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  startedAt: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamp',
    nullable: true,
  })
  completedAt: Date | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
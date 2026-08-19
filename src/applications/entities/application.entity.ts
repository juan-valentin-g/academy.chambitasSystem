import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';

export enum ApplicationStatus {
  PENDIENTE = 'PENDIENTE',
  ACEPTADA = 'ACEPTADA',
  RECHAZADA = 'RECHAZADA',
}

@Entity('applications')
@Index('uq_application_job_applicant', ['jobId', 'applicantId'], {
  unique: true,
})
export class Application {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'job_id' })
  jobId: number;

  @ManyToOne(() => Job, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ name: 'applicant_id' })
  applicantId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column({ type: 'text', nullable: true })
  mensaje: string | null;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDIENTE,
  })
  estado: ApplicationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

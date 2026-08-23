import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Match } from '../../matches/entities/match.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
@Index('uq_review_match_reviewer', ['matchId', 'reviewerId'], {
  unique: true,
})
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'match_id' })
  matchId: number;

  @ManyToOne(() => Match, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'reviewer_id' })
  reviewerId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User;

  @Column({ name: 'reviewee_id' })
  revieweeId: number;

  @ManyToOne(() => User, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'reviewee_id' })
  reviewee: User;

  @Column({ type: 'int' })
  calificacion: number;

  @Column({ type: 'text' })
  comentario: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

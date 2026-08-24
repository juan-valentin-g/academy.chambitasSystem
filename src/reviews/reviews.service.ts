import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { Match, MatchStatus } from '../matches/entities/match.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepository: Repository<Review>,
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
  ) {}

  async create(
    reviewerId: number,
    matchId: number,
    createReviewDto: CreateReviewDto,
  ) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`No se encontró el match con id ${matchId}`);
    }

    const revieweeId = this.getRevieweeId(match, reviewerId);

    if (match.estado !== MatchStatus.FINALIZADO) {
      throw new ConflictException('Solo se pueden reseñar matches finalizados');
    }

    const duplicate = await this.reviewsRepository.existsBy({
      matchId,
      reviewerId,
    });

    if (duplicate) {
      throw new ConflictException('Ya realizaste una reseña para este match');
    }

    const review = this.reviewsRepository.create({
      matchId,
      reviewerId,
      revieweeId,
      calificacion: createReviewDto.calificacion,
      comentario: createReviewDto.comentario.trim(),
    });

    try {
      const savedReview = await this.reviewsRepository.save(review);
      return this.findOneWithRelations(savedReview.id);
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException('Ya realizaste una reseña para este match');
      }

      throw error;
    }
  }

  async findByMatch(userId: number, matchId: number) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`No se encontró el match con id ${matchId}`);
    }

    this.ensureParticipant(match, userId);

    return this.reviewsRepository.find({
      where: { matchId },
      relations: {
        reviewer: true,
        reviewee: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findReceived(userId: number) {
    return this.reviewsRepository.find({
      where: { revieweeId: userId },
      relations: {
        match: {
          job: true,
        },
        reviewer: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private getRevieweeId(match: Match, reviewerId: number) {
    this.ensureParticipant(match, reviewerId);
    return match.employerId === reviewerId ? match.workerId : match.employerId;
  }

  private ensureParticipant(match: Match, userId: number) {
    if (match.employerId !== userId && match.workerId !== userId) {
      throw new ForbiddenException('No perteneces a este match');
    }
  }

  private async findOneWithRelations(id: number) {
    const review = await this.reviewsRepository.findOne({
      where: { id },
      relations: {
        match: {
          job: true,
        },
        reviewer: true,
        reviewee: true,
      },
    });

    if (!review) {
      throw new NotFoundException('No se encontró la reseña creada');
    }

    return review;
  }

  private isDuplicateEntry(error: unknown) {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as { code?: string };
    return driverError.code === 'ER_DUP_ENTRY';
  }
}

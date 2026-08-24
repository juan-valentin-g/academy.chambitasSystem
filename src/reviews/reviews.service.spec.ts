import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Match, MatchStatus } from '../matches/entities/match.entity';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewsRepository: MockRepository<Review>;
  let matchesRepository: MockRepository<Match>;

  const completedMatch = {
    id: 10,
    employerId: 5,
    workerId: 8,
    estado: MatchStatus.FINALIZADO,
  } as Match;

  beforeEach(async () => {
    reviewsRepository = {
      existsBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    matchesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review),
          useValue: reviewsRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: matchesRepository,
        },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  it('lets the employer review the worker after completion', async () => {
    const review = {
      id: 30,
      matchId: 10,
      reviewerId: 5,
      revieweeId: 8,
      calificacion: 5,
      comentario: 'Excelente trabajo',
    } as Review;

    matchesRepository.findOne?.mockResolvedValue(completedMatch);
    reviewsRepository.existsBy?.mockResolvedValue(false);
    reviewsRepository.create?.mockReturnValue(review);
    reviewsRepository.save?.mockResolvedValue(review);
    reviewsRepository.findOne?.mockResolvedValue(review);

    const result = await service.create(5, 10, {
      calificacion: 5,
      comentario: '  Excelente trabajo  ',
    });

    expect(reviewsRepository.create).toHaveBeenCalledWith({
      matchId: 10,
      reviewerId: 5,
      revieweeId: 8,
      calificacion: 5,
      comentario: 'Excelente trabajo',
    });
    expect(result).toBe(review);
  });

  it('derives the employer as reviewee when the worker reviews', async () => {
    const review = {
      id: 31,
      matchId: 10,
      reviewerId: 8,
      revieweeId: 5,
      calificacion: 4,
      comentario: 'Buen trato',
    } as Review;

    matchesRepository.findOne?.mockResolvedValue(completedMatch);
    reviewsRepository.existsBy?.mockResolvedValue(false);
    reviewsRepository.create?.mockReturnValue(review);
    reviewsRepository.save?.mockResolvedValue(review);
    reviewsRepository.findOne?.mockResolvedValue(review);

    await service.create(8, 10, {
      calificacion: 4,
      comentario: 'Buen trato',
    });

    expect(reviewsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewerId: 8,
        revieweeId: 5,
      }),
    );
  });

  it('rejects users who do not participate in the match', async () => {
    matchesRepository.findOne?.mockResolvedValue(completedMatch);

    await expect(
      service.create(99, 10, {
        calificacion: 5,
        comentario: 'Comentario',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(reviewsRepository.save).not.toHaveBeenCalled();
  });

  it('only permits reviews after the match is completed', async () => {
    matchesRepository.findOne?.mockResolvedValue({
      ...completedMatch,
      estado: MatchStatus.ACTIVO,
    });

    await expect(
      service.create(5, 10, {
        calificacion: 5,
        comentario: 'Comentario',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(reviewsRepository.save).not.toHaveBeenCalled();
  });

  it('prevents the same participant from reviewing twice', async () => {
    matchesRepository.findOne?.mockResolvedValue(completedMatch);
    reviewsRepository.existsBy?.mockResolvedValue(true);

    await expect(
      service.create(5, 10, {
        calificacion: 5,
        comentario: 'Comentario',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(reviewsRepository.save).not.toHaveBeenCalled();
  });

  it('fails when the requested match does not exist', async () => {
    matchesRepository.findOne?.mockResolvedValue(null);

    await expect(
      service.create(5, 99, {
        calificacion: 5,
        comentario: 'Comentario',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only lets participants list reviews from a match', async () => {
    matchesRepository.findOne?.mockResolvedValue(completedMatch);

    await expect(service.findByMatch(99, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(reviewsRepository.find).not.toHaveBeenCalled();
  });
});

import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { Match, MatchStatus } from './entities/match.entity';
import { MatchesService } from './matches.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('MatchesService', () => {
  let service: MatchesService;
  let matchesRepository: MockRepository<Match>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    matchesRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        {
          provide: getRepositoryToken(Match),
          useValue: matchesRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(MatchesService);
  });

  it('lists matches where the user is employer or worker', async () => {
    const matches = [{ id: 30, employerId: 5, workerId: 8 }] as Match[];
    matchesRepository.find?.mockResolvedValue(matches);

    await expect(service.findMine(8)).resolves.toEqual(matches);
    expect(matchesRepository.find).toHaveBeenCalledWith({
      where: [{ employerId: 8 }, { workerId: 8 }],
      relations: {
        job: true,
        employer: true,
        worker: true,
        application: true,
      },
      order: { createdAt: 'DESC' },
    });
  });

  it('prevents a non-participant from reading a match', async () => {
    matchesRepository.findOne?.mockResolvedValue({
      id: 30,
      employerId: 5,
      workerId: 8,
    } as Match);

    await expect(service.findOne(99, 30)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('completes an active match and its related job atomically', async () => {
    const job = {
      id: 10,
      estado: JobStatus.EN_PROCESO,
    } as Job;
    const match = {
      id: 30,
      employerId: 5,
      workerId: 8,
      estado: MatchStatus.ACTIVO,
      completedAt: null,
      job,
    } as Match;
    const transactionalMatches = {
      findOne: jest.fn().mockResolvedValue(match),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const transactionalJobs = {
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: typeof Match | typeof Job) =>
        entity === Match ? transactionalMatches : transactionalJobs,
      ),
    } as unknown as EntityManager;
    dataSource.transaction.mockImplementation((callback) => callback(manager));

    const result = await service.complete(8, 30);

    expect(result.estado).toBe(MatchStatus.FINALIZADO);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(job.estado).toBe(JobStatus.COMPLETADO);
    expect(transactionalJobs.save).toHaveBeenCalledWith(job);
    expect(transactionalMatches.save).toHaveBeenCalledWith(match);
  });

  it('does not complete a match twice', async () => {
    const match = {
      id: 30,
      employerId: 5,
      workerId: 8,
      estado: MatchStatus.FINALIZADO,
      job: { id: 10, estado: JobStatus.COMPLETADO },
    } as Match;
    const manager = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue(match),
        save: jest.fn(),
      })),
    } as unknown as EntityManager;
    dataSource.transaction.mockImplementation((callback) => callback(manager));

    await expect(service.complete(8, 30)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

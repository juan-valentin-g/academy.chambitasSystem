import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Job, JobStatus } from '../jobs/entities/job.entity';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationStatus } from './entities/application.entity';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationsRepository: MockRepository<Application>;
  let jobsRepository: MockRepository<Job>;
  let dataSource: {
    transaction: jest.MockedFunction<
      (
        callback: (manager: EntityManager) => Promise<Application>,
      ) => Promise<Application>
    >;
  };

  const publishedJob = {
    id: 10,
    ownerId: 5,
    estado: JobStatus.PUBLICADO,
  } as Job;

  beforeEach(async () => {
    applicationsRepository = {
      existsBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    jobsRepository = {
      findOne: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: applicationsRepository,
        },
        {
          provide: getRepositoryToken(Job),
          useValue: jobsRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get(ApplicationsService);
  });

  it('creates a pending application for the authenticated user', async () => {
    const created = {
      id: 20,
      jobId: 10,
      applicantId: 8,
      mensaje: 'Me interesa',
      estado: ApplicationStatus.PENDIENTE,
    } as Application;
    jobsRepository.findOne?.mockResolvedValue(publishedJob);
    applicationsRepository.existsBy?.mockResolvedValue(false);
    applicationsRepository.create?.mockReturnValue(created);
    applicationsRepository.save?.mockResolvedValue(created);
    applicationsRepository.findOne?.mockResolvedValue(created);

    const result = await service.create(8, 10, { mensaje: '  Me interesa  ' });

    expect(applicationsRepository.create).toHaveBeenCalledWith({
      jobId: 10,
      applicantId: 8,
      mensaje: 'Me interesa',
      estado: ApplicationStatus.PENDIENTE,
    });
    expect(result).toBe(created);
  });

  it('rejects an application when the job does not exist', async () => {
    jobsRepository.findOne?.mockResolvedValue(null);

    await expect(service.create(8, 99, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents applying to a job owned by the applicant', async () => {
    jobsRepository.findOne?.mockResolvedValue(publishedJob);

    await expect(service.create(5, 10, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('prevents duplicate applications', async () => {
    jobsRepository.findOne?.mockResolvedValue(publishedJob);
    applicationsRepository.existsBy?.mockResolvedValue(true);

    await expect(service.create(8, 10, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('only lets the owner list applications for a job', async () => {
    jobsRepository.findOne?.mockResolvedValue(publishedJob);

    await expect(service.findByJob(8, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(applicationsRepository.find).not.toHaveBeenCalled();
  });

  it('rejects a pending application when requested by the owner', async () => {
    const application = {
      id: 20,
      jobId: 10,
      applicantId: 8,
      job: publishedJob,
      estado: ApplicationStatus.PENDIENTE,
    } as Application;
    applicationsRepository.findOne?.mockResolvedValue(application);
    applicationsRepository.save?.mockResolvedValue(application);

    const result = await service.reject(5, 20);

    expect(result.estado).toBe(ApplicationStatus.RECHAZADA);
    expect(applicationsRepository.save).toHaveBeenCalledWith(application);
  });

  it('accepts one application and updates competing states atomically', async () => {
    const application = {
      id: 20,
      jobId: 10,
      applicantId: 8,
      job: { ...publishedJob },
      estado: ApplicationStatus.PENDIENTE,
    } as Application;
    const transactionalApplications = {
      findOne: jest.fn().mockResolvedValue(application),
      save: jest.fn().mockResolvedValue(application),
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    const transactionalJobs = {
      findOne: jest.fn().mockResolvedValue(application.job),
      save: jest.fn().mockResolvedValue(application.job),
    };
    const manager = {
      getRepository: jest.fn((entity: typeof Application | typeof Job) =>
        entity === Application ? transactionalApplications : transactionalJobs,
      ),
    } as unknown as EntityManager;
    dataSource.transaction.mockImplementation((callback) => callback(manager));

    const result = await service.accept(5, 20);

    expect(result.estado).toBe(ApplicationStatus.ACEPTADA);
    expect(result.job.estado).toBe(JobStatus.EN_PROCESO);
    expect(transactionalApplications.update).toHaveBeenCalledWith(
      { jobId: 10, estado: ApplicationStatus.PENDIENTE },
      { estado: ApplicationStatus.RECHAZADA },
    );
    expect(transactionalJobs.save).toHaveBeenCalledWith(application.job);
  });
});

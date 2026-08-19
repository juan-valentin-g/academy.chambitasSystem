import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { Job, JobStatus } from './entities/job.entity';
import { JobsService } from './jobs.service';

type MockRepository<T extends object> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

describe('JobsService', () => {
  let service: JobsService;
  let jobsRepository: MockRepository<Job>;
  let categoriesRepository: MockRepository<Category>;

  beforeEach(async () => {
    jobsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    categoriesRepository = {
      existsBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: getRepositoryToken(Job),
          useValue: jobsRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoriesRepository,
        },
      ],
    }).compile();

    service = module.get(JobsService);
  });

  it('creates a published job using the authenticated user as owner', async () => {
    const dto = {
      categoryId: 2,
      titulo: 'Reparar instalación eléctrica',
      descripcion: 'Se requiere reparar un contacto.',
      presupuesto: 500,
    };
    const createdJob = {
      id: 10,
      ...dto,
      ownerId: 7,
      estado: JobStatus.PUBLICADO,
    } as Job;

    categoriesRepository.existsBy?.mockResolvedValue(true);
    jobsRepository.create?.mockReturnValue(createdJob);
    jobsRepository.save?.mockResolvedValue(createdJob);
    jobsRepository.findOne?.mockResolvedValue(createdJob);

    await service.create(7, dto);

    expect(jobsRepository.create).toHaveBeenCalledWith({
      ...dto,
      ownerId: 7,
      estado: JobStatus.PUBLICADO,
    });
  });

  it('rejects creation when the category does not exist', async () => {
    categoriesRepository.existsBy?.mockResolvedValue(false);

    await expect(
      service.create(7, {
        categoryId: 99,
        titulo: 'Trabajo',
        descripcion: 'Descripción',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('prevents a user from updating another user job', async () => {
    jobsRepository.findOne?.mockResolvedValue({
      id: 10,
      ownerId: 8,
      estado: JobStatus.PUBLICADO,
    } as Job);

    await expect(
      service.update(7, 10, { titulo: 'Título diferente' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(jobsRepository.save).not.toHaveBeenCalled();
  });

  it('prevents modifying a job that is no longer published', async () => {
    jobsRepository.findOne?.mockResolvedValue({
      id: 10,
      ownerId: 7,
      estado: JobStatus.EN_PROCESO,
    } as Job);

    await expect(
      service.update(7, 10, { titulo: 'Título diferente' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only returns published jobs and applies the documented filters', async () => {
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    jobsRepository.createQueryBuilder?.mockReturnValue(builder);

    await service.findAll({
      titulo: 'pintura',
      categoryId: 3,
      ubicacion: 'Oaxaca',
    });

    expect(builder.where).toHaveBeenCalledWith('job.estado = :estado', {
      estado: JobStatus.PUBLICADO,
    });
    expect(builder.andWhere).toHaveBeenCalledWith('job.titulo LIKE :titulo', {
      titulo: '%pintura%',
    });
    expect(builder.andWhere).toHaveBeenCalledWith(
      'job.categoryId = :categoryId',
      { categoryId: 3 },
    );
    expect(builder.andWhere).toHaveBeenCalledWith(
      'job.ubicacion LIKE :ubicacion',
      { ubicacion: '%Oaxaca%' },
    );
  });
});

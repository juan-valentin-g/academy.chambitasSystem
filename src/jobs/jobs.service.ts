import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/entities/category.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobStatus } from './entities/job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(ownerId: number, createJobDto: CreateJobDto) {
    await this.ensureCategoryExists(createJobDto.categoryId);

    const job = this.jobsRepository.create({
      ...createJobDto,
      ownerId,
      estado: JobStatus.PUBLICADO,
    });

    const savedJob = await this.jobsRepository.save(job);
    return this.findPublishedById(savedJob.id);
  }

  async findAll(query: QueryJobsDto) {
    const builder = this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.owner', 'owner')
      .leftJoinAndSelect('job.category', 'category')
      .where('job.estado = :estado', { estado: JobStatus.PUBLICADO })
      .orderBy('job.createdAt', 'DESC');

    if (query.titulo) {
      builder.andWhere('job.titulo LIKE :titulo', {
        titulo: `%${query.titulo.trim()}%`,
      });
    }

    if (query.categoryId !== undefined) {
      builder.andWhere('job.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.ubicacion) {
      builder.andWhere('job.ubicacion LIKE :ubicacion', {
        ubicacion: `%${query.ubicacion.trim()}%`,
      });
    }

    return builder.getMany();
  }

  async findOne(id: number) {
    return this.findPublishedById(id);
  }

  async update(ownerId: number, id: number, updateJobDto: UpdateJobDto) {
    const job = await this.findOwnedJob(id, ownerId);

    if (job.estado !== JobStatus.PUBLICADO) {
      throw new ForbiddenException(
        'Solo se pueden modificar trabajos con estado PUBLICADO',
      );
    }

    if (updateJobDto.categoryId !== undefined) {
      await this.ensureCategoryExists(updateJobDto.categoryId);
    }

    Object.assign(job, updateJobDto);
    await this.jobsRepository.save(job);

    return this.findPublishedById(id);
  }

  async remove(ownerId: number, id: number) {
    const job = await this.findOwnedJob(id, ownerId);

    if (job.estado !== JobStatus.PUBLICADO) {
      throw new ForbiddenException(
        'Solo se pueden eliminar trabajos con estado PUBLICADO',
      );
    }

    await this.jobsRepository.remove(job);
    return { message: 'Trabajo eliminado correctamente' };
  }

  private async findPublishedById(id: number) {
    const job = await this.jobsRepository.findOne({
      where: { id, estado: JobStatus.PUBLICADO },
      relations: { owner: true, category: true },
    });

    if (!job) {
      throw new NotFoundException(`No se encontró el trabajo con id ${id}`);
    }

    return job;
  }

  private async findOwnedJob(id: number, ownerId: number) {
    const job = await this.jobsRepository.findOne({ where: { id } });

    if (!job) {
      throw new NotFoundException(`No se encontró el trabajo con id ${id}`);
    }

    if (job.ownerId !== ownerId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este trabajo',
      );
    }

    return job;
  }

  private async ensureCategoryExists(categoryId: number) {
    const exists = await this.categoriesRepository.existsBy({ id: categoryId });

    if (!exists) {
      throw new NotFoundException(
        `No se encontró la categoría con id ${categoryId}`,
      );
    }
  }
}

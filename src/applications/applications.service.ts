import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  DataSource,
  QueryFailedError,
  Repository,
} from 'typeorm';

import {
  Job,
  JobStatus,
} from '../jobs/entities/job.entity';

import {
  Match,
  MatchStatus,
} from '../matches/entities/match.entity';

import { CreateApplicationDto } from './dto/create-application.dto';

import {
  Application,
  ApplicationStatus,
} from './entities/application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,

    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,

    private readonly dataSource: DataSource,
  ) {}

  async create(
    applicantId: number,
    jobId: number,
    createApplicationDto: CreateApplicationDto,
  ) {
    const job = await this.jobsRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(
        `No se encontro el trabajo con id ${jobId}`,
      );
    }

    if (job.estado !== JobStatus.PUBLICADO) {
      throw new ConflictException(
        'Solo es posible postularse a trabajos publicados',
      );
    }

    if (job.ownerId === applicantId) {
      throw new ForbiddenException(
        'No puedes postularte a un trabajo que publicaste',
      );
    }

    const duplicate =
      await this.applicationsRepository.existsBy({
        jobId,
        applicantId,
      });

    if (duplicate) {
      throw new ConflictException(
        'Ya te postulaste a este trabajo',
      );
    }

    const application =
      this.applicationsRepository.create({
        jobId,
        applicantId,
        mensaje:
          createApplicationDto.mensaje?.trim() || null,
        estado: ApplicationStatus.PENDIENTE,
      });

    try {
      const savedApplication =
        await this.applicationsRepository.save(
          application,
        );

      return this.findOneWithRelations(
        savedApplication.id,
      );
    } catch (error) {
      if (this.isDuplicateEntry(error)) {
        throw new ConflictException(
          'Ya te postulaste a este trabajo',
        );
      }

      throw error;
    }
  }

  async findByJob(
    ownerId: number,
    jobId: number,
  ) {
    const job =
      await this.jobsRepository.findOne({
        where: { id: jobId },
      });

    if (!job) {
      throw new NotFoundException(
        `No se encontro el trabajo con id ${jobId}`,
      );
    }

    if (job.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Solo el propietario puede consultar las postulaciones del trabajo',
      );
    }

    return this.applicationsRepository.find({
      where: { jobId },

      relations: {
        applicant: true,
      },

      order: {
        createdAt: 'DESC',
      },
    });
  }

 //aceptar una postulacion y crear un match

  async accept(
    ownerId: number,
    applicationId: number,
  ) {
    return this.dataSource.transaction(
      async (manager) => {
        const applicationsRepository =
          manager.getRepository(Application);

        const jobsRepository =
          manager.getRepository(Job);

        const matchesRepository =
          manager.getRepository(Match);

        const application =
          await applicationsRepository.findOne({
            where: {
              id: applicationId,
            },

            relations: {
              applicant: true,
            },

            lock: {
              mode: 'pessimistic_write',
            },
          });

        if (!application) {
          throw new NotFoundException(
            'No se encontro la postulacion',
          );
        }

        const job =
          await jobsRepository.findOne({
            where: {
              id: application.jobId,
            },

            lock: {
              mode: 'pessimistic_write',
            },
          });

        if (!job) {
          throw new NotFoundException(
            'No se encontro el trabajo relacionado',
          );
        }

        application.job = job;

        this.ensureCanResolve(
          application,
          ownerId,
        );

        if (
          job.estado !== JobStatus.PUBLICADO
        ) {
          throw new ConflictException(
            'El trabajo ya no esta publicado',
          );
        }

        // aceptar la postulacion
        application.estado =
          ApplicationStatus.ACEPTADA;

        // cambiar trabajo a EN_PROCESO
        job.estado =
          JobStatus.EN_PROCESO;

        await applicationsRepository.save(
          application,
        );

        // rechazar las demás postulaciones
        await applicationsRepository.update(
          {
            jobId: application.jobId,
            estado:
              ApplicationStatus.PENDIENTE,
          },
          {
            estado:
              ApplicationStatus.RECHAZADA,
          },
        );

        // guardar estado del trabajo
        await jobsRepository.save(job);

        // verificar que no exista ya un match
        const existingMatch =
          await matchesRepository.findOne({
            where: [
              {
                applicationId:
                  application.id,
              },
              {
                jobId:
                  application.jobId,
              },
            ],
          });

        if (existingMatch) {
          throw new ConflictException(
            'Ya existe un match para esta postulacion o trabajo',
          );
        }

        // crear el match
        const match =
          matchesRepository.create({
            applicationId:
              application.id,

            jobId:
              application.jobId,

            employerId:
              job.ownerId,

            workerId:
              application.applicantId,

            estado:
              MatchStatus.ACTIVO,
          });

        // guardar el match
        const savedMatch =
          await matchesRepository.save(match);

        return savedMatch;
      },
    );
  }

  async reject(
    ownerId: number,
    applicationId: number,
  ) {
    const application =
      await this.applicationsRepository.findOne({
        where: {
          id: applicationId,
        },

        relations: {
          job: true,
          applicant: true,
        },
      });

    this.ensureCanResolve(
      application,
      ownerId,
    );

    application.estado =
      ApplicationStatus.RECHAZADA;

    return this.applicationsRepository.save(
      application,
    );
  }

  private ensureCanResolve(
    application: Application | null,
    ownerId: number,
  ): asserts application is Application {
    if (!application) {
      throw new NotFoundException(
        'No se encontro la postulacion',
      );
    }

    if (
      application.job.ownerId !== ownerId
    ) {
      throw new ForbiddenException(
        'Solo el propietario del trabajo puede resolver la postulacion',
      );
    }

    if (
      application.estado !==
      ApplicationStatus.PENDIENTE
    ) {
      throw new ConflictException(
        'Solo se pueden resolver postulaciones pendientes',
      );
    }
  }

  private async findOneWithRelations(
    id: number,
  ) {
    const application =
      await this.applicationsRepository.findOne({
        where: {
          id,
        },

        relations: {
          job: true,
          applicant: true,
        },
      });

    if (!application) {
      throw new NotFoundException(
        'No se encontro la postulacion creada',
      );
    }

    return application;
  }

  private isDuplicateEntry(
    error: unknown,
  ) {
    if (
      !(error instanceof QueryFailedError)
    ) {
      return false;
    }

    const driverError =
      error.driverError as {
        code?: string;
      };

    return (
      driverError.code ===
      'ER_DUP_ENTRY'
    );
  }
}
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';

import {
  DataSource,
  Repository,
} from 'typeorm';

import {
  Application,
  ApplicationStatus,
} from '../applications/entities/application.entity';

import {
  Job,
  JobStatus,
} from '../jobs/entities/job.entity';

import {
  Match,
  MatchStatus,
} from './entities/match.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,

    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,

    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,

    private readonly dataSource: DataSource,
  ) {}

  // crear un match a partir de una postulacion
 
  async createFromApplication(
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

    if (!application) {
      throw new NotFoundException(
        'No se encontro la postulacion',
      );
    }

    if (application.job.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Solo el propietario del trabajo puede generar el match',
      );
    }

    if (
      application.estado !==
      ApplicationStatus.ACEPTADA
    ) {
      throw new ConflictException(
        'La postulacion debe estar aceptada para generar un match',
      );
    }

    const existingMatch =
      await this.matchesRepository.findOne({
        where: [
          {
            applicationId: application.id,
          },
          {
            jobId: application.jobId,
          },
        ],
      });

    if (existingMatch) {
      throw new ConflictException(
        'Ya existe un match para esta postulacion o trabajo',
      );
    }

    const match = this.matchesRepository.create({
      applicationId: application.id,
      jobId: application.jobId,

      
      employerId: application.job.ownerId,

      
      workerId: application.applicantId,

      estado: MatchStatus.ACTIVO,
    });

    return this.matchesRepository.save(match);
  }

 
  // ver los matches propios de un usuario
  

  async findMine(userId: number) {
    return this.matchesRepository.find({
      where: [
        {
          employerId: userId,
        },
        {
          workerId: userId,
        },
      ],

      relations: {
        job: true,
        employer: true,
        worker: true,
        application: true,
      },

      order: {
        createdAt: 'DESC',
      },
    });
  }

 
  // ver un match en particular solo si pertenece al usuario

  async findOne(
    userId: number,
    matchId: number,
  ) {
    const match =
      await this.matchesRepository.findOne({
        where: {
          id: matchId,
        },

        relations: {
          job: true,
          employer: true,
          worker: true,
          application: true,
        },
      });

    if (!match) {
      throw new NotFoundException(
        'No se encontro el match',
      );
    }

    if (
      match.employerId !== userId &&
      match.workerId !== userId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar este match',
      );
    }

    return match;
  }

  
  // finalizar match solo si pertenece al usuario y es activo


  async complete(
    userId: number,
    matchId: number,
  ) {
    return this.dataSource.transaction(
      async (manager) => {
        const matchesRepository =
          manager.getRepository(Match);

        const jobsRepository =
          manager.getRepository(Job);

        const match =
          await matchesRepository.findOne({
            where: {
              id: matchId,
            },

            relations: {
              job: true,
            },

            lock: {
              mode: 'pessimistic_write',
            },
          });

        if (!match) {
          throw new NotFoundException(
            'No se encontro el match',
          );
        }

        if (
          match.employerId !== userId &&
          match.workerId !== userId
        ) {
          throw new ForbiddenException(
            'No perteneces a este match',
          );
        }

        if (
          match.estado !== MatchStatus.ACTIVO
        ) {
          throw new ConflictException(
            'Solo se pueden finalizar matches activos',
          );
        }

        match.estado = MatchStatus.FINALIZADO;
        match.completedAt = new Date();

        match.job.estado = JobStatus.COMPLETADO;

        await jobsRepository.save(match.job);

        return matchesRepository.save(match);
      },
    );
  }
}
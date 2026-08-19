import { PartialType } from '@nestjs/mapped-types';
import { CreateJobDto } from './create-job.dto';

// ownerId y estado se excluyen intencionalmente: el propietario proviene del
// JWT y los cambios de estado pertenecen al flujo de postulaciones/matches.
export class UpdateJobDto extends PartialType(CreateJobDto) {}

import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class QueryJobsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;
}

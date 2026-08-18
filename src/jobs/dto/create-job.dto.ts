import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateJobDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  presupuesto?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;
}

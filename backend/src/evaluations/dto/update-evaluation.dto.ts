import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationStatus } from '@prisma/client';
import { EvaluationIndicatorInputDto } from './create-evaluation.dto';

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  workProgramId?: string;

  @IsOptional()
  @IsString()
  evaluatedBy?: string;

  @IsOptional()
  @IsEnum(EvaluationStatus, { message: 'Status evaluasi tidak valid' })
  status?: EvaluationStatus;

  @IsOptional()
  @IsString()
  kesimpulan?: string;

  @IsOptional()
  @IsString()
  rekomendasi?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Minimal harus terdapat 1 indikator penilaian KPI/KPA',
  })
  @ValidateNested({ each: true })
  @Type(() => EvaluationIndicatorInputDto)
  indicators?: EvaluationIndicatorInputDto[];
}

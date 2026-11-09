import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EvaluationStatus } from '@prisma/client';

export class QueryEvaluationsDto {
  @IsOptional()
  @IsEnum(EvaluationStatus, { message: 'Filter status evaluasi tidak valid' })
  status?: EvaluationStatus;

  @IsOptional()
  @IsString()
  workProgramId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

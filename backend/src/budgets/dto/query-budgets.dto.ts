import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BudgetStatus } from '@prisma/client';

export class QueryBudgetsDto {
  @IsOptional()
  @IsEnum(BudgetStatus, { message: 'Filter status anggaran tidak valid' })
  status?: BudgetStatus;

  @IsOptional()
  @IsString()
  workProgramId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

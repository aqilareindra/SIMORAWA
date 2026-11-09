import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkProgramStatus } from '@prisma/client';

export class QueryWorkProgramsDto {
  @IsOptional()
  @IsEnum(WorkProgramStatus, { message: 'Filter status tidak valid' })
  status?: WorkProgramStatus;

  @IsOptional()
  @IsString()
  picId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

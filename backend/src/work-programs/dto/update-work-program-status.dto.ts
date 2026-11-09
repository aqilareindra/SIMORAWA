import { IsEnum } from 'class-validator';
import { WorkProgramStatus } from '@prisma/client';

export class UpdateWorkProgramStatusDto {
  @IsEnum(WorkProgramStatus, { message: 'Status program kerja tidak valid' })
  status: WorkProgramStatus;
}

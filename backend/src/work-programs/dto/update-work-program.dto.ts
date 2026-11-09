import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { WorkProgramStatus } from '@prisma/client';

export class UpdateWorkProgramDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama program kerja tidak boleh kosong' })
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Deskripsi program kerja tidak boleh kosong' })
  description?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'PIC tidak boleh kosong' })
  picId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal deadline tidak valid' })
  deadline?: string;

  @IsOptional()
  @IsEnum(WorkProgramStatus, { message: 'Status program kerja tidak valid' })
  status?: WorkProgramStatus;
}

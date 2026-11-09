import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkProgramStatus } from '@prisma/client';

export class InitialBudgetItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama item anggaran wajib diisi' })
  itemName: string;

  @Type(() => Number)
  @IsInt({ message: 'Kuantitas harus berupa angka bulat' })
  @Min(1, { message: 'Kuantitas minimal 1' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Satuan wajib diisi' })
  @MaxLength(50, { message: 'Satuan maksimal 50 karakter' })
  unit: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Harga satuan harus berupa angka' })
  @Min(0, { message: 'Harga satuan tidak boleh negatif' })
  unitPrice: number;
}

export class CreateWorkProgramDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama program kerja wajib diisi' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi program kerja wajib diisi' })
  description: string;

  @IsString()
  @IsNotEmpty({ message: 'PIC wajib dipilih' })
  picId: string;

  @IsDateString({}, { message: 'Format tanggal deadline tidak valid' })
  deadline: string;

  @IsOptional()
  @IsEnum(WorkProgramStatus, { message: 'Status program kerja tidak valid' })
  status?: WorkProgramStatus;

  @IsOptional()
  @IsString()
  budgetNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialBudgetItemDto)
  initialBudgetItems?: InitialBudgetItemDto[];
}

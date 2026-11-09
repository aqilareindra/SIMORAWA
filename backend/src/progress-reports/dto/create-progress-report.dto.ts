import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProgressReportDto {
  @Type(() => Number)
  @IsInt({ message: 'Persentase progres harus berupa angka bulat' })
  @Min(0, { message: 'Persentase progres minimal 0%' })
  @Max(100, { message: 'Persentase progres maksimal 100%' })
  progressPct: number;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi progres kegiatan wajib diisi' })
  description: string;

  @IsOptional()
  @IsString()
  obstacles?: string;
}

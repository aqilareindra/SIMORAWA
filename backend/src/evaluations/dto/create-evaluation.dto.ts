import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvaluationStatus } from '@prisma/client';

export class EvaluationIndicatorInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama indikator wajib diisi' })
  indicatorName: string;

  @IsString()
  @IsNotEmpty({ message: 'Target indikator wajib diisi' })
  target: string;

  @IsString()
  @IsNotEmpty({ message: 'Realisasi indikator wajib diisi' })
  realisasi: string;

  @Type(() => Number)
  @IsInt({ message: 'Skor harus berupa angka bulat 1 sampai 5' })
  @Min(1, { message: 'Skor minimal adalah 1 bintang' })
  @Max(5, { message: 'Skor maksimal adalah 5 bintang' })
  score: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateEvaluationDto {
  @IsString()
  @IsNotEmpty({ message: 'Program kerja wajib dipilih' })
  workProgramId: string;

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

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Minimal harus terdapat 1 indikator penilaian KPI/KPA',
  })
  @ValidateNested({ each: true })
  @Type(() => EvaluationIndicatorInputDto)
  indicators: EvaluationIndicatorInputDto[];
}

import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BudgetItemInputDto } from './create-budget.dto';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  notes?: string;

  /** Jika true, setelah disimpan anggaran langsung diajukan (SUBMITTED) */
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus terdapat 1 item anggaran' })
  @ValidateNested({ each: true })
  @Type(() => BudgetItemInputDto)
  items?: BudgetItemInputDto[];
}

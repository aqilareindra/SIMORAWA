import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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

export class BudgetItemInputDto {
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

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty({ message: 'Program kerja wajib dipilih' })
  workProgramId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Jika true, anggaran langsung diajukan (status SUBMITTED / Menunggu Approval) */
  @IsOptional()
  @IsBoolean()
  submit?: boolean;

  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal harus terdapat 1 item anggaran' })
  @ValidateNested({ each: true })
  @Type(() => BudgetItemInputDto)
  items: BudgetItemInputDto[];
}

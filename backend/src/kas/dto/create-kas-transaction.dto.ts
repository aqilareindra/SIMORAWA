import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KasTransactionType } from '@prisma/client';

export class CreateKasTransactionDto {
  @IsEnum(KasTransactionType, {
    message: 'Jenis transaksi harus PEMASUKAN atau PENGELUARAN',
  })
  type: KasTransactionType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Nominal transaksi harus berupa angka' })
  @Min(1, { message: 'Nominal transaksi minimal Rp 1' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Keterangan transaksi wajib diisi' })
  description: string;

  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal transaksi tidak valid' })
  transactionDate?: string;
}

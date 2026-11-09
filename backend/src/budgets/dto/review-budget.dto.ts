import { IsIn, IsOptional, IsString } from 'class-validator';
import { BudgetStatus } from '@prisma/client';

export class ReviewBudgetDto {
  @IsIn([BudgetStatus.APPROVED, BudgetStatus.REJECTED], {
    message: 'Keputusan review harus APPROVED atau REJECTED',
  })
  status: 'APPROVED' | 'REJECTED';

  /** Catatan review / alasan penolakan (wajib saat REJECTED) */
  @IsOptional()
  @IsString()
  notes?: string;
}

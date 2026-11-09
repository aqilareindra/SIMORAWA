import { BadRequestException, Injectable } from '@nestjs/common';
import { KasTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKasTransactionDto } from './dto/create-kas-transaction.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

const TRANSACTION_INCLUDE = {
  creator: { select: USER_PUBLIC_SELECT },
  budget: {
    select: {
      id: true,
      status: true,
      totalAmount: true,
      workProgram: {
        select: { id: true, name: true },
      },
    },
  },
} satisfies Prisma.KasTransactionInclude;

@Injectable()
export class KasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ambil record Kas utama; buat dengan saldo 0 jika belum ada */
  private async ensureKas(tx: Prisma.TransactionClient | PrismaService) {
    const kas = await tx.kas.findFirst();
    if (kas) return kas;
    return tx.kas.create({ data: { balance: 0 } });
  }

  async getOverview() {
    const kas = await this.ensureKas(this.prisma);

    const [totals, transactions] = await Promise.all([
      this.prisma.kasTransaction.groupBy({
        by: ['type'],
        where: { kasId: kas.id },
        _sum: { amount: true },
      }),
      this.prisma.kasTransaction.findMany({
        where: { kasId: kas.id },
        include: TRANSACTION_INCLUDE,
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const sumOf = (type: KasTransactionType) =>
      totals.find((t) => t.type === type)?._sum.amount ??
      new Prisma.Decimal(0);

    return {
      id: kas.id,
      balance: kas.balance,
      updatedAt: kas.updatedAt,
      totalIncome: sumOf(KasTransactionType.PEMASUKAN),
      totalExpense: sumOf(KasTransactionType.PENGELUARAN),
      transactions,
    };
  }

  /** Catat transaksi kas manual (di luar anggaran proker) oleh BENDAHARA / ADMIN */
  async createTransaction(dto: CreateKasTransactionDto, currentUserId: string) {
    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const kas = await this.ensureKas(tx);

      if (dto.type === KasTransactionType.PENGELUARAN) {
        // Guard atomik: saldo tidak boleh minus
        const deduction = await tx.kas.updateMany({
          where: { id: kas.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (deduction.count !== 1) {
          throw new BadRequestException(
            'Saldo Kas HIMA tidak mencukupi untuk mencatat pengeluaran ini.',
          );
        }
      } else {
        await tx.kas.update({
          where: { id: kas.id },
          data: { balance: { increment: amount } },
        });
      }

      return tx.kasTransaction.create({
        data: {
          kasId: kas.id,
          type: dto.type,
          amount,
          description: dto.description.trim(),
          transactionDate: dto.transactionDate
            ? new Date(dto.transactionDate)
            : undefined,
          createdBy: currentUserId,
        },
        include: TRANSACTION_INCLUDE,
      });
    });
  }
}

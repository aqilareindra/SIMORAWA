import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetStatus,
  KasTransactionType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetItemInputDto, CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ReviewBudgetDto } from './dto/review-budget.dto';
import { QueryBudgetsDto } from './dto/query-budgets.dto';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

const BUDGET_INCLUDE = {
  workProgram: {
    select: {
      id: true,
      name: true,
      status: true,
      deadline: true,
      picId: true,
      pic: { select: USER_PUBLIC_SELECT },
    },
  },
  items: true,
  submitter: { select: USER_PUBLIC_SELECT },
  // Transaksi kas pencairan → sumber info approver (pencatat transaksi = approver)
  kasTransactions: {
    include: {
      creator: { select: USER_PUBLIC_SELECT },
    },
    orderBy: { transactionDate: 'desc' },
  },
} satisfies Prisma.BudgetInclude;

const INSUFFICIENT_BALANCE_MESSAGE =
  'Saldo Kas HIMA tidak mencukupi untuk menyetujui anggaran ini.';

/** Status yang masih boleh diedit / diajukan ulang */
const EDITABLE_STATUSES: BudgetStatus[] = [
  BudgetStatus.DRAFT,
  BudgetStatus.REJECTED,
];

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================ Helpers ============================

  /** Hitung totalPrice per item (quantity * unitPrice) dan totalAmount budget */
  private mapItems(items: BudgetItemInputDto[]) {
    const mapped = items.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      const totalPrice = unitPrice.mul(quantity);
      return {
        itemName: item.itemName.trim(),
        quantity,
        unit: item.unit.trim(),
        unitPrice,
        totalPrice,
      };
    });

    const totalAmount = mapped.reduce(
      (sum, item) => sum.add(item.totalPrice),
      new Prisma.Decimal(0),
    );

    return { mapped, totalAmount };
  }

  /** PIC hanya boleh mengelola anggaran untuk proker yang menjadi tanggung jawabnya */
  private assertCanManageWorkProgram(
    workProgram: { picId: string },
    user: AuthUser,
  ) {
    if (user.role === Role.PIC && workProgram.picId !== user.id) {
      throw new ForbiddenException(
        'PIC hanya dapat mengelola anggaran untuk program kerja yang menjadi tanggung jawabnya.',
      );
    }
  }

  private appendReviewNote(
    existingNotes: string | null,
    decision: 'DISETUJUI' | 'DITOLAK',
    reviewer: AuthUser,
    note?: string,
  ) {
    const stamp = new Date().toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    });
    const header = `[REVIEW ${decision} oleh ${reviewer.name} (${reviewer.role}) • ${stamp}]`;
    const line = note && note.trim() ? `${header} ${note.trim()}` : header;
    return existingNotes && existingNotes.trim()
      ? `${existingNotes.trim()}\n${line}`
      : line;
  }

  private async findBudgetOrThrow(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { workProgram: true },
    });
    if (!budget) {
      throw new NotFoundException('Data anggaran tidak ditemukan.');
    }
    return budget;
  }

  // ============================ Queries ============================

  async findAll(query: QueryBudgetsDto) {
    const where: Prisma.BudgetWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.workProgramId && query.workProgramId.trim() !== '') {
      where.workProgramId = query.workProgramId.trim();
    }

    if (query.search && query.search.trim() !== '') {
      const keyword = query.search.trim();
      where.OR = [
        { workProgram: { name: { contains: keyword } } },
        { notes: { contains: keyword } },
      ];
    }

    return this.prisma.budget.findMany({
      where,
      include: BUDGET_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: BUDGET_INCLUDE,
    });
    if (!budget) {
      throw new NotFoundException('Data anggaran tidak ditemukan.');
    }
    return budget;
  }

  // ============================ Mutations ============================

  async create(dto: CreateBudgetDto, user: AuthUser) {
    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id: dto.workProgramId },
    });
    if (!workProgram) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }
    this.assertCanManageWorkProgram(workProgram, user);

    const { mapped, totalAmount } = this.mapItems(dto.items);

    if (dto.submit && totalAmount.lte(0)) {
      throw new BadRequestException(
        'Total anggaran harus lebih dari Rp 0 untuk dapat diajukan.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.budget.create({
        data: {
          workProgramId: dto.workProgramId,
          submittedBy: user.id,
          status: dto.submit ? BudgetStatus.SUBMITTED : BudgetStatus.DRAFT,
          totalAmount,
          notes: dto.notes?.trim() || null,
          items: { create: mapped },
        },
        include: BUDGET_INCLUDE,
      });
    });
  }

  async update(id: string, dto: UpdateBudgetDto, user: AuthUser) {
    const existing = await this.findBudgetOrThrow(id);
    this.assertCanManageWorkProgram(existing.workProgram, user);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        existing.status === BudgetStatus.APPROVED
          ? 'Anggaran yang sudah disetujui tidak dapat diubah.'
          : 'Anggaran sedang menunggu approval dan tidak dapat diubah.',
      );
    }

    const itemsPayload =
      dto.items && dto.items.length > 0 ? this.mapItems(dto.items) : null;
    const nextTotal = itemsPayload
      ? itemsPayload.totalAmount
      : new Prisma.Decimal(existing.totalAmount);

    if (dto.submit && nextTotal.lte(0)) {
      throw new BadRequestException(
        'Total anggaran harus lebih dari Rp 0 untuk dapat diajukan.',
      );
    }

    // Anggaran REJECTED yang direvisi kembali menjadi DRAFT (atau langsung diajukan ulang)
    const nextStatus = dto.submit ? BudgetStatus.SUBMITTED : BudgetStatus.DRAFT;

    return this.prisma.$transaction(async (tx) => {
      if (itemsPayload) {
        await tx.budgetItem.deleteMany({ where: { budgetId: id } });
      }

      return tx.budget.update({
        where: { id },
        data: {
          status: nextStatus,
          notes:
            dto.notes !== undefined ? dto.notes.trim() || null : undefined,
          ...(itemsPayload
            ? {
                totalAmount: itemsPayload.totalAmount,
                items: { create: itemsPayload.mapped },
              }
            : {}),
        },
        include: BUDGET_INCLUDE,
      });
    });
  }

  /** Ajukan anggaran: DRAFT / REJECTED → SUBMITTED (Menunggu Approval) */
  async submit(id: string, user: AuthUser) {
    const existing = await this.findBudgetOrThrow(id);
    this.assertCanManageWorkProgram(existing.workProgram, user);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        'Hanya anggaran berstatus Draft atau Ditolak yang dapat diajukan.',
      );
    }

    if (new Prisma.Decimal(existing.totalAmount).lte(0)) {
      throw new BadRequestException(
        'Total anggaran harus lebih dari Rp 0 untuk dapat diajukan.',
      );
    }

    return this.prisma.budget.update({
      where: { id },
      data: { status: BudgetStatus.SUBMITTED },
      include: BUDGET_INCLUDE,
    });
  }

  /**
   * Review anggaran oleh BENDAHARA / BPH / ADMIN.
   * APPROVED → potong Kas HIMA otomatis + catat KasTransaction PENGELUARAN
   * dalam satu prisma.$transaction (idempotent, anti double deduction).
   */
  async review(id: string, dto: ReviewBudgetDto, reviewer: AuthUser) {
    if (dto.status === BudgetStatus.REJECTED && !dto.notes?.trim()) {
      throw new BadRequestException(
        'Alasan penolakan wajib diisi saat menolak anggaran.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const budget = await tx.budget.findUnique({
        where: { id },
        include: { workProgram: true },
      });

      if (!budget) {
        throw new NotFoundException('Data anggaran tidak ditemukan.');
      }

      // Idempotency check: cegah pemotongan kas ganda
      if (budget.status === BudgetStatus.APPROVED) {
        throw new BadRequestException(
          'Anggaran ini sudah disetujui sebelumnya. Kas tidak akan dipotong ulang.',
        );
      }

      if (budget.status !== BudgetStatus.SUBMITTED) {
        throw new BadRequestException(
          'Hanya anggaran berstatus Menunggu Approval yang dapat direview.',
        );
      }

      if (dto.status === BudgetStatus.REJECTED) {
        await tx.budget.update({
          where: { id },
          data: {
            status: BudgetStatus.REJECTED,
            notes: this.appendReviewNote(
              budget.notes,
              'DITOLAK',
              reviewer,
              dto.notes,
            ),
          },
        });
      } else {
        const amount = new Prisma.Decimal(budget.totalAmount);

        // 1. Ambil data Kas utama
        const kas = await tx.kas.findFirst();
        if (!kas) {
          throw new BadRequestException(
            'Data Kas HIMA belum diinisialisasi. Hubungi Admin / Bendahara.',
          );
        }

        // 2. Validasi kecukupan saldo
        if (new Prisma.Decimal(kas.balance).lessThan(amount)) {
          throw new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
        }

        // Guard atomik status: hanya berhasil jika status masih SUBMITTED
        const statusGuard = await tx.budget.updateMany({
          where: { id, status: BudgetStatus.SUBMITTED },
          data: {
            status: BudgetStatus.APPROVED,
            notes: this.appendReviewNote(
              budget.notes,
              'DISETUJUI',
              reviewer,
              dto.notes,
            ),
          },
        });
        if (statusGuard.count !== 1) {
          throw new ConflictException(
            'Status anggaran telah berubah oleh pengguna lain. Muat ulang halaman.',
          );
        }

        // 3. Kurangi saldo Kas (guard atomik: saldo harus tetap >= amount)
        const deduction = await tx.kas.updateMany({
          where: { id: kas.id, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (deduction.count !== 1) {
          throw new BadRequestException(INSUFFICIENT_BALANCE_MESSAGE);
        }

        // 4. Catat transaksi PENGELUARAN otomatis
        await tx.kasTransaction.create({
          data: {
            kasId: kas.id,
            budgetId: budget.id,
            type: KasTransactionType.PENGELUARAN,
            amount,
            description: `Pencairan Anggaran Proker: ${budget.workProgram.name}`,
            createdBy: reviewer.id,
          },
        });
      }

      return tx.budget.findUnique({
        where: { id },
        include: BUDGET_INCLUDE,
      });
    });
  }

  async remove(id: string, user: AuthUser) {
    const existing = await this.findBudgetOrThrow(id);
    this.assertCanManageWorkProgram(existing.workProgram, user);

    if (existing.status === BudgetStatus.APPROVED) {
      throw new BadRequestException(
        'Anggaran yang sudah disetujui (dan telah memotong Kas) tidak dapat dihapus.',
      );
    }

    await this.prisma.budget.delete({ where: { id } });

    return {
      message: 'Data anggaran berhasil dihapus.',
      deletedId: id,
    };
  }
}

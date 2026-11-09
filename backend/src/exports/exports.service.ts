import { Injectable } from '@nestjs/common';
import {
  BudgetStatus,
  EvaluationStatus,
  KasTransactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildXlsxWorkbook } from './xlsx-builder.util';
import { buildEvaluationReportPdf } from './pdf-builder.util';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Approval (PENDING)',
  APPROVED: 'Disetujui (APPROVED)',
  REJECTED: 'Ditolak (REJECTED)',
};

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDateId(date?: Date | string | null): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private formatRupiah(val: unknown): string {
    const num = Number(val ?? 0);
    return `Rp ${num.toLocaleString('id-ID')}`;
  }

  /**
   * Menghasilkan file Excel (.xlsx) 2 Sheet:
   * - Sheet 1: Rekap Pengajuan Anggaran Proker
   * - Sheet 2: Buku Kas & Mutasi HIMA
   */
  async generateFinanceExcel(): Promise<Buffer> {
    const [budgets, kas, transactions] = await Promise.all([
      this.prisma.budget.findMany({
        include: {
          workProgram: {
            include: {
              pic: { select: USER_PUBLIC_SELECT },
            },
          },
          submitter: { select: USER_PUBLIC_SELECT },
          items: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.kas.findFirst(),
      this.prisma.kasTransaction.findMany({
        include: {
          creator: { select: USER_PUBLIC_SELECT },
          budget: {
            include: {
              workProgram: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const budgetRows = budgets.map((b, idx) => {
      const itemsText = (b.items || [])
        .map(
          (it) =>
            `${it.itemName} (${it.quantity} ${it.unit} x ${this.formatRupiah(it.unitPrice)})`,
        )
        .join('; ');

      return [
        idx + 1,
        b.workProgram?.name || '-',
        b.workProgram?.pic?.name || '-',
        b.submitter?.name || '-',
        b.items?.length || 0,
        itemsText || '-',
        Number(b.totalAmount || 0),
        this.formatRupiah(b.totalAmount),
        BUDGET_STATUS_LABELS[b.status] || b.status,
        b.notes || '-',
        this.formatDateId(b.updatedAt),
      ];
    });

    const totalIncome = transactions
      .filter((t) => t.type === KasTransactionType.PEMASUKAN)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const totalExpense = transactions
      .filter((t) => t.type === KasTransactionType.PENGELUARAN)
      .reduce((acc, t) => acc + Number(t.amount || 0), 0);

    const currentBalance = Number(kas?.balance ?? 0);

    const kasRows: Array<Array<string | number>> = [
      [
        '',
        'RINGKASAN BUKU KAS HIMA',
        '',
        currentBalance,
        `Saldo Kas Saat Ini: ${this.formatRupiah(currentBalance)}`,
        `Total Pemasukan: ${this.formatRupiah(totalIncome)} | Total Pengeluaran: ${this.formatRupiah(totalExpense)}`,
        '',
      ],
      ...transactions.map((tx, idx) => [
        idx + 1,
        this.formatDateId(tx.transactionDate),
        tx.type === KasTransactionType.PEMASUKAN
          ? 'PEMASUKAN (INCOME)'
          : 'PENGELUARAN (EXPENSE)',
        Number(tx.amount || 0),
        tx.type === KasTransactionType.PEMASUKAN
          ? `+ ${this.formatRupiah(tx.amount)}`
          : `- ${this.formatRupiah(tx.amount)}`,
        tx.description || '-',
        tx.budget?.workProgram?.name || 'Transaksi Manual Non-Proker',
        tx.creator ? `${tx.creator.name} (${tx.creator.role})` : '-',
      ]),
    ];

    return buildXlsxWorkbook([
      {
        name: 'Rekap Anggaran Proker',
        headers: [
          'No',
          'Nama Program Kerja',
          'PIC Pelaksana',
          'Pengaju Anggaran',
          'Jumlah Item',
          'Rincian Item Anggaran',
          'Total Anggaran (Angka)',
          'Total Anggaran (Rp)',
          'Status Approval',
          'Catatan / Riwayat Review',
          'Terakhir Diperbarui',
        ],
        rows: budgetRows,
        colWidths: [6, 28, 20, 20, 12, 42, 18, 20, 24, 34, 16],
      },
      {
        name: 'Buku Kas & Mutasi HIMA',
        headers: [
          'No',
          'Tanggal Transaksi',
          'Jenis Mutasi',
          'Nominal (Angka)',
          'Nominal (Format Rp)',
          'Keterangan Transaksi',
          'Terkait Program Kerja',
          'Dicatat Oleh',
        ],
        rows: kasRows,
        colWidths: [6, 18, 22, 18, 20, 40, 28, 22],
      },
    ]);
  }

  /**
   * Menghasilkan file laporan PDF resmi rekapitulasi Evaluasi KPI/KPA
   * program kerja kepengurusan HIMA IF UISI.
   */
  async generateEvaluationsPdf(): Promise<Buffer> {
    const evaluations = await this.prisma.evaluation.findMany({
      include: {
        workProgram: {
          include: {
            pic: { select: USER_PUBLIC_SELECT },
          },
        },
        evaluator: { select: USER_PUBLIC_SELECT },
        indicators: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalEvaluations = evaluations.length;
    const submittedList = evaluations.filter(
      (e) => e.status === EvaluationStatus.SUBMITTED,
    );
    const submittedCount = submittedList.length;
    const draftCount = totalEvaluations - submittedCount;

    const pool = submittedList.length > 0 ? submittedList : evaluations;
    const allIndicators = pool.flatMap((e) => e.indicators || []);
    const overallAvg =
      allIndicators.length > 0
        ? (
            allIndicators.reduce((acc, ind) => acc + Number(ind.score), 0) /
            allIndicators.length
          ).toFixed(2)
        : '0.00';

    const rows = evaluations.map((ev, idx) => {
      const inds = ev.indicators || [];
      const avg =
        inds.length > 0
          ? (
              inds.reduce((acc, i) => acc + Number(i.score), 0) / inds.length
            ).toFixed(2)
          : '0.00';

      const indicatorsSummary =
        inds.length > 0
          ? inds
              .map(
                (i) =>
                  `${i.indicatorName} [T:${i.target} | R:${i.realisasi} | ${i.score}/5]`,
              )
              .join('; ')
          : '-';

      return {
        no: idx + 1,
        prokerName: ev.workProgram?.name || '-',
        picName: ev.workProgram?.pic?.name || '-',
        evaluatorName: ev.evaluator?.name || '-',
        status: ev.status,
        indicatorCount: inds.length,
        avgScore: avg,
        indicatorsSummary,
        kesimpulan: ev.kesimpulan || '-',
        rekomendasi: ev.rekomendasi || '-',
        updatedAt: this.formatDateId(ev.updatedAt),
      };
    });

    return buildEvaluationReportPdf({
      generatedAt: this.formatDateId(new Date()),
      totalEvaluations,
      submittedCount,
      draftCount,
      averageScore: overallAvg,
      rows,
    });
  }
}

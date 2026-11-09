import { Injectable } from '@nestjs/common';
import {
  BudgetStatus,
  EvaluationStatus,
  KasTransactionType,
  Prisma,
  WorkProgramStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      workPrograms,
      kas,
      kasSums,
      budgets,
      evaluations,
      recentProgressReports,
      recentKasTransactions,
    ] = await Promise.all([
      this.prisma.workProgram.findMany({
        include: {
          pic: { select: USER_PUBLIC_SELECT },
          progressReports: {
            select: { id: true, progressPct: true, submittedAt: true },
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { deadline: 'asc' },
      }),
      this.prisma.kas.findFirst(),
      this.prisma.kasTransaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
      }),
      this.prisma.budget.findMany({
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      }),
      this.prisma.evaluation.findMany({
        include: {
          indicators: { select: { score: true } },
        },
      }),
      this.prisma.progressReport.findMany({
        include: {
          workProgram: { select: { id: true, name: true, status: true } },
          submitter: { select: USER_PUBLIC_SELECT },
        },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      this.prisma.kasTransaction.findMany({
        include: {
          creator: { select: USER_PUBLIC_SELECT },
          budget: {
            select: {
              id: true,
              workProgram: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ transactionDate: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
    ]);

    // 1. Statistik Program Kerja
    const totalPrograms = workPrograms.length;
    const notStarted = workPrograms.filter(
      (p) => p.status === WorkProgramStatus.NOT_STARTED,
    ).length;
    const inProgress = workPrograms.filter(
      (p) => p.status === WorkProgramStatus.IN_PROGRESS,
    ).length;
    const onHold = workPrograms.filter(
      (p) => p.status === WorkProgramStatus.ON_HOLD,
    ).length;
    const completed = workPrograms.filter(
      (p) => p.status === WorkProgramStatus.COMPLETED,
    ).length;

    const upcomingPool = workPrograms.filter(
      (p) => p.status !== WorkProgramStatus.COMPLETED,
    );
    const sourceForUpcoming =
      upcomingPool.length > 0 ? upcomingPool : workPrograms;

    const upcomingDeadlines = sourceForUpcoming.slice(0, 5).map((wp) => {
      const latestProgressPct =
        wp.progressReports && wp.progressReports.length > 0
          ? wp.progressReports[0].progressPct
          : wp.status === WorkProgramStatus.COMPLETED
            ? 100
            : 0;

      return {
        id: wp.id,
        name: wp.name,
        status: wp.status,
        deadline: wp.deadline,
        pic: wp.pic,
        progressPct: latestProgressPct,
      };
    });

    // 2. Statistik Keuangan & Kas
    const currentKasBalance = Number(kas?.balance ?? 0);
    const totalIncome = Number(
      kasSums.find((s) => s.type === KasTransactionType.PEMASUKAN)?._sum
        .amount ?? 0,
    );
    const totalExpense = Number(
      kasSums.find((s) => s.type === KasTransactionType.PENGELUARAN)?._sum
        .amount ?? 0,
    );

    const pendingBudgets = budgets.filter(
      (b) => b.status === BudgetStatus.SUBMITTED,
    );
    const approvedBudgets = budgets.filter(
      (b) => b.status === BudgetStatus.APPROVED,
    );
    const draftBudgets = budgets.filter((b) => b.status === BudgetStatus.DRAFT);

    const pendingBudgetsCount = pendingBudgets.length;
    const pendingBudgetsTotal = pendingBudgets.reduce(
      (acc, b) => acc + Number(b.totalAmount || 0),
      0,
    );
    const approvedBudgetsCount = approvedBudgets.length;
    const approvedBudgetsTotal = approvedBudgets.reduce(
      (acc, b) => acc + Number(b.totalAmount || 0),
      0,
    );
    const draftBudgetsCount = draftBudgets.length;
    const totalBudgetsCount = budgets.length;

    // 3. Statistik Evaluasi KPI/KPA
    const totalEvaluations = evaluations.length;
    const submittedEvalList = evaluations.filter(
      (e) => e.status === EvaluationStatus.SUBMITTED,
    );
    const submittedEvaluations = submittedEvalList.length;
    const draftEvaluations = totalEvaluations - submittedEvaluations;

    const evalPool =
      submittedEvalList.length > 0 ? submittedEvalList : evaluations;
    const allIndicators = evalPool.flatMap((e) => e.indicators || []);
    const averageKpiScore =
      allIndicators.length > 0
        ? Number(
            (
              allIndicators.reduce((acc, ind) => acc + Number(ind.score), 0) /
              allIndicators.length
            ).toFixed(2),
          )
        : 0;

    return {
      // Flat keys sesuai spesifikasi + nested groups agar fleksibel
      totalPrograms,
      notStarted,
      inProgress,
      onHold,
      completed,
      upcomingDeadlines,

      currentKasBalance,
      totalIncome,
      totalExpense,
      pendingBudgetsCount,
      pendingBudgetsTotal,
      approvedBudgetsCount,
      approvedBudgetsTotal,
      draftBudgetsCount,
      totalBudgetsCount,

      totalEvaluations,
      submittedEvaluations,
      draftEvaluations,
      averageKpiScore,

      recentProgressReports,
      recentKasTransactions,
    };
  }
}

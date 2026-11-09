import type { User } from './auth';

export type WorkProgramStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED';

export type BudgetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export const WORK_PROGRAM_STATUS_LABELS: Record<WorkProgramStatus, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Berjalan',
  ON_HOLD: 'Ditunda',
  COMPLETED: 'Selesai',
};

export const WORK_PROGRAM_STATUS_COLORS: Record<WorkProgramStatus, string> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'processing',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
};

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  DRAFT: 'default',
  SUBMITTED: 'gold',
  APPROVED: 'success',
  REJECTED: 'error',
};

export type KasTransactionType = 'PEMASUKAN' | 'PENGELUARAN';

export const KAS_TRANSACTION_LABELS: Record<KasTransactionType, string> = {
  PEMASUKAN: 'Pemasukan',
  PENGELUARAN: 'Pengeluaran',
};

export const KAS_TRANSACTION_COLORS: Record<KasTransactionType, string> = {
  PEMASUKAN: 'green',
  PENGELUARAN: 'red',
};

export interface KasTransactionItem {
  id: string;
  kasId: string;
  budgetId?: string | null;
  type: KasTransactionType;
  amount: number | string;
  description: string;
  transactionDate: string;
  createdBy: string;
  creator?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  budget?: {
    id: string;
    status: BudgetStatus;
    totalAmount: number | string;
    workProgram?: { id: string; name: string };
  } | null;
}

export interface KasOverview {
  id: string;
  balance: number | string;
  updatedAt: string;
  totalIncome: number | string;
  totalExpense: number | string;
  transactions: KasTransactionItem[];
}

export interface BudgetItem {
  id?: string;
  budgetId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number | string;
  totalPrice?: number | string;
}

export interface Budget {
  id: string;
  workProgramId: string;
  submittedBy: string;
  status: BudgetStatus;
  totalAmount: number | string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: BudgetItem[];
  submitter?: User;
  workProgram?: {
    id: string;
    name: string;
    status: WorkProgramStatus;
    deadline: string;
    picId: string;
    pic?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  };
  /** Transaksi kas pencairan (creator = approver) */
  kasTransactions?: KasTransactionItem[];
}

export interface ProgressReportItem {
  id: string;
  workProgramId: string;
  submittedBy: string;
  progressPct: number;
  description: string;
  obstacles?: string | null;
  submittedAt: string;
  submitter?: User;
}

export interface DocumentItem {
  id: string;
  workProgramId?: string | null;
  uploadedBy: string;
  type: string;
  mimeType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  createdAt: string;
  uploader?: User;
}

export interface EvaluationIndicatorItem {
  id: string;
  evaluationId: string;
  indicatorName: string;
  target: string;
  realisasi: string;
  score: number;
  notes?: string | null;
}

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED';

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
};

export const EVALUATION_STATUS_COLORS: Record<EvaluationStatus, string> = {
  DRAFT: 'default',
  SUBMITTED: 'success',
};

export interface EvaluationWorkProgramRef {
  id: string;
  name: string;
  status: WorkProgramStatus;
  deadline: string;
  pic?: User;
}

export interface EvaluationItem {
  id: string;
  workProgramId: string;
  evaluatedBy: string;
  kesimpulan?: string | null;
  rekomendasi?: string | null;
  status: EvaluationStatus;
  createdAt: string;
  updatedAt: string;
  evaluator?: User;
  indicators?: EvaluationIndicatorItem[];
  workProgram?: EvaluationWorkProgramRef;
  /** Dihitung oleh backend pada endpoint /evaluations */
  avgScore?: number;
}

export interface EvaluationSummary {
  totalEvaluations: number;
  submittedCount: number;
  draftCount: number;
  averageScore: number;
}

/** Hitung rata-rata skor indikator (1-5) dengan presisi 2 desimal */
export function calculateAverageScore(
  indicators?: Array<{ score: number }>,
): number {
  if (!indicators || indicators.length === 0) return 0;
  const sum = indicators.reduce((acc, ind) => acc + Number(ind.score || 0), 0);
  return Number((sum / indicators.length).toFixed(2));
}

export interface WorkProgram {
  id: string;
  name: string;
  description: string;
  status: WorkProgramStatus;
  picId: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  pic: User;
  budgets?: Budget[];
  progressReports?: ProgressReportItem[];
  documents?: DocumentItem[];
  evaluations?: EvaluationItem[];
  _count?: {
    documents: number;
    progressReports: number;
    budgets: number;
    evaluations: number;
  };
}

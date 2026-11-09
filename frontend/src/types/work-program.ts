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
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
  DRAFT: 'default',
  SUBMITTED: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
};

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

export interface EvaluationItem {
  id: string;
  workProgramId: string;
  evaluatedBy: string;
  kesimpulan?: string | null;
  rekomendasi?: string | null;
  status: 'DRAFT' | 'SUBMITTED';
  createdAt: string;
  updatedAt: string;
  evaluator?: User;
  indicators?: EvaluationIndicatorItem[];
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

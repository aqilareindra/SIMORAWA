<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AuditOutlined,
  AccountBookOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS } from '@/types/auth';
import {
  BUDGET_STATUS_COLORS,
  BUDGET_STATUS_LABELS,
  KAS_TRANSACTION_COLORS,
  KAS_TRANSACTION_LABELS,
  type Budget,
  type BudgetStatus,
  type KasOverview,
  type KasTransactionItem,
  type KasTransactionType,
} from '@/types/work-program';
import {
  extractErrorMessage,
  formatCurrency,
  formatDate,
} from '@/utils/format';
import BudgetFormModal from '@/components/finance/BudgetFormModal.vue';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref<'budgets' | 'kas'>('budgets');

// RBAC
const canCreateBudget = computed(() =>
  ['KADIV', 'PIC', 'BENDAHARA', 'ADMIN'].includes(authStore.userRole || ''),
);
const canReviewBudget = computed(() =>
  ['BENDAHARA', 'BPH', 'ADMIN'].includes(authStore.userRole || ''),
);
const canManageKas = computed(() =>
  ['BENDAHARA', 'ADMIN'].includes(authStore.userRole || ''),
);
const canViewKas = computed(() =>
  ['ADMIN', 'BPH', 'KADIV', 'BENDAHARA', 'SEKRETARIS'].includes(
    authStore.userRole || '',
  ),
);

function canEditBudgetRecord(budget: Budget): boolean {
  if (!['DRAFT', 'REJECTED'].includes(budget.status)) return false;
  const role = authStore.userRole;
  if (!role) return false;
  if (['KADIV', 'BENDAHARA', 'ADMIN'].includes(role)) return true;
  if (role === 'PIC') {
    return budget.workProgram?.picId === authStore.user?.id;
  }
  return false;
}

// ===================== State Kas & Budgets =====================
const kasOverview = ref<KasOverview>({
  id: '',
  balance: 0,
  updatedAt: '',
  totalIncome: 0,
  totalExpense: 0,
  transactions: [],
});
const budgets = ref<Budget[]>([]);
const loadingKas = ref(false);
const loadingBudgets = ref(false);
const submittingBudgetId = ref<string | null>(null);

const budgetFilters = reactive<{
  search: string;
  status: BudgetStatus | undefined;
}>({
  search: '',
  status: undefined,
});

const kasFilters = reactive<{
  search: string;
  type: KasTransactionType | undefined;
}>({
  search: '',
  type: undefined,
});

const statusFilterOptions: Array<{ value: BudgetStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Menunggu Approval (PENDING)' },
  { value: 'APPROVED', label: 'Disetujui (APPROVED)' },
  { value: 'REJECTED', label: 'Ditolak (REJECTED)' },
];

const pendingStats = computed(() => {
  const pendingList = budgets.value.filter((b) => b.status === 'SUBMITTED');
  const totalNominal = pendingList.reduce(
    (sum, b) => sum + Number(b.totalAmount || 0),
    0,
  );
  return {
    count: pendingList.length,
    totalNominal,
  };
});

const filteredBudgets = computed(() => {
  return budgets.value.filter((b) => {
    if (budgetFilters.status && b.status !== budgetFilters.status) {
      return false;
    }
    if (budgetFilters.search.trim()) {
      const q = budgetFilters.search.trim().toLowerCase();
      const prokerName = b.workProgram?.name?.toLowerCase() || '';
      const picName = b.workProgram?.pic?.name?.toLowerCase() || '';
      const notes = b.notes?.toLowerCase() || '';
      if (!prokerName.includes(q) && !picName.includes(q) && !notes.includes(q)) {
        return false;
      }
    }
    return true;
  });
});

const filteredTransactions = computed(() => {
  return (kasOverview.value.transactions || []).filter((tx) => {
    if (kasFilters.type && tx.type !== kasFilters.type) {
      return false;
    }
    if (kasFilters.search.trim()) {
      const q = kasFilters.search.trim().toLowerCase();
      const desc = tx.description?.toLowerCase() || '';
      const proker = tx.budget?.workProgram?.name?.toLowerCase() || '';
      const creator = tx.creator?.name?.toLowerCase() || '';
      if (!desc.includes(q) && !proker.includes(q) && !creator.includes(q)) {
        return false;
      }
    }
    return true;
  });
});

// ===================== Kolom Tabel =====================
const budgetColumns = [
  { title: 'No', key: 'index', width: 55, align: 'center' as const },
  { title: 'Program Kerja & PIC', key: 'workProgram', width: 250 },
  { title: 'Keterangan / Catatan Review', key: 'notes' },
  {
    title: 'Jumlah Item',
    key: 'itemCount',
    width: 115,
    align: 'center' as const,
  },
  {
    title: 'Total Anggaran',
    key: 'totalAmount',
    width: 170,
    align: 'right' as const,
  },
  { title: 'Status', key: 'status', width: 175, align: 'center' as const },
  { title: 'Aksi', key: 'actions', width: 290, align: 'center' as const },
];

const budgetItemColumns = [
  { title: 'No', key: 'index', width: 55, align: 'center' as const },
  { title: 'Nama Item Anggaran', dataIndex: 'itemName', key: 'itemName' },
  {
    title: 'Qty',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 80,
    align: 'center' as const,
  },
  { title: 'Satuan', dataIndex: 'unit', key: 'unit', width: 100 },
  {
    title: 'Harga Satuan',
    key: 'unitPrice',
    width: 150,
    align: 'right' as const,
  },
  {
    title: 'Total Harga',
    key: 'totalPrice',
    width: 160,
    align: 'right' as const,
  },
];

const kasColumns = [
  { title: 'No', key: 'index', width: 55, align: 'center' as const },
  { title: 'Tanggal', key: 'transactionDate', width: 140 },
  { title: 'Jenis Mutasi', key: 'type', width: 165, align: 'center' as const },
  {
    title: 'Nominal (Rp)',
    key: 'amount',
    width: 175,
    align: 'right' as const,
  },
  { title: 'Keterangan Transaksi', dataIndex: 'description', key: 'description' },
  { title: 'Terkait Proker', key: 'workProgram', width: 220 },
  { title: 'Pencatat', key: 'creator', width: 165 },
];

// ===================== Fetch Data =====================
async function fetchKasOverview() {
  if (!canViewKas.value) return;
  loadingKas.value = true;
  try {
    const { data } = await api.get<KasOverview>('/kas');
    kasOverview.value = data;
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal memuat data Buku Kas HIMA.'));
  } finally {
    loadingKas.value = false;
  }
}

async function fetchBudgets() {
  loadingBudgets.value = true;
  try {
    const { data } = await api.get<Budget[]>('/budgets');
    budgets.value = data;
  } catch (err: any) {
    message.error(
      extractErrorMessage(err, 'Gagal memuat daftar pengajuan anggaran.'),
    );
  } finally {
    loadingBudgets.value = false;
  }
}

function refreshAll() {
  fetchBudgets();
  fetchKasOverview();
}

function resetBudgetFilters() {
  budgetFilters.search = '';
  budgetFilters.status = undefined;
}

function resetKasFilters() {
  kasFilters.search = '';
  kasFilters.type = undefined;
}

function getRowClassName(_record: unknown, index: number) {
  return index % 2 === 1 ? 'striped-row' : '';
}

// ===================== Modal Buat / Edit Anggaran =====================
const budgetFormVisible = ref(false);
const editingBudget = ref<Budget | null>(null);

function openCreateBudgetModal() {
  editingBudget.value = null;
  budgetFormVisible.value = true;
}

function openEditBudgetModal(record: Budget) {
  editingBudget.value = record;
  budgetFormVisible.value = true;
}

// ===================== Modal Detail Rincian Item Anggaran =====================
const detailVisible = ref(false);
const selectedBudget = ref<Budget | null>(null);

function openDetailModal(record: Budget) {
  selectedBudget.value = record;
  detailVisible.value = true;
}

// ===================== Ajukan Approval (DRAFT -> SUBMITTED) =====================
async function handleSubmitForApproval(record: Budget) {
  submittingBudgetId.value = record.id;
  try {
    await api.patch(`/budgets/${record.id}/submit`);
    message.success(
      'Anggaran berhasil diajukan dan berstatus Menunggu Approval (PENDING).',
    );
    refreshAll();
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal mengajukan anggaran.'));
  } finally {
    submittingBudgetId.value = null;
  }
}

async function handleDeleteBudget(record: Budget) {
  try {
    await api.delete(`/budgets/${record.id}`);
    message.success('Data pengajuan anggaran berhasil dihapus.');
    refreshAll();
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal menghapus anggaran.'));
  }
}

// ===================== Modal Review (Approve / Reject) =====================
const reviewVisible = ref(false);
const reviewSubmitting = ref(false);
const reviewTarget = ref<Budget | null>(null);
const reviewDecision = ref<'APPROVED' | 'REJECTED'>('APPROVED');
const reviewNotes = ref('');

const isBalanceSufficientForReview = computed(() => {
  if (!reviewTarget.value) return true;
  return (
    Number(kasOverview.value.balance || 0) >=
    Number(reviewTarget.value.totalAmount || 0)
  );
});

function openReviewModal(record: Budget, decision: 'APPROVED' | 'REJECTED') {
  reviewTarget.value = record;
  reviewDecision.value = decision;
  reviewNotes.value = '';
  reviewVisible.value = true;
}

async function handleConfirmReview() {
  if (!reviewTarget.value) return;

  if (reviewDecision.value === 'REJECTED' && !reviewNotes.value.trim()) {
    message.warning('Alasan penolakan wajib diisi saat menolak anggaran.');
    return;
  }

  reviewSubmitting.value = true;
  try {
    await api.patch(`/budgets/${reviewTarget.value.id}/review`, {
      status: reviewDecision.value,
      notes: reviewNotes.value.trim() || undefined,
    });

    if (reviewDecision.value === 'APPROVED') {
      message.success(
        'Anggaran disetujui! Saldo Kas HIMA telah dipotong otomatis dan tercatat di Buku Kas.',
      );
    } else {
      message.success('Pengajuan anggaran telah ditolak.');
    }

    reviewVisible.value = false;
    detailVisible.value = false;
    refreshAll();
  } catch (err: any) {
    message.error(
      extractErrorMessage(err, 'Gagal memproses keputusan review anggaran.'),
    );
  } finally {
    reviewSubmitting.value = false;
  }
}

// ===================== Modal Transaksi Kas Manual =====================
const kasModalVisible = ref(false);
const kasSubmitting = ref(false);
const kasFormRef = ref();
const kasFormState = reactive<{
  type: KasTransactionType;
  amount: number;
  transactionDate: string;
  description: string;
}>({
  type: 'PEMASUKAN',
  amount: 0,
  transactionDate: new Date().toISOString().slice(0, 10),
  description: '',
});

function openKasModal() {
  kasFormState.type = 'PEMASUKAN';
  kasFormState.amount = 0;
  kasFormState.transactionDate = new Date().toISOString().slice(0, 10);
  kasFormState.description = '';
  kasModalVisible.value = true;
}

async function handleCreateKasTransaction() {
  try {
    await kasFormRef.value?.validate();
  } catch {
    return;
  }

  if (Number(kasFormState.amount) <= 0) {
    message.warning('Nominal transaksi harus lebih dari Rp 0.');
    return;
  }

  kasSubmitting.value = true;
  try {
    await api.post('/kas/transactions', {
      type: kasFormState.type,
      amount: Number(kasFormState.amount),
      description: kasFormState.description.trim(),
      transactionDate: kasFormState.transactionDate
        ? new Date(kasFormState.transactionDate).toISOString()
        : undefined,
    });
    message.success('Transaksi Kas HIMA berhasil dicatat.');
    kasModalVisible.value = false;
    refreshAll();
  } catch (err: any) {
    message.error(extractErrorMessage(err, 'Gagal mencatat transaksi kas.'));
  } finally {
    kasSubmitting.value = false;
  }
}

watch(activeTab, () => {
  refreshAll();
});

onMounted(() => {
  refreshAll();
});
</script>

<template>
  <div class="finance-page">
    <!-- Header Halaman -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Manajemen Anggaran &amp; Buku Kas HIMA</h2>
        <p class="page-subtitle">
          Pengajuan rincian anggaran proker, persetujuan BPH/Bendahara dengan
          pemotongan Kas otomatis, serta pembukuan mutasi Kas organisasi.
        </p>
      </div>
      <a-space wrap>
        <a-button :icon="h(ReloadOutlined)" @click="refreshAll">
          Muat Ulang
        </a-button>
        <a-button
          v-if="canManageKas"
          :icon="h(AccountBookOutlined)"
          @click="openKasModal"
        >
          + Catat Transaksi Kas Manual
        </a-button>
        <a-button
          v-if="canCreateBudget"
          type="primary"
          :icon="h(PlusOutlined)"
          @click="openCreateBudgetModal"
        >
          Buat Pengajuan Anggaran
        </a-button>
      </a-space>
    </div>

    <!-- 4 Kartu Ringkasan Keuangan -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card stat-card-primary" :loading="loadingKas">
          <div class="stat-body">
            <div class="stat-icon stat-icon-white">
              <WalletOutlined />
            </div>
            <div>
              <div class="stat-label stat-label-light">
                Saldo Kas HIMA Saat Ini
              </div>
              <div class="stat-value stat-value-light">
                {{ formatCurrency(kasOverview.balance) }}
              </div>
              <div class="stat-sub-light">
                Diperbarui {{ formatDate(kasOverview.updatedAt) }}
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingKas">
          <div class="stat-body">
            <div class="stat-icon stat-icon-green">
              <ArrowUpOutlined />
            </div>
            <div>
              <div class="stat-label">
                Total Pemasukan Kas
                <a-tag color="green" style="margin-left: 6px">INCOME</a-tag>
              </div>
              <div class="stat-value" style="color: #15803d">
                {{ formatCurrency(kasOverview.totalIncome) }}
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingKas">
          <div class="stat-body">
            <div class="stat-icon stat-icon-red">
              <ArrowDownOutlined />
            </div>
            <div>
              <div class="stat-label">
                Total Pengeluaran / Pencairan
                <a-tag color="volcano" style="margin-left: 6px">EXPENSE</a-tag>
              </div>
              <div class="stat-value" style="color: #dc2626">
                {{ formatCurrency(kasOverview.totalExpense) }}
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingBudgets">
          <div class="stat-body">
            <div class="stat-icon stat-icon-gold">
              <ClockCircleOutlined />
            </div>
            <div>
              <div class="stat-label">
                Menunggu Approval
                <a-tag color="gold" style="margin-left: 6px">PENDING</a-tag>
              </div>
              <div class="stat-value">
                {{ pendingStats.count }}
                <span class="stat-suffix">pengajuan</span>
              </div>
              <div class="text-muted">
                Senilai {{ formatCurrency(pendingStats.totalNominal) }}
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 2 Tab Utama -->
    <a-card class="main-card">
      <a-tabs v-model:activeKey="activeTab">
        <!-- TAB 1: Persetujuan & Rincian Anggaran Proker -->
        <a-tab-pane key="budgets">
          <template #tab>
            <span>
              <AuditOutlined />
              Persetujuan &amp; Rincian Anggaran Proker ({{ budgets.length }})
            </span>
          </template>

          <div class="filter-bar">
            <a-input-search
              v-model:value="budgetFilters.search"
              placeholder="Cari nama proker, PIC, atau catatan..."
              allow-clear
              style="width: 310px"
            />
            <a-select
              v-model:value="budgetFilters.status"
              placeholder="Semua Status Anggaran"
              allow-clear
              style="width: 240px"
              :options="statusFilterOptions"
            />
            <a-button @click="resetBudgetFilters">Reset Filter</a-button>
          </div>

          <a-table
            :columns="budgetColumns"
            :data-source="filteredBudgets"
            :loading="loadingBudgets"
            row-key="id"
            :row-class-name="getRowClassName"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ x: 1120 }"
            bordered
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>

              <template v-else-if="column.key === 'workProgram'">
                <a
                  class="proker-link"
                  @click="
                    router.push(
                      `/work-programs/${record.workProgramId}?tab=budgets`,
                    )
                  "
                >
                  {{ record.workProgram?.name || '-' }}
                </a>
                <div class="text-muted">
                  PIC: {{ record.workProgram?.pic?.name || '-' }}
                </div>
              </template>

              <template v-else-if="column.key === 'notes'">
                <div class="notes-cell">
                  {{ record.notes || 'Rincian Anggaran Program Kerja' }}
                </div>
                <div class="text-muted">
                  Diajukan oleh {{ record.submitter?.name || '-' }} ·
                  {{ formatDate(record.updatedAt) }}
                </div>
              </template>

              <template v-else-if="column.key === 'itemCount'">
                <a-tag color="blue">
                  {{ record.items?.length || 0 }} item
                </a-tag>
              </template>

              <template v-else-if="column.key === 'totalAmount'">
                <span class="amount-text">
                  {{ formatCurrency(record.totalAmount) }}
                </span>
              </template>

              <template v-else-if="column.key === 'status'">
                <a-tag
                  :color="BUDGET_STATUS_COLORS[record.status as BudgetStatus]"
                >
                  {{
                    record.status === 'SUBMITTED'
                      ? 'Menunggu Approval (PENDING)'
                      : BUDGET_STATUS_LABELS[record.status as BudgetStatus]
                  }}
                </a-tag>
                <div
                  v-if="
                    record.status === 'APPROVED' &&
                    record.kasTransactions?.[0]?.creator
                  "
                  class="text-muted"
                  style="margin-top: 2px"
                >
                  Disetujui {{ record.kasTransactions[0].creator.name }}
                </div>
              </template>

              <template v-else-if="column.key === 'actions'">
                <a-space wrap :size="4">
                  <a-button
                    type="link"
                    size="small"
                    :icon="h(EyeOutlined)"
                    @click="openDetailModal(record as Budget)"
                  >
                    Rincian
                  </a-button>

                  <!-- Aksi Pengaju (DRAFT / REJECTED) -->
                  <template v-if="canEditBudgetRecord(record as Budget)">
                    <a-button
                      type="link"
                      size="small"
                      :icon="h(EditOutlined)"
                      @click="openEditBudgetModal(record as Budget)"
                    >
                      Edit
                    </a-button>

                    <a-popconfirm
                      title="Ajukan anggaran ini untuk direview Bendahara/BPH?"
                      ok-text="Ya, Ajukan"
                      cancel-text="Batal"
                      @confirm="handleSubmitForApproval(record as Budget)"
                    >
                      <a-button
                        type="primary"
                        size="small"
                        ghost
                        :loading="submittingBudgetId === record.id"
                        :icon="h(SendOutlined)"
                      >
                        Ajukan
                      </a-button>
                    </a-popconfirm>

                    <a-popconfirm
                      title="Hapus pengajuan anggaran ini?"
                      ok-text="Ya, Hapus"
                      cancel-text="Batal"
                      :ok-button-props="{ danger: true }"
                      @confirm="handleDeleteBudget(record as Budget)"
                    >
                      <a-button
                        type="link"
                        danger
                        size="small"
                        :icon="h(DeleteOutlined)"
                      />
                    </a-popconfirm>
                  </template>

                  <!-- Aksi Reviewer (BENDAHARA / BPH / ADMIN) saat status SUBMITTED -->
                  <template
                    v-if="canReviewBudget && record.status === 'SUBMITTED'"
                  >
                    <a-button
                      type="primary"
                      size="small"
                      class="btn-approve"
                      :icon="h(CheckCircleOutlined)"
                      @click="openReviewModal(record as Budget, 'APPROVED')"
                    >
                      Setujui
                    </a-button>
                    <a-button
                      danger
                      size="small"
                      :icon="h(CloseCircleOutlined)"
                      @click="openReviewModal(record as Budget, 'REJECTED')"
                    >
                      Tolak
                    </a-button>
                  </template>
                </a-space>
              </template>
            </template>

            <template #emptyText>
              <a-empty description="Belum ada data pengajuan anggaran proker." />
            </template>
          </a-table>
        </a-tab-pane>

        <!-- TAB 2: Buku Kas & Mutasi Transaksi HIMA -->
        <a-tab-pane v-if="canViewKas" key="kas">
          <template #tab>
            <span>
              <AccountBookOutlined />
              Buku Kas &amp; Mutasi Transaksi HIMA ({{
                kasOverview.transactions?.length || 0
              }})
            </span>
          </template>

          <div class="kas-banner">
            <div>
              <div class="fw-semibold">
                Buku Kas Terpusat Organisasi (Otomatis &amp; Manual)
              </div>
              <div class="text-muted">
                Setiap anggaran proker yang disetujui otomatis memotong saldo Kas
                dan tercatat sebagai Pengeluaran Pencairan Proker.
              </div>
            </div>
            <a-button
              v-if="canManageKas"
              type="primary"
              :icon="h(PlusOutlined)"
              @click="openKasModal"
            >
              Catat Transaksi Kas Manual (Pemasukan / Pengeluaran)
            </a-button>
          </div>

          <div class="filter-bar">
            <a-input-search
              v-model:value="kasFilters.search"
              placeholder="Cari keterangan, proker, atau pencatat..."
              allow-clear
              style="width: 310px"
            />
            <a-select
              v-model:value="kasFilters.type"
              placeholder="Semua Jenis Mutasi"
              allow-clear
              style="width: 220px"
            >
              <a-select-option value="PEMASUKAN">
                Pemasukan (INCOME)
              </a-select-option>
              <a-select-option value="PENGELUARAN">
                Pengeluaran (EXPENSE)
              </a-select-option>
            </a-select>
            <a-button @click="resetKasFilters">Reset Filter</a-button>
          </div>

          <a-table
            :columns="kasColumns"
            :data-source="filteredTransactions"
            :loading="loadingKas"
            row-key="id"
            :row-class-name="getRowClassName"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
            :scroll="{ x: 1050 }"
            bordered
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">
                {{ index + 1 }}
              </template>

              <template v-else-if="column.key === 'transactionDate'">
                {{ formatDate(record.transactionDate) }}
              </template>

              <template v-else-if="column.key === 'type'">
                <a-tag
                  :color="
                    KAS_TRANSACTION_COLORS[record.type as KasTransactionType]
                  "
                >
                  {{
                    record.type === 'PEMASUKAN'
                      ? 'PEMASUKAN (INCOME)'
                      : 'PENGELUARAN (EXPENSE)'
                  }}
                </a-tag>
              </template>

              <template v-else-if="column.key === 'amount'">
                <span
                  :class="
                    record.type === 'PEMASUKAN'
                      ? 'amount-income'
                      : 'amount-expense'
                  "
                >
                  {{ record.type === 'PEMASUKAN' ? '+' : '-' }}
                  {{ formatCurrency(record.amount) }}
                </span>
              </template>

              <template v-else-if="column.key === 'workProgram'">
                <a
                  v-if="record.budget?.workProgram"
                  class="proker-link"
                  @click="
                    router.push(
                      `/work-programs/${record.budget.workProgram.id}?tab=budgets`,
                    )
                  "
                >
                  {{ record.budget.workProgram.name }}
                </a>
                <a-tag v-else color="default">Transaksi Manual Non-Proker</a-tag>
              </template>

              <template v-else-if="column.key === 'creator'">
                <div class="fw-semibold">{{ record.creator?.name || '-' }}</div>
                <div class="text-muted">
                  {{
                    record.creator?.role
                      ? ROLE_LABELS[record.creator.role]
                      : ''
                  }}
                </div>
              </template>
            </template>

            <template #emptyText>
              <a-empty description="Belum ada riwayat mutasi transaksi kas." />
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- Modal Buat / Edit Rincian Anggaran -->
    <BudgetFormModal
      v-model:open="budgetFormVisible"
      :budget="editingBudget"
      @saved="refreshAll"
    />

    <!-- Modal Detail Rincian Item Anggaran -->
    <a-modal
      v-model:open="detailVisible"
      title="Detail Rincian Pengajuan Anggaran"
      width="860px"
      :footer="null"
      destroy-on-close
    >
      <template v-if="selectedBudget">
        <div class="detail-banner">
          <div>
            <div class="detail-proker">
              {{ selectedBudget.workProgram?.name || '-' }}
            </div>
            <div class="text-muted">
              Diajukan oleh
              <strong>{{ selectedBudget.submitter?.name || '-' }}</strong> ·
              Diperbarui {{ formatDate(selectedBudget.updatedAt) }}
            </div>
          </div>
          <div class="detail-right">
            <a-tag :color="BUDGET_STATUS_COLORS[selectedBudget.status]">
              {{
                selectedBudget.status === 'SUBMITTED'
                  ? 'Menunggu Approval (PENDING)'
                  : BUDGET_STATUS_LABELS[selectedBudget.status]
              }}
            </a-tag>
            <div class="detail-total">
              {{ formatCurrency(selectedBudget.totalAmount) }}
            </div>
          </div>
        </div>

        <div v-if="selectedBudget.notes" class="notes-box">
          <div class="fw-semibold">Keterangan &amp; Riwayat Catatan Review:</div>
          <div class="notes-pre">{{ selectedBudget.notes }}</div>
        </div>

        <a-table
          :columns="budgetItemColumns"
          :data-source="selectedBudget.items || []"
          row-key="id"
          :pagination="false"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'unitPrice'">
              {{ formatCurrency(record.unitPrice) }}
            </template>
            <template v-else-if="column.key === 'totalPrice'">
              <span class="fw-semibold">
                {{ formatCurrency(record.totalPrice) }}
              </span>
            </template>
          </template>
        </a-table>

        <div
          v-if="canReviewBudget && selectedBudget.status === 'SUBMITTED'"
          class="detail-review-actions"
        >
          <a-space>
            <a-button
              danger
              :icon="h(CloseCircleOutlined)"
              @click="openReviewModal(selectedBudget, 'REJECTED')"
            >
              Tolak Pengajuan
            </a-button>
            <a-button
              type="primary"
              class="btn-approve"
              :icon="h(CheckCircleOutlined)"
              @click="openReviewModal(selectedBudget, 'APPROVED')"
            >
              Setujui (Potong Kas Otomatis)
            </a-button>
          </a-space>
        </div>
      </template>
    </a-modal>

    <!-- Modal Konfirmasi Review (Setujui / Tolak) -->
    <a-modal
      v-model:open="reviewVisible"
      :title="
        reviewDecision === 'APPROVED'
          ? 'Setujui Anggaran & Pencairan Kas Otomatis'
          : 'Tolak Pengajuan Anggaran'
      "
      :confirm-loading="reviewSubmitting"
      :ok-text="
        reviewDecision === 'APPROVED'
          ? 'Ya, Setujui & Potong Kas'
          : 'Ya, Tolak Anggaran'
      "
      :ok-button-props="{
        danger: reviewDecision === 'REJECTED',
        disabled:
          reviewDecision === 'APPROVED' && !isBalanceSufficientForReview,
      }"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleConfirmReview"
    >
      <template v-if="reviewTarget">
        <div class="review-summary-box">
          <div>
            <div class="text-muted">Program Kerja</div>
            <div class="fw-semibold">{{ reviewTarget.workProgram?.name }}</div>
          </div>
          <a-divider style="margin: 10px 0; border-color: #dbe2ef" />
          <div class="review-row">
            <span>Total Anggaran Diajukan:</span>
            <strong class="amount-text">
              {{ formatCurrency(reviewTarget.totalAmount) }}
            </strong>
          </div>
          <div v-if="reviewDecision === 'APPROVED'" class="review-row">
            <span>Saldo Kas HIMA Saat Ini:</span>
            <strong>{{ formatCurrency(kasOverview.balance) }}</strong>
          </div>
          <div
            v-if="reviewDecision === 'APPROVED' && isBalanceSufficientForReview"
            class="review-row"
          >
            <span>Estimasi Saldo Kas Setelah Pencairan:</span>
            <strong style="color: #15803d">
              {{
                formatCurrency(
                  Number(kasOverview.balance || 0) -
                    Number(reviewTarget.totalAmount || 0),
                )
              }}
            </strong>
          </div>
        </div>

        <a-alert
          v-if="reviewDecision === 'APPROVED' && !isBalanceSufficientForReview"
          type="error"
          show-icon
          style="margin-bottom: 12px"
          message="Saldo Kas HIMA tidak mencukupi untuk menyetujui anggaran ini."
        />
        <a-alert
          v-else-if="reviewDecision === 'APPROVED'"
          type="info"
          show-icon
          style="margin-bottom: 12px"
          message="Saat disetujui, sistem otomatis mengurangi saldo Kas HIMA dan mencatat transaksi PENGELUARAN di Buku Kas."
        />

        <a-form layout="vertical">
          <a-form-item
            :label="
              reviewDecision === 'REJECTED'
                ? 'Alasan Penolakan (Wajib)'
                : 'Catatan Persetujuan (Opsional)'
            "
            :required="reviewDecision === 'REJECTED'"
          >
            <a-textarea
              v-model:value="reviewNotes"
              :rows="3"
              :placeholder="
                reviewDecision === 'REJECTED'
                  ? 'Tuliskan alasan penolakan atau bagian rincian yang perlu direvisi...'
                  : 'Tambahkan catatan pencairan bila diperlukan...'
              "
            />
          </a-form-item>
        </a-form>
      </template>
    </a-modal>

    <!-- Modal Catat Transaksi Kas Manual (BENDAHARA & ADMIN) -->
    <a-modal
      v-model:open="kasModalVisible"
      title="Catat Transaksi Kas Manual (Buku Kas HIMA)"
      :confirm-loading="kasSubmitting"
      ok-text="Simpan Transaksi Kas"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleCreateKasTransaction"
    >
      <a-form
        ref="kasFormRef"
        layout="vertical"
        :model="kasFormState"
        style="margin-top: 12px"
      >
        <a-form-item
          label="Jenis Mutasi Transaksi"
          name="type"
          :rules="[{ required: true, message: 'Jenis transaksi wajib dipilih' }]"
        >
          <a-radio-group v-model:value="kasFormState.type" button-style="solid">
            <a-radio-button value="PEMASUKAN">
              Pemasukan (INCOME)
            </a-radio-button>
            <a-radio-button value="PENGELUARAN">
              Pengeluaran Non-Proker (EXPENSE)
            </a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-row :gutter="12">
          <a-col :span="14">
            <a-form-item
              label="Nominal (Rp)"
              name="amount"
              :rules="[{ required: true, message: 'Nominal wajib diisi' }]"
            >
              <a-input-number
                v-model:value="kasFormState.amount"
                :min="1"
                :precision="0"
                :step="10000"
                style="width: 100%"
                :formatter="
                  (v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                "
                :parser="(v: any) => `${v}`.replace(/\./g, '')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="Tanggal Transaksi" name="transactionDate">
              <a-input
                v-model:value="kasFormState.transactionDate"
                type="date"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item
          label="Keterangan Transaksi"
          name="description"
          :rules="[
            {
              required: true,
              whitespace: true,
              message: 'Keterangan transaksi wajib diisi',
            },
          ]"
        >
          <a-textarea
            v-model:value="kasFormState.description"
            :rows="3"
            placeholder="cth. Dana Kemahasiswaan Termin 1 / Iuran Pengurus / Pembelian ATK Sekretariat..."
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.finance-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #112d4e;
}

.page-subtitle {
  margin: 4px 0 0 0;
  color: #52616b;
  font-size: 13.5px;
}

.stat-card,
.main-card {
  border-color: #dbe2ef;
  border-radius: 10px;
  height: 100%;
}

.stat-card-primary {
  background: linear-gradient(135deg, #112d4e, #3f72af);
  border-color: #112d4e;
}

.stat-body {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #ffffff;
  flex-shrink: 0;
}

.stat-icon-white {
  background: rgba(255, 255, 255, 0.18);
}

.stat-icon-green {
  background: linear-gradient(135deg, #15803d, #22c55e);
}

.stat-icon-red {
  background: linear-gradient(135deg, #b91c1c, #ef4444);
}

.stat-icon-gold {
  background: linear-gradient(135deg, #d97706, #f59e0b);
}

.stat-label {
  font-size: 13px;
  color: #52616b;
}

.stat-label-light {
  color: #dbe2ef;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #112d4e;
  line-height: 1.25;
}

.stat-value-light {
  color: #ffffff;
}

.stat-sub-light {
  font-size: 12px;
  color: #dbe2ef;
}

.stat-suffix {
  font-size: 13px;
  font-weight: 500;
  color: #8c98a4;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.kas-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.proker-link {
  font-weight: 600;
  color: #3f72af;
}

.notes-cell {
  white-space: pre-line;
  color: #112d4e;
  font-size: 13px;
}

.amount-text {
  font-weight: 700;
  color: #112d4e;
}

.amount-income {
  font-weight: 700;
  color: #15803d;
}

.amount-expense {
  font-weight: 700;
  color: #dc2626;
}

.btn-approve {
  background-color: #15803d;
  border-color: #15803d;
}

.btn-approve:hover {
  background-color: #166534 !important;
  border-color: #166534 !important;
}

.detail-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 12px 0;
}

.detail-proker {
  font-size: 17px;
  font-weight: 700;
  color: #112d4e;
}

.detail-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.detail-total {
  font-size: 18px;
  font-weight: 700;
  color: #112d4e;
}

.notes-box {
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background-color: #ffffff;
}

.notes-pre {
  white-space: pre-line;
  color: #2d3748;
  margin-top: 4px;
}

.detail-review-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.review-summary-box {
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 12px 0;
}

.review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.text-muted {
  font-size: 12.5px;
  color: #8c98a4;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #112d4e !important;
  color: #ffffff !important;
  border-color: #dbe2ef !important;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr > td) {
  border-color: #dbe2ef !important;
}

:deep(.ant-table-tbody > tr.striped-row > td) {
  background-color: #f9f7f7;
}
</style>

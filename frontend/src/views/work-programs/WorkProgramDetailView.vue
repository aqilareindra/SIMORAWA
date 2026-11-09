<script setup lang="ts">
import { computed, onMounted, reactive, ref, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UserOutlined,
  WalletOutlined,
  LineChartOutlined,
  FilePdfOutlined,
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  StarOutlined,
  BarChartOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS, type User } from '@/types/auth';
import {
  BUDGET_STATUS_COLORS,
  BUDGET_STATUS_LABELS,
  EVALUATION_STATUS_COLORS,
  EVALUATION_STATUS_LABELS,
  WORK_PROGRAM_STATUS_COLORS,
  WORK_PROGRAM_STATUS_LABELS,
  calculateAverageScore,
  type Budget,
  type DocumentItem,
  type ProgressReportItem,
  type WorkProgram,
  type WorkProgramStatus,
} from '@/types/work-program';
import BudgetFormModal from '@/components/finance/BudgetFormModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const workProgramId = computed(() => route.params.id as string);
const workProgram = ref<WorkProgram | null>(null);
const picCandidates = ref<User[]>([]);
const templateKak = ref<DocumentItem | null>(null);
const loading = ref(false);
const updatingStatus = ref(false);
const VALID_TABS = ['budgets', 'progress', 'documents', 'evaluations'];
const activeTab = ref(
  VALID_TABS.includes(route.query.tab as string)
    ? (route.query.tab as string)
    : 'budgets',
);

const canManageWorkProgram = computed(() =>
  ['KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);

const canUpdateStatus = computed(() =>
  ['KADIV', 'PIC', 'ADMIN'].includes(authStore.userRole || ''),
);

const canSubmitProgress = computed(() =>
  ['PIC', 'KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);

const canManageDocuments = computed(() =>
  ['PIC', 'SEKRETARIS', 'KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);

// Manajemen Anggaran Proker (FR-17 & FR-18)
const canManageBudgetForProker = computed(() => {
  const role = authStore.userRole;
  if (!role) return false;
  if (['KADIV', 'BENDAHARA', 'ADMIN'].includes(role)) return true;
  if (role === 'PIC') {
    return workProgram.value?.picId === authStore.user?.id;
  }
  return false;
});

const canReviewBudget = computed(() =>
  ['BENDAHARA', 'BPH', 'ADMIN'].includes(authStore.userRole || ''),
);

const budgetModalVisible = ref(false);
const editingBudget = ref<Budget | null>(null);
const submittingBudgetId = ref<string | null>(null);

function openCreateBudgetModal() {
  editingBudget.value = null;
  budgetModalVisible.value = true;
}

function openEditBudgetModal(budget: Budget) {
  editingBudget.value = budget;
  budgetModalVisible.value = true;
}

async function handleSubmitBudgetForApproval(budget: Budget) {
  submittingBudgetId.value = budget.id;
  try {
    await api.patch(`/budgets/${budget.id}/submit`);
    message.success(
      'Anggaran berhasil diajukan dan berstatus Menunggu Approval (PENDING).',
    );
    await fetchDetail();
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Gagal mengajukan anggaran.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    submittingBudgetId.value = null;
  }
}

async function handleDeleteBudget(budget: Budget) {
  try {
    await api.delete(`/budgets/${budget.id}`);
    message.success('Rincian anggaran berhasil dihapus.');
    await fetchDetail();
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Gagal menghapus anggaran.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
}

// Evaluasi KPI/KPA (FR-09 s/d FR-12)
const canManageEvaluation = computed(() =>
  ['KADIV', 'BPH', 'ADMIN'].includes(authStore.userRole || ''),
);

const canViewEvaluationDashboard = computed(() =>
  ['ADMIN', 'BPH', 'KADIV', 'SEKRETARIS'].includes(authStore.userRole || ''),
);

const evaluationOverview = computed(() => {
  const evaluations = workProgram.value?.evaluations || [];
  const submitted = evaluations.filter((e) => e.status === 'SUBMITTED');
  const pool = submitted.length > 0 ? submitted : evaluations;
  const average = calculateAverageScore(pool.flatMap((e) => e.indicators || []));
  return {
    total: evaluations.length,
    submitted: submitted.length,
    draft: evaluations.length - submitted.length,
    average,
  };
});

const evaluationIndicatorColumns = [
  { title: 'No', key: 'index', width: 55, align: 'center' as const },
  { title: 'Indikator KPI/KPA', dataIndex: 'indicatorName', key: 'name' },
  { title: 'Target', dataIndex: 'target', key: 'target', width: 150 },
  {
    title: 'Realisasi',
    dataIndex: 'realisasi',
    key: 'realisasi',
    width: 150,
  },
  { title: 'Skor', key: 'score', width: 150, align: 'center' as const },
  { title: 'Catatan', dataIndex: 'notes', key: 'notes' },
];

function toHalfStar(score: number) {
  return Math.round(Number(score || 0) * 2) / 2;
}

function goToCreateEvaluation() {
  if (!workProgram.value) return;
  router.push({
    path: '/evaluations',
    query: { create: '1', workProgramId: workProgram.value.id },
  });
}

const latestProgressPct = computed(() => {
  const reports = workProgram.value?.progressReports;
  if (reports && reports.length > 0) {
    return reports[0].progressPct;
  }
  return workProgram.value?.status === 'COMPLETED' ? 100 : 0;
});

const statusOptions = (
  Object.keys(WORK_PROGRAM_STATUS_LABELS) as WorkProgramStatus[]
).map((status) => ({
  value: status,
  label: WORK_PROGRAM_STATUS_LABELS[status],
}));

const documentTypeColors: Record<string, string> = {
  KAK: 'blue',
  LPJ: 'green',
  SURAT: 'purple',
  TEMPLATE_KAK: 'geekblue',
  LAINNYA: 'default',
};

// Modal Edit Proker
const editModalVisible = ref(false);
const editSubmitting = ref(false);
const editFormRef = ref();
const editFormState = reactive<{
  name: string;
  description: string;
  picId: string | undefined;
  deadline: string;
  status: WorkProgramStatus;
}>({
  name: '',
  description: '',
  picId: undefined,
  deadline: '',
  status: 'NOT_STARTED',
});

const editFormRules: Record<string, Rule[]> = {
  name: [{ required: true, message: 'Nama program kerja wajib diisi' }],
  description: [{ required: true, message: 'Deskripsi wajib diisi' }],
  picId: [{ required: true, message: 'PIC wajib dipilih' }],
  deadline: [{ required: true, message: 'Deadline wajib diisi' }],
};

// Modal Tambah Laporan Progres (FR-22)
const progressModalVisible = ref(false);
const progressSubmitting = ref(false);
const progressFormRef = ref();
const progressFormState = reactive<{
  progressPct: number;
  description: string;
  obstacles: string;
}>({
  progressPct: 0,
  description: '',
  obstacles: '',
});

const progressFormRules: Record<string, Rule[]> = {
  progressPct: [
    { required: true, message: 'Persentase capaian wajib diisi' },
  ],
  description: [
    { required: true, message: 'Deskripsi progres kegiatan wajib diisi' },
  ],
};

// Modal Upload Dokumen Pendukung (FR-08 & Mitigasi UAT-22)
const docModalVisible = ref(false);
const docSubmitting = ref(false);
const docCategory = ref<'KAK' | 'LPJ' | 'SURAT' | 'LAINNYA'>('KAK');
const selectedDocFile = ref<File | null>(null);
const downloadingDocId = ref<string | null>(null);

const budgetItemColumns = [
  {
    title: 'No',
    key: 'index',
    width: 60,
    align: 'center' as const,
  },
  {
    title: 'Nama Item Anggaran',
    dataIndex: 'itemName',
    key: 'itemName',
  },
  {
    title: 'Kuantitas',
    dataIndex: 'quantity',
    key: 'quantity',
    width: 110,
    align: 'center' as const,
  },
  {
    title: 'Satuan',
    dataIndex: 'unit',
    key: 'unit',
    width: 120,
  },
  {
    title: 'Harga Satuan',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 170,
    align: 'right' as const,
  },
  {
    title: 'Total Harga',
    dataIndex: 'totalPrice',
    key: 'totalPrice',
    width: 180,
    align: 'right' as const,
  },
];

const progressColumns = [
  {
    title: 'Tanggal Submit',
    dataIndex: 'submittedAt',
    key: 'submittedAt',
    width: 165,
  },
  {
    title: 'Capaian (%)',
    dataIndex: 'progressPct',
    key: 'progressPct',
    width: 155,
  },
  {
    title: 'Deskripsi Progres Kegiatan',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Kendala di Lapangan',
    dataIndex: 'obstacles',
    key: 'obstacles',
  },
  {
    title: 'Pelapor',
    key: 'submitter',
    width: 170,
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 100,
    align: 'center' as const,
  },
];

const documentColumns = [
  {
    title: 'Nama File',
    dataIndex: 'fileName',
    key: 'fileName',
  },
  {
    title: 'Kategori',
    dataIndex: 'type',
    key: 'type',
    width: 130,
  },
  {
    title: 'Ukuran File',
    dataIndex: 'fileSize',
    key: 'fileSize',
    width: 130,
  },
  {
    title: 'Pengunggah',
    key: 'uploader',
    width: 175,
  },
  {
    title: 'Tanggal Unggah',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 185,
    align: 'center' as const,
  },
];

async function fetchDetail() {
  loading.value = true;
  try {
    const { data } = await api.get<WorkProgram>(
      `/work-programs/${workProgramId.value}`,
    );
    workProgram.value = data;
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memuat detail program kerja.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
    router.push('/work-programs');
  } finally {
    loading.value = false;
  }
}

async function fetchPicCandidates() {
  try {
    const { data } = await api.get<User[]>('/users/pic-candidates');
    picCandidates.value = data;
  } catch {
    // Abaikan jika gagal
  }
}

async function fetchTemplateKak() {
  try {
    const { data } = await api.get<DocumentItem | null>(
      '/documents/template-kak',
    );
    templateKak.value = data || null;
  } catch {
    templateKak.value = null;
  }
}

async function handleStatusChange(newStatus: WorkProgramStatus) {
  if (!workProgram.value) return;
  updatingStatus.value = true;
  try {
    await api.patch(`/work-programs/${workProgram.value.id}/status`, {
      status: newStatus,
    });
    workProgram.value.status = newStatus;
    message.success(
      `Status program kerja diperbarui menjadi ${WORK_PROGRAM_STATUS_LABELS[newStatus]}.`,
    );
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memperbarui status proker.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    updatingStatus.value = false;
  }
}

function openEditModal() {
  if (!workProgram.value) return;
  editFormState.name = workProgram.value.name;
  editFormState.description = workProgram.value.description;
  editFormState.picId = workProgram.value.picId;
  editFormState.deadline = workProgram.value.deadline
    ? new Date(workProgram.value.deadline).toISOString().slice(0, 10)
    : '';
  editFormState.status = workProgram.value.status;
  editModalVisible.value = true;
}

async function handleUpdateWorkProgram() {
  if (!workProgram.value) return;
  try {
    await editFormRef.value?.validate();
  } catch {
    return;
  }

  editSubmitting.value = true;
  try {
    await api.patch(`/work-programs/${workProgram.value.id}`, {
      name: editFormState.name.trim(),
      description: editFormState.description.trim(),
      picId: editFormState.picId,
      deadline: new Date(editFormState.deadline).toISOString(),
      status: editFormState.status,
    });
    message.success('Detail program kerja berhasil diperbarui.');
    editModalVisible.value = false;
    await fetchDetail();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memperbarui program kerja.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    editSubmitting.value = false;
  }
}

async function handleDeleteWorkProgram() {
  if (!workProgram.value) return;
  try {
    await api.delete(`/work-programs/${workProgram.value.id}`);
    message.success('Program kerja berhasil dihapus.');
    router.push('/work-programs');
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menghapus program kerja.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
}

// Fungsi Laporan Progres (FR-22)
function openProgressModal() {
  progressFormState.progressPct = latestProgressPct.value;
  progressFormState.description = '';
  progressFormState.obstacles = '';
  progressModalVisible.value = true;
}

async function handleSubmitProgress() {
  if (!workProgram.value) return;
  try {
    await progressFormRef.value?.validate();
  } catch {
    return;
  }

  progressSubmitting.value = true;
  try {
    await api.post(`/work-programs/${workProgram.value.id}/progress`, {
      progressPct: Number(progressFormState.progressPct),
      description: progressFormState.description.trim(),
      obstacles: progressFormState.obstacles.trim() || undefined,
    });
    message.success('Laporan progres kegiatan berhasil ditambahkan.');
    progressModalVisible.value = false;
    await fetchDetail();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menyimpan laporan progres.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    progressSubmitting.value = false;
  }
}

async function handleDeleteProgress(record: ProgressReportItem) {
  try {
    await api.delete(`/progress-reports/${record.id}`);
    message.success('Laporan progres berhasil dihapus.');
    await fetchDetail();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menghapus laporan progres.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
}

// Fungsi Dokumen Kegiatan (FR-08 & FR-21)
function openUploadDocModal() {
  docCategory.value = 'KAK';
  selectedDocFile.value = null;
  docModalVisible.value = true;
}

function onDocFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  if (!file) {
    selectedDocFile.value = null;
    return;
  }

  if (
    file.type !== 'application/pdf' &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    message.error('Hanya file berformat PDF (.pdf) yang diperbolehkan.');
    input.value = '';
    selectedDocFile.value = null;
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    message.error('Ukuran file maksimal adalah 10 MB.');
    input.value = '';
    selectedDocFile.value = null;
    return;
  }

  selectedDocFile.value = file;
}

async function handleUploadDocument() {
  if (!workProgram.value) return;
  if (!selectedDocFile.value) {
    message.warning('Silakan pilih file PDF dokumen terlebih dahulu.');
    return;
  }

  docSubmitting.value = true;
  try {
    const formData = new FormData();
    formData.append('file', selectedDocFile.value);
    formData.append('workProgramId', workProgram.value.id);
    formData.append('type', docCategory.value);

    await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    message.success('Dokumen PDF berhasil diunggah.');
    docModalVisible.value = false;
    await fetchDetail();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal mengunggah dokumen PDF.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    docSubmitting.value = false;
  }
}

async function handleDownloadDocument(doc: DocumentItem) {
  downloadingDocId.value = doc.id;
  try {
    const response = await api.get(`/documents/${doc.id}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', doc.fileName || 'Dokumen-SIMORAWA.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    message.error('Gagal mengunduh file dokumen PDF.');
  } finally {
    downloadingDocId.value = null;
  }
}

async function handleDeleteDocument(doc: DocumentItem) {
  try {
    await api.delete(`/documents/${doc.id}`);
    message.success(`Dokumen "${doc.fileName}" berhasil dihapus.`);
    await fetchDetail();
  } catch (err: any) {
    const msg = err?.response?.data?.message || 'Gagal menghapus dokumen.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
}

function formatCurrency(val: number | string | undefined) {
  const num = Number(val ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

onMounted(() => {
  fetchDetail();
  fetchPicCandidates();
  fetchTemplateKak();
});
</script>

<template>
  <div class="work-program-detail-page">
    <!-- Bar Navigasi Atas -->
    <div class="top-nav-bar">
      <a-button
        :icon="h(ArrowLeftOutlined)"
        @click="router.push('/work-programs')"
      >
        Kembali ke Daftar Proker
      </a-button>

      <a-space v-if="workProgram && canManageWorkProgram">
        <a-button
          type="primary"
          :icon="h(EditOutlined)"
          @click="openEditModal"
        >
          Edit Proker
        </a-button>

        <a-popconfirm
          title="Hapus program kerja ini beserta seluruh anggaran, dokumen, dan progres terkait?"
          ok-text="Ya, Hapus Permanen"
          cancel-text="Batal"
          :ok-button-props="{ danger: true }"
          @confirm="handleDeleteWorkProgram"
        >
          <a-button danger :icon="h(DeleteOutlined)">Hapus Proker</a-button>
        </a-popconfirm>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <template v-if="workProgram">
        <!-- Kartu Informasi Utama Proker -->
        <a-card class="info-card" :bordered="true">
          <div class="info-header">
            <div>
              <div class="info-badge-row">
                <a-tag
                  :color="WORK_PROGRAM_STATUS_COLORS[workProgram.status]"
                  class="status-badge"
                >
                  {{ WORK_PROGRAM_STATUS_LABELS[workProgram.status] }}
                </a-tag>
                <span class="created-meta">
                  Dibuat pada {{ formatDate(workProgram.createdAt) }}
                </span>
              </div>
              <h2 class="proker-title">{{ workProgram.name }}</h2>
            </div>

            <!-- Kontrol Update Status Real-time (FR-06) -->
            <div v-if="canUpdateStatus" class="status-control-box">
              <span class="status-control-label">Ubah Status Real-Time:</span>
              <a-select
                :value="workProgram.status"
                :loading="updatingStatus"
                style="width: 180px"
                :options="statusOptions"
                @change="handleStatusChange"
              />
            </div>
          </div>

          <p class="proker-description">{{ workProgram.description }}</p>

          <a-divider style="border-color: #dbe2ef; margin: 16px 0" />

          <a-row :gutter="[24, 16]">
            <a-col :xs="24" :sm="8">
              <div class="meta-item">
                <UserOutlined class="meta-icon" />
                <div>
                  <div class="meta-label">PIC Pelaksana</div>
                  <div class="meta-value">{{ workProgram.pic?.name }}</div>
                  <div class="meta-sub">{{ workProgram.pic?.email }}</div>
                </div>
              </div>
            </a-col>

            <a-col :xs="24" :sm="8">
              <div class="meta-item">
                <CalendarOutlined class="meta-icon" />
                <div>
                  <div class="meta-label">Tenggat Waktu (Deadline)</div>
                  <div class="meta-value">
                    {{ formatDate(workProgram.deadline) }}
                  </div>
                </div>
              </div>
            </a-col>

            <a-col :xs="24" :sm="8">
              <div class="meta-item">
                <WalletOutlined class="meta-icon" />
                <div>
                  <div class="meta-label">Total Pengajuan Anggaran</div>
                  <div class="meta-value">
                    {{
                      workProgram.budgets && workProgram.budgets.length > 0
                        ? formatCurrency(workProgram.budgets[0].totalAmount)
                        : 'Rp 0'
                    }}
                  </div>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>

        <!-- Tabs Detail Proker (Anggaran, Laporan Progres, Dokumen) -->
        <a-card class="tabs-card" :bordered="true">
          <a-tabs v-model:activeKey="activeTab">
            <!-- Tab 1: Rincian Anggaran -->
            <a-tab-pane key="budgets">
              <template #tab>
                <span>
                  <WalletOutlined />
                  Rincian Anggaran ({{ workProgram.budgets?.length || 0 }})
                </span>
              </template>

              <div class="tab-action-banner">
                <div>
                  <div class="fw-semibold">
                    Pengajuan &amp; Rincian Anggaran Program Kerja
                  </div>
                  <div class="text-muted">
                    Kelola rincian item anggaran kegiatan dan ajukan untuk
                    disetujui BPH / Bendahara (otomatis memotong Kas HIMA saat
                    APPROVED).
                  </div>
                </div>

                <a-space wrap>
                  <a-button
                    :icon="h(WalletOutlined)"
                    @click="router.push('/finance')"
                  >
                    Halaman Anggaran &amp; Kas
                  </a-button>
                  <a-button
                    v-if="canManageBudgetForProker"
                    type="primary"
                    :icon="h(PlusOutlined)"
                    @click="openCreateBudgetModal"
                  >
                    Tambah Pengajuan Anggaran
                  </a-button>
                </a-space>
              </div>

              <div
                v-if="workProgram.budgets && workProgram.budgets.length > 0"
                class="budgets-list"
              >
                <div
                  v-for="budget in workProgram.budgets"
                  :key="budget.id"
                  class="budget-block"
                >
                  <div class="budget-block-header">
                    <div>
                      <span class="fw-semibold budget-notes-pre">
                        {{ budget.notes || 'Rincian Anggaran Program Kerja' }}
                      </span>
                      <div class="budget-meta">
                        Diajukan pada {{ formatDate(budget.createdAt) }}
                        <template v-if="budget.submitter">
                          oleh <strong>{{ budget.submitter.name }}</strong>
                        </template>
                      </div>
                    </div>

                    <div class="budget-header-right">
                      <a-tag :color="BUDGET_STATUS_COLORS[budget.status]">
                        {{
                          budget.status === 'SUBMITTED'
                            ? 'Menunggu Approval (PENDING)'
                            : BUDGET_STATUS_LABELS[budget.status]
                        }}
                      </a-tag>
                      <span class="budget-total-amount">
                        Total: {{ formatCurrency(budget.totalAmount) }}
                      </span>

                      <a-space
                        v-if="
                          canManageBudgetForProker &&
                          ['DRAFT', 'REJECTED'].includes(budget.status)
                        "
                        :size="4"
                      >
                        <a-button
                          size="small"
                          :icon="h(EditOutlined)"
                          @click="openEditBudgetModal(budget)"
                        >
                          Edit
                        </a-button>
                        <a-popconfirm
                          title="Ajukan rincian anggaran ini untuk direview Bendahara/BPH?"
                          ok-text="Ya, Ajukan"
                          cancel-text="Batal"
                          @confirm="handleSubmitBudgetForApproval(budget)"
                        >
                          <a-button
                            type="primary"
                            size="small"
                            :loading="submittingBudgetId === budget.id"
                            :icon="h(SendOutlined)"
                          >
                            Ajukan Approval
                          </a-button>
                        </a-popconfirm>
                        <a-popconfirm
                          title="Hapus rincian anggaran ini?"
                          ok-text="Ya, Hapus"
                          cancel-text="Batal"
                          :ok-button-props="{ danger: true }"
                          @confirm="handleDeleteBudget(budget)"
                        >
                          <a-button
                            danger
                            size="small"
                            :icon="h(DeleteOutlined)"
                          />
                        </a-popconfirm>
                      </a-space>

                      <a-button
                        v-else-if="
                          canReviewBudget && budget.status === 'SUBMITTED'
                        "
                        type="primary"
                        size="small"
                        @click="router.push('/finance')"
                      >
                        Review &amp; Setujui di Keuangan
                      </a-button>
                    </div>
                  </div>

                  <a-table
                    :columns="budgetItemColumns"
                    :data-source="budget.items || []"
                    row-key="id"
                    :pagination="false"
                    size="small"
                    bordered
                  >
                    <template #bodyCell="{ column, record, index }">
                      <template v-if="column.key === 'index'">
                        {{ index + 1 }}
                      </template>
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
                </div>
              </div>

              <a-empty
                v-else
                description="Belum ada rincian anggaran yang tercatat untuk program kerja ini."
              />
            </a-tab-pane>

            <!-- Tab 2: Laporan Progres PIC (FR-22) -->
            <a-tab-pane key="progress">
              <template #tab>
                <span>
                  <LineChartOutlined />
                  Laporan Progres ({{
                    workProgram.progressReports?.length || 0
                  }})
                </span>
              </template>

              <!-- Bar Ringkasan Capaian Terbaru & Tombol Tambah Progres -->
              <div class="tab-action-banner">
                <div class="progress-overview-box">
                  <div class="progress-overview-label">
                    Capaian Pelaksanaan Saat Ini:
                    <strong>{{ latestProgressPct }}%</strong>
                  </div>
                  <a-progress
                    :percent="latestProgressPct"
                    stroke-color="#3F72AF"
                    style="max-width: 420px; margin-bottom: 0"
                  />
                </div>

                <a-button
                  v-if="canSubmitProgress"
                  type="primary"
                  :icon="h(PlusOutlined)"
                  @click="openProgressModal"
                >
                  Tambah Laporan Progres
                </a-button>
              </div>

              <a-table
                :columns="progressColumns"
                :data-source="workProgram.progressReports || []"
                row-key="id"
                :pagination="{ pageSize: 5 }"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'submittedAt'">
                    {{ formatDate(record.submittedAt) }}
                  </template>
                  <template v-else-if="column.key === 'progressPct'">
                    <a-progress
                      :percent="record.progressPct"
                      size="small"
                      stroke-color="#3F72AF"
                    />
                  </template>
                  <template v-else-if="column.key === 'obstacles'">
                    <span v-if="record.obstacles">{{ record.obstacles }}</span>
                    <span v-else class="text-muted">Tidak ada kendala</span>
                  </template>
                  <template v-else-if="column.key === 'submitter'">
                    <div class="fw-semibold">
                      {{ record.submitter?.name || '-' }}
                    </div>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-popconfirm
                      v-if="canSubmitProgress"
                      title="Hapus item laporan progres ini?"
                      ok-text="Ya, Hapus"
                      cancel-text="Batal"
                      :ok-button-props="{ danger: true }"
                      @confirm="handleDeleteProgress(record as ProgressReportItem)"
                    >
                      <a-button
                        type="link"
                        danger
                        size="small"
                        :icon="h(DeleteOutlined)"
                      >
                        Hapus
                      </a-button>
                    </a-popconfirm>
                    <span v-else>-</span>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Tab 3: Dokumen Kegiatan (FR-08 & FR-21) -->
            <a-tab-pane key="documents">
              <template #tab>
                <span>
                  <FilePdfOutlined />
                  Dokumen Kegiatan ({{ workProgram.documents?.length || 0 }})
                </span>
              </template>

              <div class="tab-action-banner">
                <div>
                  <div class="fw-semibold">
                    Arsip Berkas Pendukung Program Kerja (PDF)
                  </div>
                  <div class="text-muted">
                    Unggah dokumen KAK, LPJ, Surat, atau berkas pendukung lainnya
                    (Format PDF, maks. 10 MB).
                  </div>
                </div>

                <a-space wrap>
                  <a-button
                    v-if="templateKak"
                    :loading="downloadingDocId === templateKak.id"
                    :icon="h(DownloadOutlined)"
                    @click="handleDownloadDocument(templateKak)"
                  >
                    Unduh Template KAK Standar
                  </a-button>

                  <a-button
                    v-if="canManageDocuments"
                    type="primary"
                    :icon="h(UploadOutlined)"
                    @click="openUploadDocModal"
                  >
                    Unggah Dokumen (PDF)
                  </a-button>
                </a-space>
              </div>

              <a-table
                :columns="documentColumns"
                :data-source="workProgram.documents || []"
                row-key="id"
                :pagination="{ pageSize: 5 }"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'fileName'">
                    <div class="doc-name-cell">
                      <FilePdfOutlined style="color: #dc2626" />
                      <span class="fw-semibold">{{ record.fileName }}</span>
                    </div>
                  </template>
                  <template v-else-if="column.key === 'type'">
                    <a-tag :color="documentTypeColors[record.type] || 'blue'">
                      {{ record.type }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'fileSize'">
                    {{ formatFileSize(record.fileSize) }}
                  </template>
                  <template v-else-if="column.key === 'uploader'">
                    {{ record.uploader?.name || '-' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDate(record.createdAt) }}
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a-button
                        type="link"
                        size="small"
                        :loading="downloadingDocId === record.id"
                        :icon="h(DownloadOutlined)"
                        @click="handleDownloadDocument(record as DocumentItem)"
                      >
                        Unduh
                      </a-button>

                      <a-popconfirm
                        v-if="canManageDocuments"
                        title="Hapus dokumen PDF ini?"
                        ok-text="Ya, Hapus"
                        cancel-text="Batal"
                        :ok-button-props="{ danger: true }"
                        @confirm="handleDeleteDocument(record as DocumentItem)"
                      >
                        <a-button
                          type="link"
                          danger
                          size="small"
                          :icon="h(DeleteOutlined)"
                        >
                          Hapus
                        </a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Tab 4: Evaluasi KPI/KPA (FR-09 s/d FR-12) -->
            <a-tab-pane key="evaluations">
              <template #tab>
                <span>
                  <StarOutlined />
                  Evaluasi KPI/KPA ({{ workProgram.evaluations?.length || 0 }})
                </span>
              </template>

              <div class="tab-action-banner">
                <div class="evaluation-overview">
                  <div class="progress-overview-label">
                    Rata-rata Skor KPI/KPA Proker:
                    <strong>{{ evaluationOverview.average.toFixed(2) }} / 5</strong>
                  </div>
                  <div class="evaluation-overview-row">
                    <a-rate
                      :value="toHalfStar(evaluationOverview.average)"
                      :count="5"
                      allow-half
                      disabled
                    />
                    <span class="text-muted">
                      {{ evaluationOverview.total }} evaluasi ·
                      {{ evaluationOverview.submitted }} submitted ·
                      {{ evaluationOverview.draft }} draft
                    </span>
                  </div>
                </div>

                <a-space wrap>
                  <a-button
                    v-if="canViewEvaluationDashboard"
                    :icon="h(BarChartOutlined)"
                    @click="router.push('/evaluations')"
                  >
                    Dashboard Evaluasi
                  </a-button>
                  <a-button
                    v-if="canManageEvaluation"
                    type="primary"
                    :icon="h(PlusOutlined)"
                    @click="goToCreateEvaluation"
                  >
                    Buat Evaluasi KPI/KPA
                  </a-button>
                </a-space>
              </div>

              <div
                v-if="
                  workProgram.evaluations && workProgram.evaluations.length > 0
                "
                class="budgets-list"
              >
                <div
                  v-for="evaluation in workProgram.evaluations"
                  :key="evaluation.id"
                  class="budget-block"
                >
                  <div class="budget-block-header">
                    <div>
                      <span class="fw-semibold">
                        Evaluasi KPI/KPA ·
                        {{ evaluation.indicators?.length || 0 }} indikator
                      </span>
                      <div class="budget-meta">
                        Dibuat pada {{ formatDate(evaluation.createdAt) }}
                        <template v-if="evaluation.evaluator">
                          oleh
                          <strong>{{ evaluation.evaluator.name }}</strong>
                          ({{ ROLE_LABELS[evaluation.evaluator.role] }})
                        </template>
                      </div>
                    </div>

                    <div class="budget-header-right">
                      <a-tag :color="EVALUATION_STATUS_COLORS[evaluation.status]">
                        {{ EVALUATION_STATUS_LABELS[evaluation.status] }}
                      </a-tag>
                      <a-rate
                        :value="
                          toHalfStar(calculateAverageScore(evaluation.indicators))
                        "
                        :count="5"
                        allow-half
                        disabled
                        class="small-rate"
                      />
                      <span class="budget-total-amount">
                        {{
                          calculateAverageScore(evaluation.indicators).toFixed(2)
                        }}
                        / 5
                      </span>
                    </div>
                  </div>

                  <a-table
                    :columns="evaluationIndicatorColumns"
                    :data-source="evaluation.indicators || []"
                    row-key="id"
                    :pagination="false"
                    size="small"
                    bordered
                  >
                    <template #bodyCell="{ column, record, index }">
                      <template v-if="column.key === 'index'">
                        {{ index + 1 }}
                      </template>
                      <template v-else-if="column.key === 'score'">
                        <a-rate
                          :value="record.score"
                          :count="5"
                          disabled
                          class="small-rate"
                        />
                      </template>
                      <template v-else-if="column.key === 'notes'">
                        <span v-if="record.notes">{{ record.notes }}</span>
                        <span v-else class="text-muted">-</span>
                      </template>
                    </template>
                  </a-table>

                  <a-row :gutter="16" style="margin-top: 12px">
                    <a-col :xs="24" :md="12">
                      <div class="evaluation-note-box">
                        <div class="fw-semibold">Kesimpulan</div>
                        <div class="evaluation-note-text">
                          {{ evaluation.kesimpulan || 'Belum diisi.' }}
                        </div>
                      </div>
                    </a-col>
                    <a-col :xs="24" :md="12">
                      <div class="evaluation-note-box">
                        <div class="fw-semibold">Rekomendasi</div>
                        <div class="evaluation-note-text">
                          {{ evaluation.rekomendasi || 'Belum diisi.' }}
                        </div>
                      </div>
                    </a-col>
                  </a-row>
                </div>
              </div>

              <a-empty
                v-else
                description="Belum ada evaluasi KPI/KPA untuk program kerja ini."
              />
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>

    <!-- Modal Tambah Laporan Progres (FR-22) -->
    <a-modal
      v-model:open="progressModalVisible"
      title="Tambah Laporan Progres Kegiatan"
      :confirm-loading="progressSubmitting"
      ok-text="Simpan Progres"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleSubmitProgress"
    >
      <a-form
        ref="progressFormRef"
        layout="vertical"
        :model="progressFormState"
        :rules="progressFormRules"
        style="margin-top: 12px"
      >
        <a-form-item
          label="Persentase Capaian Kegiatan (0% - 100%)"
          name="progressPct"
        >
          <a-row :gutter="16" align="middle">
            <a-col :span="17">
              <a-slider
                v-model:value="progressFormState.progressPct"
                :min="0"
                :max="100"
              />
            </a-col>
            <a-col :span="7">
              <a-input-number
                v-model:value="progressFormState.progressPct"
                :min="0"
                :max="100"
                addon-after="%"
                style="width: 100%"
              />
            </a-col>
          </a-row>
        </a-form-item>

        <a-form-item label="Deskripsi Progres Kegiatan" name="description">
          <a-textarea
            v-model:value="progressFormState.description"
            :rows="4"
            placeholder="Jelaskan tahapan kegiatan yang sudah terlaksana..."
          />
        </a-form-item>

        <a-form-item
          label="Kendala di Lapangan (Opsional)"
          name="obstacles"
        >
          <a-textarea
            v-model:value="progressFormState.obstacles"
            :rows="3"
            placeholder="Tuliskan kendala atau hambatan teknis jika ada (kosongkan jika lancar)..."
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Modal Unggah Dokumen Pendukung (FR-08 & Mitigasi UAT-22) -->
    <a-modal
      v-model:open="docModalVisible"
      title="Unggah Dokumen Pendukung (PDF)"
      :confirm-loading="docSubmitting"
      ok-text="Unggah Dokumen"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleUploadDocument"
    >
      <a-form layout="vertical" style="margin-top: 12px">
        <a-form-item label="Kategori Dokumen" required>
          <a-select v-model:value="docCategory">
            <a-select-option value="KAK">
              KAK (Kerangka Acuan Kegiatan)
            </a-select-option>
            <a-select-option value="LPJ">
              LPJ (Laporan Pertanggungjawaban)
            </a-select-option>
            <a-select-option value="SURAT">
              SURAT (Surat Menyurat / Perizinan)
            </a-select-option>
            <a-select-option value="LAINNYA">
              LAINNYA (Dokumen Pendukung Lain)
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item
          label="Pilih File PDF (Maksimal 10 MB)"
          required
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            class="file-input-control"
            @change="onDocFileChange"
          />
        </a-form-item>

        <div v-if="selectedDocFile" class="selected-file-preview">
          <FilePdfOutlined style="color: #dc2626" />
          <span>
            <strong>{{ selectedDocFile.name }}</strong> ({{
              formatFileSize(selectedDocFile.size)
            }})
          </span>
        </div>
      </a-form>
    </a-modal>

    <!-- Modal Edit Proker -->
    <a-modal
      v-model:open="editModalVisible"
      title="Edit Detail Program Kerja"
      :confirm-loading="editSubmitting"
      ok-text="Simpan Perubahan"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleUpdateWorkProgram"
    >
      <a-form
        ref="editFormRef"
        layout="vertical"
        :model="editFormState"
        :rules="editFormRules"
        style="margin-top: 12px"
      >
        <a-form-item label="Nama Program Kerja" name="name">
          <a-input v-model:value="editFormState.name" />
        </a-form-item>

        <a-form-item label="Deskripsi Kegiatan" name="description">
          <a-textarea v-model:value="editFormState.description" :rows="3" />
        </a-form-item>

        <a-form-item label="Penanggung Jawab (PIC)" name="picId">
          <a-select
            v-model:value="editFormState.picId"
            show-search
            option-filter-prop="label"
            :options="
              picCandidates.map((u) => ({
                value: u.id,
                label: `${u.name} (${ROLE_LABELS[u.role]})`,
              }))
            "
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Tenggat Waktu (Deadline)" name="deadline">
              <a-input v-model:value="editFormState.deadline" type="date" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Status" name="status">
              <a-select
                v-model:value="editFormState.status"
                :options="statusOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <!-- Modal Buat / Edit Rincian Anggaran Proker -->
    <BudgetFormModal
      v-if="workProgram"
      v-model:open="budgetModalVisible"
      :budget="editingBudget"
      :fixed-work-program-id="workProgram.id"
      :fixed-work-program-name="workProgram.name"
      @saved="fetchDetail"
    />
  </div>
</template>

<style scoped>
.work-program-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.info-card,
.tabs-card {
  border-color: #dbe2ef;
  border-radius: 10px;
}

.info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.info-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.status-badge {
  font-weight: 600;
}

.created-meta {
  font-size: 12.5px;
  color: #52616b;
}

.proker-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #112d4e;
}

.status-control-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  padding: 8px 14px;
  border-radius: 8px;
}

.status-control-label {
  font-size: 13px;
  font-weight: 600;
  color: #112d4e;
}

.proker-description {
  margin: 14px 0 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #2d3748;
  white-space: pre-line;
}

.meta-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.meta-icon {
  font-size: 20px;
  color: #3f72af;
  margin-top: 2px;
}

.meta-label {
  font-size: 12px;
  color: #52616b;
}

.meta-value {
  font-size: 14.5px;
  font-weight: 700;
  color: #112d4e;
}

.meta-sub {
  font-size: 12px;
  color: #52616b;
}

.tab-action-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.progress-overview-box {
  flex: 1;
  min-width: 240px;
}

.progress-overview-label {
  font-size: 13.5px;
  color: #112d4e;
  margin-bottom: 6px;
}

.doc-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-input-control {
  width: 100%;
  padding: 8px;
  border: 1px dashed #3f72af;
  border-radius: 6px;
  background-color: #f9f7f7;
}

.selected-file-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 6px;
  font-size: 13px;
}

.budgets-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.budget-block {
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 16px;
  background-color: #ffffff;
}

.budget-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.budget-meta {
  font-size: 12px;
  color: #52616b;
}

.budget-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.budget-total-amount {
  font-size: 15px;
  font-weight: 700;
  color: #112d4e;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.evaluation-overview {
  flex: 1;
  min-width: 240px;
}

.evaluation-overview-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.small-rate {
  font-size: 14px;
}

.evaluation-note-box {
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 10px 14px;
  height: 100%;
  background-color: #f9f7f7;
}

.evaluation-note-text {
  margin-top: 4px;
  color: #2d3748;
  white-space: pre-line;
  line-height: 1.6;
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
</style>

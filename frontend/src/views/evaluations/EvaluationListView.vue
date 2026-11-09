<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  FormOutlined,
  StarOutlined,
  SaveOutlined,
  SendOutlined,
  MinusCircleOutlined,
  FilePdfOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import {
  EVALUATION_STATUS_COLORS,
  EVALUATION_STATUS_LABELS,
  WORK_PROGRAM_STATUS_LABELS,
  calculateAverageScore,
  type EvaluationItem,
  type EvaluationStatus,
  type EvaluationSummary,
  type WorkProgram,
} from '@/types/work-program';

interface IndicatorFormRow {
  uid: string;
  indicatorName: string;
  target: string;
  realisasi: string;
  score: number;
  notes: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// RBAC: hanya KADIV, BPH, ADMIN yang dapat membuat/mengubah evaluasi
const canManageEvaluation = computed(() =>
  ['KADIV', 'BPH', 'ADMIN'].includes(authStore.userRole || ''),
);
// Hapus evaluasi mengikuti backend: KADIV & ADMIN
const canDeleteEvaluation = computed(() =>
  ['KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);
const exportingPdf = ref(false);

async function handleExportEvaluationsPdf() {
  exportingPdf.value = true;
  try {
    const response = await api.get('/evaluations/export/pdf', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute(
      'download',
      `Laporan-Evaluasi-KPI-KPA-HIMA-${dateStamp}.pdf`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    message.success('Laporan PDF Evaluasi KPI/KPA berhasil diunduh.');
  } catch (err: any) {
    showError(err, 'Gagal mengunduh laporan PDF evaluasi.');
  } finally {
    exportingPdf.value = false;
  }
}

// ===================== Data Dashboard & Tabel =====================
const evaluations = ref<EvaluationItem[]>([]);
const summary = ref<EvaluationSummary>({
  totalEvaluations: 0,
  submittedCount: 0,
  draftCount: 0,
  averageScore: 0,
});
const loadingTable = ref(false);
const loadingSummary = ref(false);

const filters = reactive<{
  search: string;
  status: EvaluationStatus | undefined;
}>({
  search: '',
  status: undefined,
});

const statusFilterOptions = (
  Object.keys(EVALUATION_STATUS_LABELS) as EvaluationStatus[]
).map((status) => ({
  value: status,
  label: EVALUATION_STATUS_LABELS[status],
}));

const columns = [
  { title: 'No', key: 'index', width: 60, align: 'center' as const },
  { title: 'Program Kerja', key: 'workProgram' },
  {
    title: 'Indikator',
    key: 'indicatorCount',
    width: 100,
    align: 'center' as const,
  },
  { title: 'Rata-rata Skor', key: 'avgScore', width: 210 },
  { title: 'Status', key: 'status', width: 120, align: 'center' as const },
  { title: 'Evaluator', key: 'evaluator', width: 170 },
  { title: 'Terakhir Diperbarui', key: 'updatedAt', width: 165 },
  { title: 'Aksi', key: 'actions', width: 220, align: 'center' as const },
];

async function fetchSummary() {
  loadingSummary.value = true;
  try {
    const { data } = await api.get<EvaluationSummary>('/evaluations/summary');
    summary.value = data;
  } catch (err: any) {
    showError(err, 'Gagal memuat statistik evaluasi.');
  } finally {
    loadingSummary.value = false;
  }
}

async function fetchEvaluations() {
  loadingTable.value = true;
  try {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.search.trim()) params.search = filters.search.trim();

    const { data } = await api.get<EvaluationItem[]>('/evaluations', {
      params,
    });
    evaluations.value = data;
  } catch (err: any) {
    showError(err, 'Gagal memuat riwayat evaluasi.');
  } finally {
    loadingTable.value = false;
  }
}

function refreshAll() {
  fetchSummary();
  fetchEvaluations();
}

function resetFilters() {
  filters.search = '';
  filters.status = undefined;
  fetchEvaluations();
}

// Debounce pencarian nama proker
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => filters.search,
  () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchEvaluations(), 400);
  },
);

watch(
  () => filters.status,
  () => fetchEvaluations(),
);

function getRowClassName(_record: unknown, index: number) {
  return index % 2 === 1 ? 'striped-row' : '';
}

// ===================== Modal Detail Evaluasi =====================
const detailVisible = ref(false);
const selectedEvaluation = ref<EvaluationItem | null>(null);

const indicatorDetailColumns = [
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

function openDetail(record: EvaluationItem) {
  selectedEvaluation.value = record;
  detailVisible.value = true;
}

// ===================== Modal Form Evaluasi Dinamis =====================
const formVisible = ref(false);
const formSubmitting = ref<EvaluationStatus | null>(null);
const editingId = ref<string | null>(null);
const formRef = ref();
const workProgramOptions = ref<WorkProgram[]>([]);
const loadingWorkPrograms = ref(false);

let uidCounter = 0;
function createIndicatorRow(
  partial?: Partial<Omit<IndicatorFormRow, 'uid'>>,
): IndicatorFormRow {
  uidCounter += 1;
  return {
    uid: `ind-${Date.now()}-${uidCounter}`,
    indicatorName: partial?.indicatorName ?? '',
    target: partial?.target ?? '',
    realisasi: partial?.realisasi ?? '',
    score: partial?.score ?? 0,
    notes: partial?.notes ?? '',
  };
}

const formState = reactive<{
  workProgramId: string | undefined;
  kesimpulan: string;
  rekomendasi: string;
  indicators: IndicatorFormRow[];
}>({
  workProgramId: undefined,
  kesimpulan: '',
  rekomendasi: '',
  indicators: [createIndicatorRow()],
});

const formTitle = computed(() =>
  editingId.value
    ? 'Edit Evaluasi KPI/KPA Program Kerja'
    : 'Form Evaluasi KPI/KPA Program Kerja',
);

// Live preview rata-rata skor (hanya indikator yang sudah diberi bintang)
const scoredIndicators = computed(() =>
  formState.indicators.filter((ind) => Number(ind.score) > 0),
);
const livePreviewAverage = computed(() =>
  calculateAverageScore(scoredIndicators.value),
);

const workProgramSelectOptions = computed(() =>
  workProgramOptions.value.map((wp) => ({
    value: wp.id,
    label: `${wp.name} — ${WORK_PROGRAM_STATUS_LABELS[wp.status]}`,
  })),
);

const requiredText = (label: string) => [
  {
    required: true,
    whitespace: true,
    message: `${label} wajib diisi`,
    trigger: 'blur',
  },
];

const scoreRules = [
  {
    validator: (_rule: unknown, value: number) =>
      Number(value) >= 1 && Number(value) <= 5
        ? Promise.resolve()
        : Promise.reject(new Error('Beri skor 1 sampai 5 bintang')),
    trigger: 'change',
  },
];

async function fetchWorkProgramOptions() {
  if (workProgramOptions.value.length > 0) return;
  loadingWorkPrograms.value = true;
  try {
    const { data } = await api.get<WorkProgram[]>('/work-programs');
    workProgramOptions.value = data;
  } catch (err: any) {
    showError(err, 'Gagal memuat daftar program kerja.');
  } finally {
    loadingWorkPrograms.value = false;
  }
}

function resetForm() {
  editingId.value = null;
  formState.workProgramId = undefined;
  formState.kesimpulan = '';
  formState.rekomendasi = '';
  formState.indicators = [createIndicatorRow()];
}

function openCreateModal(prefillWorkProgramId?: string) {
  resetForm();
  if (prefillWorkProgramId) formState.workProgramId = prefillWorkProgramId;
  fetchWorkProgramOptions();
  formVisible.value = true;
}

function openEditModal(record: EvaluationItem) {
  resetForm();
  editingId.value = record.id;
  formState.workProgramId = record.workProgramId;
  formState.kesimpulan = record.kesimpulan || '';
  formState.rekomendasi = record.rekomendasi || '';
  formState.indicators =
    record.indicators && record.indicators.length > 0
      ? record.indicators.map((ind) =>
          createIndicatorRow({
            indicatorName: ind.indicatorName,
            target: ind.target,
            realisasi: ind.realisasi,
            score: Number(ind.score),
            notes: ind.notes || '',
          }),
        )
      : [createIndicatorRow()];
  fetchWorkProgramOptions();
  formVisible.value = true;
}

function addIndicatorRow() {
  formState.indicators.push(createIndicatorRow());
}

function removeIndicatorRow(uid: string) {
  if (formState.indicators.length <= 1) {
    message.warning('Minimal harus terdapat 1 indikator penilaian KPI/KPA.');
    return;
  }
  formState.indicators = formState.indicators.filter((ind) => ind.uid !== uid);
}

async function handleSaveEvaluation(status: EvaluationStatus) {
  try {
    await formRef.value?.validate();
  } catch {
    message.warning('Lengkapi seluruh isian form evaluasi terlebih dahulu.');
    return;
  }

  if (
    status === 'SUBMITTED' &&
    (!formState.kesimpulan.trim() || !formState.rekomendasi.trim())
  ) {
    message.warning(
      'Kesimpulan dan Rekomendasi wajib diisi sebelum evaluasi dikirim (SUBMITTED).',
    );
    return;
  }

  const payload = {
    workProgramId: formState.workProgramId,
    status,
    kesimpulan: formState.kesimpulan.trim(),
    rekomendasi: formState.rekomendasi.trim(),
    indicators: formState.indicators.map((ind) => ({
      indicatorName: ind.indicatorName.trim(),
      target: ind.target.trim(),
      realisasi: ind.realisasi.trim(),
      score: Number(ind.score),
      notes: ind.notes.trim() || undefined,
    })),
  };

  formSubmitting.value = status;
  try {
    if (editingId.value) {
      await api.patch(`/evaluations/${editingId.value}`, payload);
    } else {
      await api.post('/evaluations', payload);
    }
    message.success(
      status === 'SUBMITTED'
        ? 'Evaluasi KPI/KPA berhasil dikirim (SUBMITTED).'
        : 'Evaluasi KPI/KPA berhasil disimpan sebagai DRAFT.',
    );
    formVisible.value = false;
    refreshAll();
  } catch (err: any) {
    showError(err, 'Gagal menyimpan evaluasi KPI/KPA.');
  } finally {
    formSubmitting.value = null;
  }
}

async function handleDeleteEvaluation(record: EvaluationItem) {
  try {
    await api.delete(`/evaluations/${record.id}`);
    message.success('Data evaluasi berhasil dihapus.');
    refreshAll();
  } catch (err: any) {
    showError(err, 'Gagal menghapus data evaluasi.');
  }
}

// ===================== Helper =====================
function showError(err: any, fallback: string) {
  const msg = err?.response?.data?.message || fallback;
  message.error(Array.isArray(msg) ? msg.join(', ') : msg);
}

function getAverage(record: EvaluationItem) {
  return typeof record.avgScore === 'number'
    ? record.avgScore
    : calculateAverageScore(record.indicators);
}

function toHalfStar(score: number) {
  return Math.round(Number(score || 0) * 2) / 2;
}

function scoreColor(score: number) {
  if (score >= 4) return '#16a34a';
  if (score >= 3) return '#3f72af';
  if (score > 0) return '#d97706';
  return '#8c98a4';
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

onMounted(() => {
  refreshAll();

  // Dukungan pintasan dari halaman Detail Proker: /evaluations?create=1&workProgramId=xxx
  const prefillId = route.query.workProgramId as string | undefined;
  if (route.query.create === '1' && canManageEvaluation.value) {
    openCreateModal(prefillId);
    router.replace({ path: '/evaluations' });
  }
});
</script>

<template>
  <div class="evaluation-page">
    <!-- Header Halaman -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Evaluasi KPI/KPA Program Kerja</h2>
        <p class="page-subtitle">
          Dashboard evaluasi terpusat untuk memantau capaian indikator kinerja
          seluruh program kerja.
        </p>
      </div>
      <a-space wrap>
        <a-button :icon="h(ReloadOutlined)" @click="refreshAll">
          Muat Ulang
        </a-button>
        <a-button
          :icon="h(FilePdfOutlined)"
          :loading="exportingPdf"
          class="btn-export-pdf"
          @click="handleExportEvaluationsPdf"
        >
          Cetak / Export Laporan Evaluasi (PDF)
        </a-button>
        <a-button
          v-if="canManageEvaluation"
          type="primary"
          :icon="h(PlusOutlined)"
          @click="openCreateModal()"
        >
          Buat Evaluasi Baru
        </a-button>
      </a-space>
    </div>

    <!-- 4 Kartu Statistik -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingSummary">
          <div class="stat-body">
            <div class="stat-icon stat-icon-navy">
              <FileDoneOutlined />
            </div>
            <div>
              <div class="stat-label">Total Evaluasi</div>
              <div class="stat-value">{{ summary.totalEvaluations }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingSummary">
          <div class="stat-body">
            <div class="stat-icon stat-icon-green">
              <CheckCircleOutlined />
            </div>
            <div>
              <div class="stat-label">Submitted</div>
              <div class="stat-value">{{ summary.submittedCount }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingSummary">
          <div class="stat-body">
            <div class="stat-icon stat-icon-gray">
              <FormOutlined />
            </div>
            <div>
              <div class="stat-label">Draft</div>
              <div class="stat-value">{{ summary.draftCount }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="stat-card" :loading="loadingSummary">
          <div class="stat-body">
            <div class="stat-icon stat-icon-gold">
              <StarOutlined />
            </div>
            <div>
              <div class="stat-label">Rata-rata Skor KPI/KPA</div>
              <div class="stat-value">
                {{ summary.averageScore.toFixed(2) }}
                <span class="stat-suffix">/ 5</span>
              </div>
              <a-rate
                :value="toHalfStar(summary.averageScore)"
                :count="5"
                allow-half
                disabled
                class="stat-rate"
              />
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filter & Tabel Riwayat Evaluasi -->
    <a-card class="table-card">
      <div class="filter-bar">
        <a-input-search
          v-model:value="filters.search"
          placeholder="Cari nama program kerja..."
          allow-clear
          style="width: 300px"
          @search="fetchEvaluations"
        />
        <a-select
          v-model:value="filters.status"
          placeholder="Semua Status"
          allow-clear
          style="width: 180px"
          :options="statusFilterOptions"
        />
        <a-button @click="resetFilters">Reset Filter</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="evaluations"
        :loading="loadingTable"
        row-key="id"
        :row-class-name="getRowClassName"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        :scroll="{ x: 1100 }"
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
                  `/work-programs/${record.workProgramId}?tab=evaluations`,
                )
              "
            >
              {{ record.workProgram?.name || '-' }}
            </a>
            <div class="text-muted">
              PIC: {{ record.workProgram?.pic?.name || '-' }}
            </div>
          </template>

          <template v-else-if="column.key === 'indicatorCount'">
            <a-tag color="blue">{{ record.indicators?.length || 0 }}</a-tag>
          </template>

          <template v-else-if="column.key === 'avgScore'">
            <div class="score-cell">
              <a-rate
                :value="toHalfStar(getAverage(record as EvaluationItem))"
                :count="5"
                allow-half
                disabled
                class="table-rate"
              />
              <span
                class="score-number"
                :style="{ color: scoreColor(getAverage(record as EvaluationItem)) }"
              >
                {{ getAverage(record as EvaluationItem).toFixed(2) }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag
              :color="EVALUATION_STATUS_COLORS[record.status as EvaluationStatus]"
            >
              {{ EVALUATION_STATUS_LABELS[record.status as EvaluationStatus] }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'evaluator'">
            <div class="fw-semibold">{{ record.evaluator?.name || '-' }}</div>
            <div class="text-muted">{{ record.evaluator?.role || '' }}</div>
          </template>

          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDate(record.updatedAt) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space :size="2">
              <a-button
                type="link"
                size="small"
                :icon="h(EyeOutlined)"
                @click="openDetail(record as EvaluationItem)"
              >
                Detail
              </a-button>
              <a-button
                v-if="canManageEvaluation"
                type="link"
                size="small"
                :icon="h(EditOutlined)"
                @click="openEditModal(record as EvaluationItem)"
              >
                Edit
              </a-button>
              <a-popconfirm
                v-if="canDeleteEvaluation"
                title="Hapus data evaluasi ini beserta seluruh indikatornya?"
                ok-text="Ya, Hapus"
                cancel-text="Batal"
                :ok-button-props="{ danger: true }"
                @confirm="handleDeleteEvaluation(record as EvaluationItem)"
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

        <template #emptyText>
          <a-empty description="Belum ada data evaluasi KPI/KPA." />
        </template>
      </a-table>
    </a-card>

    <!-- Modal Detail Evaluasi -->
    <a-modal
      v-model:open="detailVisible"
      title="Detail Hasil Evaluasi KPI/KPA"
      :footer="null"
      width="960px"
      destroy-on-close
    >
      <template v-if="selectedEvaluation">
        <div class="detail-header">
          <div>
            <div class="detail-proker">
              {{ selectedEvaluation.workProgram?.name || '-' }}
            </div>
            <div class="text-muted">
              Dievaluasi oleh
              <strong>{{ selectedEvaluation.evaluator?.name || '-' }}</strong>
              · Diperbarui {{ formatDate(selectedEvaluation.updatedAt) }}
            </div>
          </div>
          <div class="detail-score-box">
            <a-tag :color="EVALUATION_STATUS_COLORS[selectedEvaluation.status]">
              {{ EVALUATION_STATUS_LABELS[selectedEvaluation.status] }}
            </a-tag>
            <a-rate
              :value="toHalfStar(getAverage(selectedEvaluation))"
              :count="5"
              allow-half
              disabled
            />
            <span
              class="score-number"
              :style="{ color: scoreColor(getAverage(selectedEvaluation)) }"
            >
              {{ getAverage(selectedEvaluation).toFixed(2) }} / 5
            </span>
          </div>
        </div>

        <a-table
          :columns="indicatorDetailColumns"
          :data-source="selectedEvaluation.indicators || []"
          row-key="id"
          :pagination="false"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'score'">
              <a-rate
                :value="record.score"
                :count="5"
                disabled
                class="table-rate"
              />
            </template>
            <template v-else-if="column.key === 'notes'">
              <span v-if="record.notes">{{ record.notes }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </template>
        </a-table>

        <a-row :gutter="16" style="margin-top: 16px">
          <a-col :xs="24" :md="12">
            <div class="conclusion-box">
              <div class="conclusion-title">Kesimpulan</div>
              <div class="conclusion-text">
                {{ selectedEvaluation.kesimpulan || 'Belum diisi.' }}
              </div>
            </div>
          </a-col>
          <a-col :xs="24" :md="12">
            <div class="conclusion-box">
              <div class="conclusion-title">Rekomendasi</div>
              <div class="conclusion-text">
                {{ selectedEvaluation.rekomendasi || 'Belum diisi.' }}
              </div>
            </div>
          </a-col>
        </a-row>
      </template>
    </a-modal>

    <!-- Modal Form Evaluasi KPI/KPA Dinamis (KADIV, BPH, ADMIN) -->
    <a-modal
      v-model:open="formVisible"
      :title="formTitle"
      width="1040px"
      :mask-closable="false"
      destroy-on-close
    >
      <a-form
        ref="formRef"
        layout="vertical"
        :model="formState"
        style="margin-top: 12px"
      >
        <a-form-item
          label="Program Kerja yang Dievaluasi"
          name="workProgramId"
          :rules="[{ required: true, message: 'Program kerja wajib dipilih' }]"
        >
          <a-select
            v-model:value="formState.workProgramId"
            show-search
            option-filter-prop="label"
            placeholder="Pilih program kerja..."
            :loading="loadingWorkPrograms"
            :options="workProgramSelectOptions"
          />
        </a-form-item>

        <!-- Live Preview Rata-rata Skor -->
        <div class="live-preview">
          <div>
            <div class="live-preview-label">
              Live Preview Rata-rata Skor KPI/KPA
            </div>
            <div class="text-muted">
              {{ scoredIndicators.length }} dari
              {{ formState.indicators.length }} indikator sudah diberi skor
            </div>
          </div>
          <div class="live-preview-score">
            <a-rate
              :value="toHalfStar(livePreviewAverage)"
              :count="5"
              allow-half
              disabled
            />
            <span
              class="live-preview-number"
              :style="{ color: scoreColor(livePreviewAverage) }"
            >
              {{ livePreviewAverage.toFixed(2) }}
            </span>
            <span class="stat-suffix">/ 5</span>
          </div>
        </div>

        <div class="indicator-section-header">
          <span class="fw-semibold">
            Indikator Penilaian ({{ formState.indicators.length }})
          </span>
          <a-button
            type="dashed"
            :icon="h(PlusOutlined)"
            @click="addIndicatorRow"
          >
            Tambah Indikator
          </a-button>
        </div>

        <div
          v-for="(indicator, idx) in formState.indicators"
          :key="indicator.uid"
          class="indicator-row"
        >
          <div class="indicator-row-header">
            <span class="indicator-number">Indikator #{{ idx + 1 }}</span>
            <a-button
              type="text"
              danger
              size="small"
              :disabled="formState.indicators.length <= 1"
              :icon="h(MinusCircleOutlined)"
              @click="removeIndicatorRow(indicator.uid)"
            >
              Hapus Baris
            </a-button>
          </div>

          <a-row :gutter="12">
            <a-col :xs="24" :md="8">
              <a-form-item
                label="Nama Indikator"
                :name="['indicators', idx, 'indicatorName']"
                :rules="requiredText('Nama indikator')"
              >
                <a-input
                  v-model:value="indicator.indicatorName"
                  placeholder="cth. Jumlah peserta kegiatan"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="12" :md="5">
              <a-form-item
                label="Target"
                :name="['indicators', idx, 'target']"
                :rules="requiredText('Target')"
              >
                <a-input
                  v-model:value="indicator.target"
                  placeholder="cth. 100 orang"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="12" :md="5">
              <a-form-item
                label="Realisasi"
                :name="['indicators', idx, 'realisasi']"
                :rules="requiredText('Realisasi')"
              >
                <a-input
                  v-model:value="indicator.realisasi"
                  placeholder="cth. 120 orang"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :md="6">
              <a-form-item
                label="Skor (1-5 Bintang)"
                :name="['indicators', idx, 'score']"
                :rules="scoreRules"
              >
                <a-rate v-model:value="indicator.score" :count="5" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item
                label="Catatan (Opsional)"
                :name="['indicators', idx, 'notes']"
                style="margin-bottom: 0"
              >
                <a-input
                  v-model:value="indicator.notes"
                  placeholder="Catatan singkat terkait capaian indikator ini..."
                />
              </a-form-item>
            </a-col>
          </a-row>
        </div>

        <a-divider style="border-color: #dbe2ef" />

        <a-row :gutter="16">
          <a-col :xs="24" :md="12">
            <a-form-item label="Kesimpulan" name="kesimpulan">
              <a-textarea
                v-model:value="formState.kesimpulan"
                :rows="4"
                placeholder="Kesimpulan umum hasil evaluasi program kerja..."
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :md="12">
            <a-form-item label="Rekomendasi" name="rekomendasi">
              <a-textarea
                v-model:value="formState.rekomendasi"
                :rows="4"
                placeholder="Rekomendasi perbaikan untuk periode berikutnya..."
              />
            </a-form-item>
          </a-col>
        </a-row>
        <div class="text-muted">
          * Kesimpulan &amp; Rekomendasi wajib diisi saat evaluasi dikirim
          sebagai <strong>SUBMITTED</strong>.
        </div>
      </a-form>

      <template #footer>
        <a-space>
          <a-button
            :disabled="formSubmitting !== null"
            @click="formVisible = false"
          >
            Batal
          </a-button>
          <a-button
            :icon="h(SaveOutlined)"
            :loading="formSubmitting === 'DRAFT'"
            :disabled="formSubmitting === 'SUBMITTED'"
            @click="handleSaveEvaluation('DRAFT')"
          >
            Simpan sebagai Draft
          </a-button>
          <a-button
            type="primary"
            :icon="h(SendOutlined)"
            :loading="formSubmitting === 'SUBMITTED'"
            :disabled="formSubmitting === 'DRAFT'"
            @click="handleSaveEvaluation('SUBMITTED')"
          >
            Kirim (Submitted)
          </a-button>
        </a-space>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.evaluation-page {
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
.table-card {
  border-color: #dbe2ef;
  border-radius: 10px;
  height: 100%;
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

.stat-icon-navy {
  background: linear-gradient(135deg, #112d4e, #3f72af);
}

.stat-icon-green {
  background: linear-gradient(135deg, #15803d, #22c55e);
}

.stat-icon-gray {
  background: linear-gradient(135deg, #52616b, #8c98a4);
}

.stat-icon-gold {
  background: linear-gradient(135deg, #d97706, #fadb14);
}

.stat-label {
  font-size: 13px;
  color: #52616b;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #112d4e;
  line-height: 1.2;
}

.stat-suffix {
  font-size: 13px;
  font-weight: 500;
  color: #8c98a4;
}

.stat-rate {
  font-size: 15px;
}

.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.proker-link {
  font-weight: 600;
  color: #3f72af;
}

.btn-export-pdf {
  color: #b91c1c;
  border-color: #b91c1c;
  font-weight: 600;
}

.score-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-rate {
  font-size: 14px;
}

.score-number {
  font-weight: 700;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.text-muted {
  font-size: 12.5px;
  color: #8c98a4;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 12px 0 16px 0;
}

.detail-proker {
  font-size: 17px;
  font-weight: 700;
  color: #112d4e;
}

.detail-score-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.conclusion-box {
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 12px 14px;
  height: 100%;
  background-color: #ffffff;
}

.conclusion-title {
  font-weight: 700;
  color: #112d4e;
  margin-bottom: 6px;
}

.conclusion-text {
  color: #2d3748;
  white-space: pre-line;
  line-height: 1.6;
}

.live-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: linear-gradient(135deg, #f9f7f7, #dbe2ef);
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.live-preview-label {
  font-weight: 700;
  color: #112d4e;
}

.live-preview-score {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-preview-number {
  font-size: 22px;
  font-weight: 700;
}

.indicator-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.indicator-row {
  border: 1px solid #dbe2ef;
  border-left: 4px solid #3f72af;
  border-radius: 8px;
  padding: 10px 14px 14px 14px;
  margin-bottom: 12px;
  background-color: #ffffff;
}

.indicator-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.indicator-number {
  font-weight: 700;
  color: #3f72af;
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

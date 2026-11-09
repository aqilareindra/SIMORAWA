<script setup lang="ts">
import { computed, onMounted, reactive, ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
  FilePdfOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS, type User } from '@/types/auth';
import {
  BUDGET_STATUS_COLORS,
  BUDGET_STATUS_LABELS,
  WORK_PROGRAM_STATUS_COLORS,
  WORK_PROGRAM_STATUS_LABELS,
  type BudgetStatus,
  type DocumentItem,
  type WorkProgram,
  type WorkProgramStatus,
} from '@/types/work-program';

const router = useRouter();
const authStore = useAuthStore();

const workPrograms = ref<WorkProgram[]>([]);
const picCandidates = ref<User[]>([]);
const loading = ref(false);
const updatingStatusId = ref<string | null>(null);

// Master Template KAK state (FR-08 & FR-21)
const templateKak = ref<DocumentItem | null>(null);
const loadingTemplateKak = ref(false);
const downloadingTemplateKak = ref(false);
const templateModalVisible = ref(false);
const uploadingTemplateKak = ref(false);
const selectedTemplateFile = ref<File | null>(null);

const filters = reactive<{
  search: string;
  status: WorkProgramStatus | undefined;
}>({
  search: '',
  status: undefined,
});

const canManageWorkProgram = computed(() =>
  ['KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);

const canUpdateStatus = computed(() =>
  ['KADIV', 'PIC', 'ADMIN'].includes(authStore.userRole || ''),
);

const canManageTemplateKak = computed(() =>
  ['SEKRETARIS', 'ADMIN'].includes(authStore.userRole || ''),
);

const statusOptions = (
  Object.keys(WORK_PROGRAM_STATUS_LABELS) as WorkProgramStatus[]
).map((status) => ({
  value: status,
  label: WORK_PROGRAM_STATUS_LABELS[status],
}));

const modalVisible = ref(false);
const modalSubmitting = ref(false);
const isEditMode = ref(false);
const editingId = ref<string | null>(null);
const formRef = ref();

interface InitialBudgetFormItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const formState = reactive<{
  name: string;
  description: string;
  picId: string | undefined;
  deadline: string;
  status: WorkProgramStatus;
  budgetNotes: string;
  initialBudgetItems: InitialBudgetFormItem[];
}>({
  name: '',
  description: '',
  picId: undefined,
  deadline: '',
  status: 'NOT_STARTED',
  budgetNotes: '',
  initialBudgetItems: [],
});

const formRules: Record<string, Rule[]> = {
  name: [{ required: true, message: 'Nama program kerja wajib diisi' }],
  description: [
    { required: true, message: 'Deskripsi program kerja wajib diisi' },
  ],
  picId: [{ required: true, message: 'PIC program kerja wajib dipilih' }],
  deadline: [{ required: true, message: 'Tanggal deadline wajib diisi' }],
};

const initialBudgetTotal = computed(() => {
  return formState.initialBudgetItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
});

const columns = [
  {
    title: 'Nama Program Kerja',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'PIC Pelaksana',
    key: 'pic',
    width: 200,
  },
  {
    title: 'Deadline',
    dataIndex: 'deadline',
    key: 'deadline',
    width: 140,
  },
  {
    title: 'Status Proker',
    dataIndex: 'status',
    key: 'status',
    width: 190,
  },
  {
    title: 'Ringkasan Anggaran',
    key: 'budget',
    width: 210,
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 210,
    align: 'center' as const,
  },
];

async function fetchWorkPrograms() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.status) {
      params.status = filters.status;
    }

    const { data } = await api.get<WorkProgram[]>('/work-programs', {
      params,
    });
    workPrograms.value = data;
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memuat daftar program kerja.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    loading.value = false;
  }
}

async function fetchPicCandidates() {
  try {
    const { data } = await api.get<User[]>('/users/pic-candidates');
    picCandidates.value = data;
  } catch {
    // Abaikan jika gagal memuat kandidat PIC
  }
}

async function fetchTemplateKak() {
  loadingTemplateKak.value = true;
  try {
    const { data } = await api.get<DocumentItem | null>(
      '/documents/template-kak',
    );
    templateKak.value = data || null;
  } catch {
    templateKak.value = null;
  } finally {
    loadingTemplateKak.value = false;
  }
}

async function handleDownloadTemplateKak() {
  if (!templateKak.value) {
    message.warning('Master Template KAK belum tersedia.');
    return;
  }

  downloadingTemplateKak.value = true;
  try {
    const response = await api.get(
      `/documents/${templateKak.value.id}/download`,
      {
        responseType: 'blob',
      },
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      templateKak.value.fileName || 'Template-KAK-SIMORAWA.pdf',
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    message.error('Gagal mengunduh file Template KAK.');
  } finally {
    downloadingTemplateKak.value = false;
  }
}

function openTemplateUploadModal() {
  selectedTemplateFile.value = null;
  templateModalVisible.value = true;
}

function onTemplateFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  if (!file) {
    selectedTemplateFile.value = null;
    return;
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    message.error('Hanya file berformat PDF (.pdf) yang diperbolehkan.');
    input.value = '';
    selectedTemplateFile.value = null;
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    message.error('Ukuran file maksimal adalah 10 MB.');
    input.value = '';
    selectedTemplateFile.value = null;
    return;
  }

  selectedTemplateFile.value = file;
}

async function handleUploadTemplateKak() {
  if (!selectedTemplateFile.value) {
    message.warning('Silakan pilih file PDF Template KAK terlebih dahulu.');
    return;
  }

  uploadingTemplateKak.value = true;
  try {
    const formData = new FormData();
    formData.append('file', selectedTemplateFile.value);

    const { data } = await api.post<DocumentItem>(
      '/documents/template-kak',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    templateKak.value = data;
    templateModalVisible.value = false;
    message.success('Master Template KAK berhasil diperbarui.');
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal mengunggah Master Template KAK.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    uploadingTemplateKak.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.status = undefined;
  fetchWorkPrograms();
}

function addBudgetRow() {
  formState.initialBudgetItems.push({
    itemName: '',
    quantity: 1,
    unit: 'Paket',
    unitPrice: 0,
  });
}

function removeBudgetRow(index: number) {
  formState.initialBudgetItems.splice(index, 1);
}

function openCreateModal() {
  isEditMode.value = false;
  editingId.value = null;
  formState.name = '';
  formState.description = '';
  formState.picId = undefined;
  formState.deadline = '';
  formState.status = 'NOT_STARTED';
  formState.budgetNotes = '';
  formState.initialBudgetItems = [];
  modalVisible.value = true;
}

function openEditModal(record: WorkProgram) {
  isEditMode.value = true;
  editingId.value = record.id;
  formState.name = record.name;
  formState.description = record.description;
  formState.picId = record.picId;
  formState.deadline = record.deadline
    ? new Date(record.deadline).toISOString().slice(0, 10)
    : '';
  formState.status = record.status;
  formState.budgetNotes = '';
  formState.initialBudgetItems = [];
  modalVisible.value = true;
}

async function handleSubmitModal() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  modalSubmitting.value = true;
  try {
    const isoDeadline = new Date(formState.deadline).toISOString();

    if (isEditMode.value && editingId.value) {
      await api.patch(`/work-programs/${editingId.value}`, {
        name: formState.name.trim(),
        description: formState.description.trim(),
        picId: formState.picId,
        deadline: isoDeadline,
        status: formState.status,
      });
      message.success('Program kerja berhasil diperbarui.');
    } else {
      const validBudgetItems = formState.initialBudgetItems
        .filter((item) => item.itemName.trim() !== '')
        .map((item) => ({
          itemName: item.itemName.trim(),
          quantity: Number(item.quantity) || 1,
          unit: item.unit.trim() || 'Unit',
          unitPrice: Number(item.unitPrice) || 0,
        }));

      await api.post('/work-programs', {
        name: formState.name.trim(),
        description: formState.description.trim(),
        picId: formState.picId,
        deadline: isoDeadline,
        status: formState.status,
        budgetNotes: formState.budgetNotes.trim() || undefined,
        initialBudgetItems:
          validBudgetItems.length > 0 ? validBudgetItems : undefined,
      });
      message.success('Program kerja baru berhasil ditambahkan.');
    }

    modalVisible.value = false;
    await fetchWorkPrograms();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menyimpan program kerja.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    modalSubmitting.value = false;
  }
}

async function handleQuickStatusChange(
  record: WorkProgram,
  newStatus: WorkProgramStatus,
) {
  updatingStatusId.value = record.id;
  try {
    await api.patch(`/work-programs/${record.id}/status`, {
      status: newStatus,
    });
    record.status = newStatus;
    message.success(
      `Status "${record.name}" diperbarui menjadi ${WORK_PROGRAM_STATUS_LABELS[newStatus]}.`,
    );
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memperbarui status proker.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    updatingStatusId.value = null;
  }
}

async function handleDelete(record: WorkProgram) {
  try {
    await api.delete(`/work-programs/${record.id}`);
    message.success(`Program kerja "${record.name}" berhasil dihapus.`);
    await fetchWorkPrograms();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menghapus program kerja.';
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
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function getRowClassName(_record: WorkProgram, index: number) {
  return index % 2 === 1 ? 'striped-row' : '';
}

onMounted(() => {
  fetchWorkPrograms();
  fetchPicCandidates();
  fetchTemplateKak();
});
</script>

<template>
  <div class="work-programs-page">
    <!-- Header Halaman -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Daftar Program Kerja</h2>
        <p class="page-subtitle">
          Monitoring siklus hidup program kerja, penugasan PIC, tenggat waktu,
          dan rincian anggaran awal.
        </p>
      </div>

      <a-button
        v-if="canManageWorkProgram"
        type="primary"
        size="large"
        :icon="h(PlusOutlined)"
        class="primary-action-btn"
        @click="openCreateModal"
      >
        Tambah Program Kerja
      </a-button>
    </div>

    <!-- Banner Master Template KAK (FR-08 & FR-21) -->
    <a-card class="template-kak-card" :bordered="true">
      <div class="template-kak-row">
        <div class="template-kak-info">
          <FilePdfOutlined class="template-kak-icon" />
          <div>
            <div class="template-kak-title">
              Dokumen Master Template KAK Standar HIMA IF UISI
            </div>
            <div v-if="templateKak" class="template-kak-meta">
              Berkas aktif: <strong>{{ templateKak.fileName }}</strong> ({{
                formatFileSize(templateKak.fileSize)
              }}) &bull; Diperbarui pada {{ formatDate(templateKak.createdAt) }}
              <template v-if="templateKak.uploader">
                oleh <strong>{{ templateKak.uploader.name }}</strong>
              </template>
            </div>
            <div v-else class="template-kak-meta">
              Belum ada Master Template KAK standar yang diunggah oleh
              Sekretaris.
            </div>
          </div>
        </div>

        <a-space wrap>
          <a-button
            type="primary"
            :disabled="!templateKak"
            :loading="downloadingTemplateKak"
            :icon="h(DownloadOutlined)"
            @click="handleDownloadTemplateKak"
          >
            Unduh Template KAK Standar
          </a-button>

          <a-button
            v-if="canManageTemplateKak"
            :icon="h(UploadOutlined)"
            @click="openTemplateUploadModal"
          >
            {{
              templateKak
                ? 'Perbarui Master Template KAK (PDF)'
                : 'Upload Master Template KAK (PDF)'
            }}
          </a-button>
        </a-space>
      </div>
    </a-card>

    <!-- Toolbar Filter & Pencarian -->
    <a-card class="filter-card" :bordered="true">
      <div class="filter-toolbar">
        <a-input
          v-model:value="filters.search"
          placeholder="Cari nama atau deskripsi proker..."
          allow-clear
          class="search-input"
          @pressEnter="fetchWorkPrograms"
        >
          <template #prefix>
            <SearchOutlined style="color: #3f72af" />
          </template>
        </a-input>

        <a-select
          v-model:value="filters.status"
          placeholder="Filter Status Proker"
          allow-clear
          class="status-select"
          :options="statusOptions"
          @change="fetchWorkPrograms"
        />

        <a-button type="primary" @click="fetchWorkPrograms">Terapkan</a-button>
        <a-button :icon="h(ReloadOutlined)" @click="resetFilters">
          Reset
        </a-button>
      </div>
    </a-card>

    <!-- Tabel Program Kerja (Striped Table) -->
    <a-card class="table-card" :bordered="true">
      <a-table
        :columns="columns"
        :data-source="workPrograms"
        :loading="loading"
        row-key="id"
        :row-class-name="getRowClassName"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="proker-name-wrap">
              <a
                class="proker-name-link"
                @click="router.push(`/work-programs/${record.id}`)"
              >
                {{ record.name }}
              </a>
              <div class="proker-desc-preview">{{ record.description }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'pic'">
            <div v-if="record.pic">
              <div class="fw-semibold">{{ record.pic.name }}</div>
              <div class="pic-email">{{ record.pic.email }}</div>
            </div>
            <span v-else>-</span>
          </template>

          <template v-else-if="column.key === 'deadline'">
            <span class="deadline-text">{{ formatDate(record.deadline) }}</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <div class="status-cell">
              <a-select
                v-if="canUpdateStatus"
                :value="record.status"
                :loading="updatingStatusId === record.id"
                size="small"
                style="width: 155px"
                :options="statusOptions"
                @change="(val: WorkProgramStatus) => handleQuickStatusChange(record as WorkProgram, val)"
              />
              <a-tag
                v-else
                :color="WORK_PROGRAM_STATUS_COLORS[record.status as WorkProgramStatus]"
              >
                {{ WORK_PROGRAM_STATUS_LABELS[record.status as WorkProgramStatus] }}
              </a-tag>
            </div>
          </template>

          <template v-else-if="column.key === 'budget'">
            <div v-if="record.budgets && record.budgets.length > 0">
              <div class="fw-semibold">
                {{ formatCurrency(record.budgets[0].totalAmount) }}
              </div>
              <a-tag
                size="small"
                :color="BUDGET_STATUS_COLORS[record.budgets[0].status as BudgetStatus]"
              >
                {{ BUDGET_STATUS_LABELS[record.budgets[0].status as BudgetStatus] }}
              </a-tag>
            </div>
            <span v-else class="text-muted">Belum ada anggaran</span>
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-space :size="4">
              <a-button
                type="link"
                size="small"
                :icon="h(EyeOutlined)"
                @click="router.push(`/work-programs/${record.id}`)"
              >
                Detail
              </a-button>

              <a-button
                v-if="canManageWorkProgram"
                type="link"
                size="small"
                :icon="h(EditOutlined)"
                @click="openEditModal(record as WorkProgram)"
              >
                Edit
              </a-button>

              <a-popconfirm
                v-if="canManageWorkProgram"
                title="Hapus program kerja ini beserta seluruh anggaran, dokumen, dan progres terkait?"
                ok-text="Ya, Hapus"
                cancel-text="Batal"
                :ok-button-props="{ danger: true }"
                @confirm="handleDelete(record as WorkProgram)"
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
    </a-card>

    <!-- Modal Upload Master Template KAK (SEKRETARIS / ADMIN) -->
    <a-modal
      v-model:open="templateModalVisible"
      title="Unggah Master Template KAK Standar (PDF)"
      :confirm-loading="uploadingTemplateKak"
      ok-text="Unggah Template"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleUploadTemplateKak"
    >
      <div class="upload-modal-body">
        <a-alert
          message="Ketentuan Berkas Template KAK"
          description="File harus berformat PDF (.pdf) dengan ukuran maksimal 10 MB. File ini akan menjadi acuan standar yang dapat diunduh oleh seluruh PIC dan Kepala Divisi."
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />

        <a-form layout="vertical">
          <a-form-item label="Pilih File PDF Template KAK" required>
            <input
              type="file"
              accept=".pdf,application/pdf"
              class="file-input-control"
              @change="onTemplateFileChange"
            />
          </a-form-item>
        </a-form>

        <div v-if="selectedTemplateFile" class="selected-file-preview">
          <FilePdfOutlined style="color: #dc2626" />
          <span>
            <strong>{{ selectedTemplateFile.name }}</strong> ({{
              formatFileSize(selectedTemplateFile.size)
            }})
          </span>
        </div>
      </div>
    </a-modal>

    <!-- Modal Buat / Edit Program Kerja -->
    <a-modal
      v-model:open="modalVisible"
      :title="
        isEditMode ? 'Edit Program Kerja' : 'Buat Program Kerja Baru'
      "
      :confirm-loading="modalSubmitting"
      width="780px"
      ok-text="Simpan Program Kerja"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleSubmitModal"
    >
      <a-form
        ref="formRef"
        layout="vertical"
        :model="formState"
        :rules="formRules"
        class="proker-modal-form"
      >
        <a-form-item label="Nama Program Kerja" name="name">
          <a-input
            v-model:value="formState.name"
            placeholder="Contoh: Seminar Nasional Teknologi Informasi 2026"
          />
        </a-form-item>

        <a-form-item label="Deskripsi Kegiatan" name="description">
          <a-textarea
            v-model:value="formState.description"
            :rows="3"
            placeholder="Jelaskan tujuan, sasaran, dan gambaran umum pelaksanaan proker..."
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :xs="24" :md="10">
            <a-form-item label="Penanggung Jawab (PIC)" name="picId">
              <a-select
                v-model:value="formState.picId"
                placeholder="Pilih PIC Pelaksana"
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
          </a-col>

          <a-col :xs="24" :md="7">
            <a-form-item label="Tenggat Waktu (Deadline)" name="deadline">
              <a-input v-model:value="formState.deadline" type="date" />
            </a-form-item>
          </a-col>

          <a-col :xs="24" :md="7">
            <a-form-item label="Status Awal" name="status">
              <a-select
                v-model:value="formState.status"
                :options="statusOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Bagian Opsional Rincian Anggaran Awal (Saat Membuat Proker Baru) -->
        <template v-if="!isEditMode">
          <a-divider orientation="left" class="budget-divider">
            Rincian Awal Anggaran (Opsional)
          </a-divider>

          <a-form-item label="Catatan Anggaran Awal (Opsional)">
            <a-input
              v-model:value="formState.budgetNotes"
              placeholder="Contoh: Estimasi RKA awal kepanitiaan"
            />
          </a-form-item>

          <div
            v-for="(item, idx) in formState.initialBudgetItems"
            :key="idx"
            class="budget-item-row"
          >
            <a-input
              v-model:value="item.itemName"
              placeholder="Nama Item (misal: Konsumsi Peserta)"
              style="flex: 2"
            />
            <a-input-number
              v-model:value="item.quantity"
              :min="1"
              placeholder="Qty"
              style="width: 85px"
            />
            <a-input
              v-model:value="item.unit"
              placeholder="Satuan (Kotak/Paket)"
              style="width: 120px"
            />
            <a-input-number
              v-model:value="item.unitPrice"
              :min="0"
              :step="5000"
              placeholder="Harga Satuan"
              style="width: 150px"
            />
            <div class="item-subtotal">
              {{
                formatCurrency(
                  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
                )
              }}
            </div>
            <a-button
              type="text"
              danger
              :icon="h(MinusCircleOutlined)"
              @click="removeBudgetRow(idx)"
            />
          </div>

          <div class="budget-actions-bar">
            <a-button type="dashed" :icon="h(PlusOutlined)" @click="addBudgetRow">
              Tambah Baris Item Anggaran
            </a-button>

            <div
              v-if="formState.initialBudgetItems.length > 0"
              class="budget-grand-total"
            >
              Total Estimasi Awal:
              <strong>{{ formatCurrency(initialBudgetTotal) }}</strong>
            </div>
          </div>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.work-programs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
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

.primary-action-btn {
  background-color: #3f72af;
  border-color: #3f72af;
  font-weight: 600;
}

.template-kak-card,
.filter-card,
.table-card {
  border-color: #dbe2ef;
  border-radius: 10px;
}

.template-kak-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.template-kak-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.template-kak-icon {
  font-size: 26px;
  color: #3f72af;
  margin-top: 2px;
}

.template-kak-title {
  font-weight: 700;
  color: #112d4e;
  font-size: 14.5px;
}

.template-kak-meta {
  font-size: 12.5px;
  color: #52616b;
  margin-top: 2px;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 300px;
}

.status-select {
  width: 210px;
}

.proker-name-link {
  font-weight: 700;
  color: #112d4e;
  font-size: 14.5px;
  cursor: pointer;
}

.proker-name-link:hover {
  color: #3f72af;
  text-decoration: underline;
}

.proker-desc-preview {
  font-size: 12.5px;
  color: #52616b;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.pic-email {
  font-size: 12px;
  color: #52616b;
}

.deadline-text {
  font-weight: 500;
  color: #112d4e;
}

.text-muted {
  font-size: 12.5px;
  color: #8c98a4;
}

.upload-modal-body {
  margin-top: 12px;
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

.proker-modal-form {
  margin-top: 10px;
}

.budget-divider {
  margin: 12px 0;
  border-color: #dbe2ef;
  color: #112d4e;
  font-weight: 600;
}

.budget-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.item-subtotal {
  min-width: 125px;
  text-align: right;
  font-weight: 600;
  color: #112d4e;
  font-size: 13px;
}

.budget-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.budget-grand-total {
  font-size: 14.5px;
  color: #112d4e;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #112d4e !important;
  color: #ffffff !important;
  border-color: #dbe2ef !important;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr.striped-row > td) {
  background-color: #f9f7f7;
}

:deep(.ant-table-tbody > tr > td) {
  border-color: #dbe2ef !important;
}
</style>

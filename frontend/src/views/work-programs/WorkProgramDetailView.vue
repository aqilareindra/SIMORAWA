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
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS, type User } from '@/types/auth';
import {
  BUDGET_STATUS_COLORS,
  BUDGET_STATUS_LABELS,
  WORK_PROGRAM_STATUS_COLORS,
  WORK_PROGRAM_STATUS_LABELS,
  type WorkProgram,
  type WorkProgramStatus,
} from '@/types/work-program';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const workProgramId = computed(() => route.params.id as string);
const workProgram = ref<WorkProgram | null>(null);
const picCandidates = ref<User[]>([]);
const loading = ref(false);
const updatingStatus = ref(false);
const activeTab = ref('budgets');

const canManageWorkProgram = computed(() =>
  ['KADIV', 'ADMIN'].includes(authStore.userRole || ''),
);

const canUpdateStatus = computed(() =>
  ['KADIV', 'PIC', 'ADMIN'].includes(authStore.userRole || ''),
);

const statusOptions = (
  Object.keys(WORK_PROGRAM_STATUS_LABELS) as WorkProgramStatus[]
).map((status) => ({
  value: status,
  label: WORK_PROGRAM_STATUS_LABELS[status],
}));

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
    title: 'Tanggal Laporan',
    dataIndex: 'submittedAt',
    key: 'submittedAt',
    width: 170,
  },
  {
    title: 'Capaian (%)',
    dataIndex: 'progressPct',
    key: 'progressPct',
    width: 150,
  },
  {
    title: 'Deskripsi Progres Kegiatan',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Kendala Lapangan',
    dataIndex: 'obstacles',
    key: 'obstacles',
  },
  {
    title: 'Dilaporkan Oleh',
    key: 'submitter',
    width: 180,
  },
];

const documentColumns = [
  {
    title: 'Nama Berkas',
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
    title: 'Tipe MIME',
    dataIndex: 'mimeType',
    key: 'mimeType',
    width: 150,
  },
  {
    title: 'Ukuran File',
    dataIndex: 'fileSize',
    key: 'fileSize',
    width: 130,
  },
  {
    title: 'Diunggah Oleh',
    key: 'uploader',
    width: 180,
  },
  {
    title: 'Tanggal Unggah',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 160,
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
                      <span class="fw-semibold">
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
                        {{ BUDGET_STATUS_LABELS[budget.status] }}
                      </a-tag>
                      <span class="budget-total-amount">
                        Total: {{ formatCurrency(budget.totalAmount) }}
                      </span>
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

            <!-- Tab 2: Laporan Progres PIC -->
            <a-tab-pane key="progress">
              <template #tab>
                <span>
                  <LineChartOutlined />
                  Laporan Progres ({{
                    workProgram.progressReports?.length || 0
                  }})
                </span>
              </template>

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
                    {{ record.obstacles || 'Tidak ada kendala' }}
                  </template>
                  <template v-else-if="column.key === 'submitter'">
                    {{ record.submitter?.name || '-' }}
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- Tab 3: Dokumen Kegiatan -->
            <a-tab-pane key="documents">
              <template #tab>
                <span>
                  <FilePdfOutlined />
                  Dokumen Kegiatan ({{ workProgram.documents?.length || 0 }})
                </span>
              </template>

              <a-table
                :columns="documentColumns"
                :data-source="workProgram.documents || []"
                row-key="id"
                :pagination="{ pageSize: 5 }"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'type'">
                    <a-tag color="blue">{{ record.type }}</a-tag>
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
                </template>
              </a-table>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </template>
    </a-spin>

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

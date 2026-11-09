<script setup lang="ts">
import { computed, onMounted, ref, h } from 'vue';
import { useRouter } from 'vue-router';
import {
  ProjectOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS } from '@/types/auth';
import {
  WORK_PROGRAM_STATUS_COLORS,
  WORK_PROGRAM_STATUS_LABELS,
  type WorkProgram,
  type WorkProgramStatus,
} from '@/types/work-program';

const router = useRouter();
const authStore = useAuthStore();

const workPrograms = ref<WorkProgram[]>([]);
const loading = ref(false);

const stats = computed(() => {
  const list = workPrograms.value;
  return {
    total: list.length,
    notStarted: list.filter((p) => p.status === 'NOT_STARTED').length,
    inProgress: list.filter((p) => p.status === 'IN_PROGRESS').length,
    onHold: list.filter((p) => p.status === 'ON_HOLD').length,
    completed: list.filter((p) => p.status === 'COMPLETED').length,
  };
});

const recentPrograms = computed(() => workPrograms.value.slice(0, 5));

const columns = [
  {
    title: 'Nama Program Kerja',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'PIC Pelaksana',
    key: 'pic',
    width: 190,
  },
  {
    title: 'Deadline',
    dataIndex: 'deadline',
    key: 'deadline',
    width: 150,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 150,
  },
];

async function fetchDashboardData() {
  loading.value = true;
  try {
    const { data } = await api.get<WorkProgram[]>('/work-programs');
    workPrograms.value = data;
  } catch {
    // Abaikan jika gagal memuat
  } finally {
    loading.value = false;
  }
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
  fetchDashboardData();
});
</script>

<template>
  <div class="dashboard-page">
    <!-- Banner Sambutan -->
    <a-card class="welcome-card" :bordered="true">
      <div class="welcome-header">
        <div>
          <h2 class="welcome-title">
            Selamat Datang di SIMORAWA, {{ authStore.user?.name }}!
          </h2>
          <p class="welcome-desc">
            Anda masuk sebagai
            <strong>{{
              authStore.userRole ? ROLE_LABELS[authStore.userRole] : '-'
            }}</strong>
            ({{ authStore.user?.email }}). Pantau progres pelaksanaan program
            kerja HIMA IF UISI secara real-time.
          </p>
        </div>

        <a-button
          type="primary"
          :icon="h(ArrowRightOutlined)"
          class="goto-proker-btn"
          @click="router.push('/work-programs')"
        >
          Kelola Program Kerja
        </a-button>
      </div>
    </a-card>

    <!-- Kartu Statistik Dasar Program Kerja -->
    <a-spin :spinning="loading">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12" :md="8" :lg="4">
          <a-card class="stat-card total-card" :bordered="true">
            <div class="stat-top">
              <span class="stat-label">Total Proker</span>
              <ProjectOutlined class="stat-icon" style="color: #112d4e" />
            </div>
            <div class="stat-value">{{ stats.total }}</div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-card class="stat-card" :bordered="true">
            <div class="stat-top">
              <span class="stat-label">Belum Mulai</span>
              <ClockCircleOutlined class="stat-icon" style="color: #64748b" />
            </div>
            <div class="stat-value">{{ stats.notStarted }}</div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="8" :lg="5">
          <a-card class="stat-card" :bordered="true">
            <div class="stat-top">
              <span class="stat-label">Sedang Berjalan</span>
              <SyncOutlined class="stat-icon" style="color: #3f72af" />
            </div>
            <div class="stat-value" style="color: #3f72af">
              {{ stats.inProgress }}
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :md="12" :lg="5">
          <a-card class="stat-card" :bordered="true">
            <div class="stat-top">
              <span class="stat-label">Ditunda (On Hold)</span>
              <PauseCircleOutlined class="stat-icon" style="color: #d97706" />
            </div>
            <div class="stat-value" style="color: #d97706">
              {{ stats.onHold }}
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="24" :md="12" :lg="5">
          <a-card class="stat-card" :bordered="true">
            <div class="stat-top">
              <span class="stat-label">Selesai</span>
              <CheckCircleOutlined class="stat-icon" style="color: #16a34a" />
            </div>
            <div class="stat-value" style="color: #16a34a">
              {{ stats.completed }}
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>

    <!-- Ringkasan Program Kerja Terdekat -->
    <a-card
      title="Jadwal Program Kerja Terdekat"
      class="recent-card"
      :bordered="true"
    >
      <template #extra>
        <a @click="router.push('/work-programs')">Lihat Semua</a>
      </template>

      <a-table
        :columns="columns"
        :data-source="recentPrograms"
        :loading="loading"
        row-key="id"
        :pagination="false"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <a
              class="proker-link"
              @click="router.push(`/work-programs/${record.id}`)"
            >
              {{ record.name }}
            </a>
          </template>
          <template v-else-if="column.key === 'pic'">
            {{ record.pic?.name || '-' }}
          </template>
          <template v-else-if="column.key === 'deadline'">
            {{ formatDate(record.deadline) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag
              :color="
                WORK_PROGRAM_STATUS_COLORS[record.status as WorkProgramStatus]
              "
            >
              {{
                WORK_PROGRAM_STATUS_LABELS[record.status as WorkProgramStatus]
              }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-card,
.stat-card,
.recent-card {
  border-color: #dbe2ef;
  border-radius: 10px;
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.welcome-title {
  color: #112d4e;
  font-weight: 700;
  margin: 0 0 6px 0;
}

.welcome-desc {
  color: #52616b;
  margin: 0;
}

.goto-proker-btn {
  background-color: #3f72af;
  border-color: #3f72af;
  font-weight: 600;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  font-weight: 600;
  color: #52616b;
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #112d4e;
}

.proker-link {
  font-weight: 600;
  color: #112d4e;
}

.proker-link:hover {
  color: #3f72af;
  text-decoration: underline;
}

:deep(.ant-table-thead > tr > th) {
  background-color: #112d4e !important;
  color: #ffffff !important;
  border-color: #dbe2ef !important;
}
</style>

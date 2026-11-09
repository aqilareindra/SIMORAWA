<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  ProjectOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  StarOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LineChartOutlined,
  AccountBookOutlined,
  BellOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS, type User } from '@/types/auth';
import {
  WORK_PROGRAM_STATUS_COLORS,
  WORK_PROGRAM_STATUS_LABELS,
  type KasTransactionItem,
  type ProgressReportItem,
  type WorkProgramStatus,
} from '@/types/work-program';
import {
  extractErrorMessage,
  formatCurrency,
  formatDate,
} from '@/utils/format';

interface UpcomingProgramItem {
  id: string;
  name: string;
  status: WorkProgramStatus;
  deadline: string;
  pic?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  progressPct: number;
}

interface RecentProgressWithProker extends ProgressReportItem {
  workProgram?: {
    id: string;
    name: string;
    status: WorkProgramStatus;
  };
}

interface DashboardSummary {
  totalPrograms: number;
  notStarted: number;
  inProgress: number;
  onHold: number;
  completed: number;
  upcomingDeadlines: UpcomingProgramItem[];

  currentKasBalance: number;
  totalIncome: number;
  totalExpense: number;
  pendingBudgetsCount: number;
  pendingBudgetsTotal: number;
  approvedBudgetsCount: number;
  approvedBudgetsTotal: number;
  draftBudgetsCount: number;
  totalBudgetsCount: number;

  totalEvaluations: number;
  submittedEvaluations: number;
  draftEvaluations: number;
  averageKpiScore: number;

  recentProgressReports: RecentProgressWithProker[];
  recentKasTransactions: KasTransactionItem[];
}

const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const triggeringReminder = ref(false);
const activityTab = ref<'progress' | 'kas'>('progress');

const summary = ref<DashboardSummary>({
  totalPrograms: 0,
  notStarted: 0,
  inProgress: 0,
  onHold: 0,
  completed: 0,
  upcomingDeadlines: [],
  currentKasBalance: 0,
  totalIncome: 0,
  totalExpense: 0,
  pendingBudgetsCount: 0,
  pendingBudgetsTotal: 0,
  approvedBudgetsCount: 0,
  approvedBudgetsTotal: 0,
  draftBudgetsCount: 0,
  totalBudgetsCount: 0,
  totalEvaluations: 0,
  submittedEvaluations: 0,
  draftEvaluations: 0,
  averageKpiScore: 0,
  recentProgressReports: [],
  recentKasTransactions: [],
});

const completionRate = computed(() => {
  if (!summary.value.totalPrograms) return 0;
  return Math.round(
    (summary.value.completed / summary.value.totalPrograms) * 100,
  );
});

const statusDistribution = computed(() => {
  const total = summary.value.totalPrograms || 1;
  return [
    {
      key: 'IN_PROGRESS',
      label: 'Sedang Berjalan',
      count: summary.value.inProgress,
      pct: Math.round((summary.value.inProgress / total) * 100),
      color: '#3F72AF',
    },
    {
      key: 'COMPLETED',
      label: 'Selesai Terlaksana',
      count: summary.value.completed,
      pct: Math.round((summary.value.completed / total) * 100),
      color: '#16a34a',
    },
    {
      key: 'NOT_STARTED',
      label: 'Belum Mulai',
      count: summary.value.notStarted,
      pct: Math.round((summary.value.notStarted / total) * 100),
      color: '#64748b',
    },
    {
      key: 'ON_HOLD',
      label: 'Ditunda (On Hold)',
      count: summary.value.onHold,
      pct: Math.round((summary.value.onHold / total) * 100),
      color: '#d97706',
    },
  ];
});

const cashflowRatioPct = computed(() => {
  const income = Number(summary.value.totalIncome || 0);
  const expense = Number(summary.value.totalExpense || 0);
  if (income <= 0) return expense > 0 ? 100 : 0;
  return Math.min(100, Math.round((expense / income) * 100));
});

const upcomingColumns = [
  { title: 'Program Kerja & PIC', key: 'name' },
  { title: 'Deadline', key: 'deadline', width: 130 },
  { title: 'Progres', key: 'progressPct', width: 145 },
  { title: 'Status', key: 'status', width: 115, align: 'center' as const },
  { title: 'Aksi', key: 'action', width: 85, align: 'center' as const },
];

function toHalfStar(score: number) {
  return Math.round(Number(score || 0) * 2) / 2;
}

async function fetchDashboardSummary() {
  loading.value = true;
  try {
    const { data } = await api.get<DashboardSummary>('/dashboard/summary');
    summary.value = data;
  } catch (err: any) {
    message.error(
      extractErrorMessage(err, 'Gagal memuat ringkasan dashboard.'),
    );
  } finally {
    loading.value = false;
  }
}

async function handleTriggerDeadlineCheck() {
  triggeringReminder.value = true;
  try {
    const { data } = await api.post<{
      message: string;
      checkedPrograms: number;
      notificationsCreated: number;
    }>('/notifications/trigger-check');
    message.success(
      `${data.message} (${data.notificationsCreated} pengingat baru dikirim).`,
    );
  } catch (err: any) {
    message.error(
      extractErrorMessage(err, 'Gagal menjalankan pengecekan tenggat proker.'),
    );
  } finally {
    triggeringReminder.value = false;
  }
}

onMounted(() => {
  fetchDashboardSummary();
});
</script>

<template>
  <div class="dashboard-page">
    <!-- Banner Sambutan Eksekutif -->
    <a-card class="welcome-card">
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
            ({{ authStore.user?.email }}). Pantau capaian program kerja, arus
            kas organisasi, dan evaluasi kinerja HIMA IF UISI secara terpadu.
          </p>
        </div>

        <a-space wrap>
          <a-button
            :icon="h(ReloadOutlined)"
            :loading="loading"
            @click="fetchDashboardSummary"
          >
            Muat Ulang
          </a-button>
          <a-button
            :icon="h(BellOutlined)"
            :loading="triggeringReminder"
            @click="handleTriggerDeadlineCheck"
          >
            Cek Pengingat Deadline
          </a-button>
          <a-button
            type="primary"
            :icon="h(ArrowRightOutlined)"
            @click="router.push('/work-programs')"
          >
            Kelola Program Kerja
          </a-button>
        </a-space>
      </div>
    </a-card>

    <!-- 1. Baris 4 Kartu KPI Utama (Top Summary Cards) -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="kpi-card" :loading="loading">
          <div class="kpi-body">
            <div class="kpi-icon kpi-icon-navy">
              <ProjectOutlined />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Total Program Kerja</div>
              <div class="kpi-value">
                {{ summary.totalPrograms }}
                <span class="kpi-suffix">
                  ({{ summary.completed }} selesai · {{ completionRate }}%)
                </span>
              </div>
              <a-progress
                :percent="completionRate"
                size="small"
                stroke-color="#3F72AF"
                :show-info="false"
                style="margin-bottom: 0"
              />
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="kpi-card kpi-card-primary" :loading="loading">
          <div class="kpi-body">
            <div class="kpi-icon kpi-icon-white">
              <WalletOutlined />
            </div>
            <div class="kpi-info">
              <div class="kpi-label kpi-label-light">
                Saldo Kas HIMA Saat Ini
              </div>
              <div class="kpi-value kpi-value-light">
                {{ formatCurrency(summary.currentKasBalance) }}
              </div>
              <div class="kpi-sub-light">
                Disetujui: {{ formatCurrency(summary.approvedBudgetsTotal) }} ({{
                  summary.approvedBudgetsCount
                }}
                proker)
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="kpi-card" :loading="loading">
          <div class="kpi-body">
            <div class="kpi-icon kpi-icon-gold">
              <ClockCircleOutlined />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">
                Anggaran Menunggu Approval
                <a-tag color="gold" style="margin-left: 4px">PENDING</a-tag>
              </div>
              <div class="kpi-value">
                {{ summary.pendingBudgetsCount }}
                <span class="kpi-suffix">pengajuan</span>
              </div>
              <div class="text-muted">
                Nilai: {{ formatCurrency(summary.pendingBudgetsTotal) }} ·
                Draft: {{ summary.draftBudgetsCount }}
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="kpi-card" :loading="loading">
          <div class="kpi-body">
            <div class="kpi-icon kpi-icon-blue">
              <StarOutlined />
            </div>
            <div class="kpi-info">
              <div class="kpi-label">Rata-rata Skor KPI/KPA</div>
              <div class="kpi-score-row">
                <span class="kpi-value">
                  {{ summary.averageKpiScore.toFixed(2) }}
                </span>
                <span class="kpi-suffix">/ 5</span>
                <a-rate
                  :value="toHalfStar(summary.averageKpiScore)"
                  :count="5"
                  allow-half
                  disabled
                  class="kpi-rate"
                />
              </div>
              <div class="text-muted">
                {{ summary.submittedEvaluations }} submitted dari
                {{ summary.totalEvaluations }} evaluasi
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 2. Visualisasi Distribusi Status Proker & Ringkasan Arus Kas -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :lg="12">
        <a-card
          title="Distribusi Status & Progres Program Kerja"
          class="panel-card"
          :loading="loading"
        >
          <template #extra>
            <a @click="router.push('/work-programs')">Semua Proker</a>
          </template>

          <!-- Stacked Bar Visual -->
          <div class="stacked-bar">
            <div
              v-for="seg in statusDistribution"
              :key="seg.key"
              class="stacked-segment"
              :style="{
                width: `${Math.max(seg.pct, seg.count > 0 ? 6 : 0)}%`,
                backgroundColor: seg.color,
              }"
              :title="`${seg.label}: ${seg.count} proker (${seg.pct}%)`"
            />
          </div>

          <div class="status-dist-list">
            <div
              v-for="item in statusDistribution"
              :key="item.key"
              class="status-dist-row"
            >
              <div class="status-dist-header">
                <span class="status-dot-wrap">
                  <span
                    class="status-dot"
                    :style="{ backgroundColor: item.color }"
                  />
                  <span class="fw-semibold">{{ item.label }}</span>
                </span>
                <span class="status-count-text">
                  <strong>{{ item.count }}</strong> proker ({{ item.pct }}%)
                </span>
              </div>
              <a-progress
                :percent="item.pct"
                :stroke-color="item.color"
                :show-info="false"
                size="small"
              />
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :lg="12">
        <a-card
          title="Ringkasan Arus Kas & Realisasi Anggaran HIMA"
          class="panel-card"
          :loading="loading"
        >
          <template #extra>
            <a @click="router.push('/finance')">Buku Kas &amp; Anggaran</a>
          </template>

          <a-row :gutter="[12, 12]">
            <a-col :xs="24" :sm="12">
              <div class="cash-box cash-box-income">
                <div class="cash-box-header">
                  <ArrowUpOutlined />
                  <span>Total Pemasukan Kas (INCOME)</span>
                </div>
                <div class="cash-box-amount">
                  {{ formatCurrency(summary.totalIncome) }}
                </div>
              </div>
            </a-col>
            <a-col :xs="24" :sm="12">
              <div class="cash-box cash-box-expense">
                <div class="cash-box-header">
                  <ArrowDownOutlined />
                  <span>Total Pengeluaran / Pencairan</span>
                </div>
                <div class="cash-box-amount">
                  {{ formatCurrency(summary.totalExpense) }}
                </div>
              </div>
            </a-col>
          </a-row>

          <div class="cash-ratio-section">
            <div class="cash-ratio-header">
              <span class="fw-semibold">
                Rasio Pengeluaran terhadap Total Pemasukan Kas
              </span>
              <strong>{{ cashflowRatioPct }}%</strong>
            </div>
            <a-progress
              :percent="cashflowRatioPct"
              stroke-color="#3F72AF"
              :show-info="false"
            />
          </div>

          <a-divider style="border-color: #dbe2ef; margin: 12px 0" />

          <div class="budget-mini-grid">
            <div class="budget-mini-item">
              <span class="text-muted">Total Pengajuan</span>
              <strong class="fw-semibold">
                {{ summary.totalBudgetsCount }} pengajuan
              </strong>
            </div>
            <div class="budget-mini-item">
              <span class="text-muted">Anggaran Disetujui</span>
              <strong style="color: #15803d">
                {{ formatCurrency(summary.approvedBudgetsTotal) }}
              </strong>
            </div>
            <div class="budget-mini-item">
              <span class="text-muted">Menunggu Approval</span>
              <strong style="color: #d97706">
                {{ formatCurrency(summary.pendingBudgetsTotal) }}
              </strong>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 3. Tabel / Daftar Pantauan Cepat (2 Kolom) -->
    <a-row :gutter="[16, 16]">
      <!-- Kolom Kiri: Jadwal Program Kerja Terdekat -->
      <a-col :xs="24" :xl="14">
        <a-card
          title="Program Kerja Terdekat (Upcoming Deadlines)"
          class="panel-card"
        >
          <template #extra>
            <a @click="router.push('/work-programs')">Lihat Semua</a>
          </template>

          <a-table
            :columns="upcomingColumns"
            :data-source="summary.upcomingDeadlines"
            :loading="loading"
            row-key="id"
            :pagination="false"
            size="small"
            :scroll="{ x: 640 }"
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
                <div class="text-muted">
                  PIC: {{ record.pic?.name || '-' }}
                </div>
              </template>

              <template v-else-if="column.key === 'deadline'">
                {{ formatDate(record.deadline) }}
              </template>

              <template v-else-if="column.key === 'progressPct'">
                <a-progress
                  :percent="record.progressPct"
                  size="small"
                  stroke-color="#3F72AF"
                />
              </template>

              <template v-else-if="column.key === 'status'">
                <a-tag
                  :color="
                    WORK_PROGRAM_STATUS_COLORS[
                      record.status as WorkProgramStatus
                    ]
                  "
                >
                  {{
                    WORK_PROGRAM_STATUS_LABELS[
                      record.status as WorkProgramStatus
                    ]
                  }}
                </a-tag>
              </template>

              <template v-else-if="column.key === 'action'">
                <a-button
                  type="link"
                  size="small"
                  @click="router.push(`/work-programs/${record.id}`)"
                >
                  Detail
                </a-button>
              </template>
            </template>

            <template #emptyText>
              <a-empty description="Belum ada jadwal program kerja." />
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- Kolom Kanan: Riwayat Aktivitas Progres & Mutasi Kas Terbaru -->
      <a-col :xs="24" :xl="10">
        <a-card class="panel-card" :loading="loading">
          <a-tabs v-model:activeKey="activityTab" size="small">
            <a-tab-pane key="progress">
              <template #tab>
                <span>
                  <LineChartOutlined />
                  Laporan Progres Terbaru
                </span>
              </template>

              <div
                v-if="summary.recentProgressReports.length > 0"
                class="feed-list"
              >
                <div
                  v-for="rep in summary.recentProgressReports"
                  :key="rep.id"
                  class="feed-item"
                >
                  <div class="feed-top">
                    <a
                      class="proker-link"
                      @click="
                        router.push(
                          `/work-programs/${rep.workProgramId}?tab=progress`,
                        )
                      "
                    >
                      {{ rep.workProgram?.name || 'Program Kerja' }}
                    </a>
                    <a-tag color="blue">{{ rep.progressPct }}%</a-tag>
                  </div>
                  <div class="feed-desc">{{ rep.description }}</div>
                  <div class="text-muted">
                    Oleh {{ rep.submitter?.name || '-' }} ·
                    {{ formatDate(rep.submittedAt) }}
                  </div>
                </div>
              </div>
              <a-empty
                v-else
                description="Belum ada laporan progres terbaru."
              />
            </a-tab-pane>

            <a-tab-pane key="kas">
              <template #tab>
                <span>
                  <AccountBookOutlined />
                  Mutasi Kas Terbaru
                </span>
              </template>

              <div
                v-if="summary.recentKasTransactions.length > 0"
                class="feed-list"
              >
                <div
                  v-for="tx in summary.recentKasTransactions"
                  :key="tx.id"
                  class="feed-item"
                >
                  <div class="feed-top">
                    <a-tag
                      :color="tx.type === 'PEMASUKAN' ? 'green' : 'volcano'"
                    >
                      {{ tx.type === 'PEMASUKAN' ? 'INCOME' : 'EXPENSE' }}
                    </a-tag>
                    <span
                      :class="
                        tx.type === 'PEMASUKAN'
                          ? 'amount-income'
                          : 'amount-expense'
                      "
                    >
                      {{ tx.type === 'PEMASUKAN' ? '+' : '-' }}
                      {{ formatCurrency(tx.amount) }}
                    </span>
                  </div>
                  <div class="feed-desc">{{ tx.description }}</div>
                  <div class="text-muted">
                    Dicatat {{ tx.creator?.name || '-' }} ·
                    {{ formatDate(tx.transactionDate) }}
                  </div>
                </div>
              </div>
              <a-empty v-else description="Belum ada mutasi kas terbaru." />
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-card,
.kpi-card,
.panel-card {
  border-color: #dbe2ef;
  border-radius: 10px;
  height: 100%;
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
  font-size: 20px;
}

.welcome-desc {
  color: #52616b;
  margin: 0;
  font-size: 13.5px;
}

.kpi-card-primary {
  background: linear-gradient(135deg, #112d4e, #3f72af);
  border-color: #112d4e;
}

.kpi-body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.kpi-info {
  flex: 1;
  min-width: 0;
}

.kpi-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #ffffff;
  flex-shrink: 0;
}

.kpi-icon-navy {
  background: linear-gradient(135deg, #112d4e, #3f72af);
}

.kpi-icon-white {
  background: rgba(255, 255, 255, 0.18);
}

.kpi-icon-gold {
  background: linear-gradient(135deg, #d97706, #f59e0b);
}

.kpi-icon-blue {
  background: linear-gradient(135deg, #2563eb, #3f72af);
}

.kpi-label {
  font-size: 12.5px;
  color: #52616b;
}

.kpi-label-light {
  color: #dbe2ef;
}

.kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #112d4e;
  line-height: 1.3;
}

.kpi-value-light {
  color: #ffffff;
}

.kpi-sub-light {
  font-size: 12px;
  color: #dbe2ef;
}

.kpi-suffix {
  font-size: 12.5px;
  font-weight: 500;
  color: #8c98a4;
}

.kpi-score-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.kpi-rate {
  font-size: 14px;
}

.stacked-bar {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background-color: #f1f5f9;
  margin-bottom: 16px;
}

.stacked-segment {
  height: 100%;
  transition: width 0.3s ease;
}

.status-dist-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-dist-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.status-dot-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.status-count-text {
  color: #52616b;
}

.cash-box {
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid #dbe2ef;
}

.cash-box-income {
  background-color: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.cash-box-expense {
  background-color: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.cash-box-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
}

.cash-box-amount {
  font-size: 19px;
  font-weight: 700;
  margin-top: 4px;
}

.cash-ratio-section {
  margin-top: 14px;
}

.cash-ratio-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.budget-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.budget-mini-item {
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12.5px;
}

.proker-link {
  font-weight: 600;
  color: #3f72af;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feed-item {
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 10px 12px;
  background-color: #f9f7f7;
}

.feed-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.feed-desc {
  font-size: 13px;
  color: #112d4e;
  margin-bottom: 4px;
}

.amount-income {
  font-weight: 700;
  color: #15803d;
}

.amount-expense {
  font-weight: 700;
  color: #dc2626;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.text-muted {
  font-size: 12px;
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

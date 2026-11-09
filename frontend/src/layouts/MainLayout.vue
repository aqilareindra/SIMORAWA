<script setup lang="ts">
import { computed, ref, h, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import {
  DashboardOutlined,
  ProjectOutlined,
  FileSearchOutlined,
  WalletOutlined,
  TeamOutlined,
  BellOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { ROLE_COLORS, ROLE_LABELS, type Role } from '@/types/auth';
import { formatDate } from '@/utils/format';

interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const collapsed = ref(false);
const notifPopoverOpen = ref(false);
const loadingNotifications = ref(false);
const markingAllRead = ref(false);
const unreadNotificationsCount = ref(0);
const notifications = ref<NotificationRecord[]>([]);
let pollInterval: ReturnType<typeof setInterval> | null = null;

async function fetchNotifications() {
  if (!authStore.isAuthenticated) return;
  try {
    const { data } = await api.get<{
      unreadCount: number;
      notifications: NotificationRecord[];
    }>('/notifications');
    unreadNotificationsCount.value = data.unreadCount;
    notifications.value = data.notifications || [];
  } catch {
    // Abaikan jika gagal memuat notifikasi di background
  }
}

async function handleNotificationClick(item: NotificationRecord) {
  if (!item.isRead) {
    try {
      const { data } = await api.patch<{
        unreadCount: number;
      }>(`/notifications/${item.id}/read`);
      item.isRead = true;
      unreadNotificationsCount.value = data.unreadCount;
    } catch {
      item.isRead = true;
      unreadNotificationsCount.value = Math.max(
        0,
        unreadNotificationsCount.value - 1,
      );
    }
  }

  notifPopoverOpen.value = false;
  if (item.link) {
    router.push(item.link);
  }
}

async function handleMarkAllRead() {
  if (unreadNotificationsCount.value === 0) return;
  markingAllRead.value = true;
  try {
    await api.patch('/notifications/read-all');
    notifications.value = notifications.value.map((n) => ({
      ...n,
      isRead: true,
    }));
    unreadNotificationsCount.value = 0;
    message.success('Seluruh notifikasi telah ditandai sudah dibaca.');
  } catch {
    message.error('Gagal menandai seluruh notifikasi.');
  } finally {
    markingAllRead.value = false;
  }
}

watch(notifPopoverOpen, (open) => {
  if (open) {
    loadingNotifications.value = true;
    fetchNotifications().finally(() => {
      loadingNotifications.value = false;
    });
  }
});

watch(
  () => route.fullPath,
  () => {
    fetchNotifications();
  },
);

onMounted(() => {
  fetchNotifications();
  pollInterval = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

interface NavMenuItem {
  key: string;
  label: string;
  icon: any;
  roles: Role[];
}

const allMenuItems: NavMenuItem[] = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: DashboardOutlined,
    roles: ['ADMIN', 'BPH', 'KADIV', 'PIC', 'BENDAHARA', 'SEKRETARIS'],
  },
  {
    key: '/work-programs',
    label: 'Program Kerja',
    icon: ProjectOutlined,
    roles: ['ADMIN', 'BPH', 'KADIV', 'PIC', 'BENDAHARA', 'SEKRETARIS'],
  },
  {
    key: '/evaluations',
    label: 'Evaluasi Proker',
    icon: FileSearchOutlined,
    roles: ['ADMIN', 'BPH', 'KADIV', 'SEKRETARIS'],
  },
  {
    key: '/finance',
    label: 'Anggaran & Kas',
    icon: WalletOutlined,
    roles: ['ADMIN', 'BPH', 'KADIV', 'BENDAHARA', 'SEKRETARIS'],
  },
  {
    key: '/users',
    label: 'Kelola Pengguna',
    icon: TeamOutlined,
    roles: ['ADMIN'],
  },
];

const visibleMenuItems = computed(() => {
  const role = authStore.userRole;
  if (!role) return [];
  return allMenuItems.filter((item) => item.roles.includes(role));
});

const selectedKeys = computed(() => {
  const currentPath = route.path;
  const matched = allMenuItems.find(
    (item) =>
      currentPath === item.key || currentPath.startsWith(`${item.key}/`),
  );
  return matched ? [matched.key] : ['/dashboard'];
});

const currentPageTitle = computed(() => {
  return (route.meta?.title as string) || 'Dashboard';
});

const roleLabel = computed(() => {
  const role = authStore.userRole;
  return role ? ROLE_LABELS[role] : '-';
});

const roleColor = computed(() => {
  const role = authStore.userRole;
  return role ? ROLE_COLORS[role] : 'default';
});

function handleMenuClick({ key }: { key: string }) {
  router.push(key);
}

function handleLogout() {
  Modal.confirm({
    title: 'Konfirmasi Keluar',
    content: 'Apakah Anda yakin ingin keluar dari sesi SIMORAWA?',
    okText: 'Ya, Keluar',
    cancelText: 'Batal',
    okButtonProps: { danger: true },
    async onOk() {
      await authStore.logout();
      message.info('Anda telah keluar dari sistem.');
      router.push('/login');
    },
  });
}
</script>

<template>
  <a-layout class="simorawa-layout">
    <!-- Sidebar Kiri Tetap (#112D4E) -->
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      width="250"
      class="simorawa-sider"
    >
      <div class="sider-brand">
        <div class="brand-logo-circle">S</div>
        <div v-if="!collapsed" class="brand-text-wrap">
          <div class="brand-name">SIMORAWA</div>
          <div class="brand-org">HIMA IF UISI</div>
        </div>
      </div>

      <a-menu
        mode="inline"
        theme="dark"
        :selectedKeys="selectedKeys"
        class="simorawa-menu"
        @click="handleMenuClick"
      >
        <a-menu-item v-for="item in visibleMenuItems" :key="item.key">
          <template #icon>
            <component :is="item.icon" />
          </template>
          <span>{{ item.label }}</span>
        </a-menu-item>
      </a-menu>

      <div v-if="!collapsed" class="sider-footer">
        <div class="sider-role-label">Login sebagai:</div>
        <div class="sider-user-email">{{ authStore.user?.email }}</div>
      </div>
    </a-layout-sider>

    <!-- Area Utama -->
    <a-layout
      :style="{
        marginLeft: collapsed ? '80px' : '250px',
        transition: 'margin-left 0.2s ease',
      }"
    >
      <!-- Topbar Atas (#F9F7F7, border bawah #DBE2EF) -->
      <a-layout-header class="simorawa-topbar">
        <div class="topbar-left">
          <a-button
            type="text"
            class="collapse-btn"
            @click="collapsed = !collapsed"
          >
            <MenuUnfoldOutlined v-if="collapsed" />
            <MenuFoldOutlined v-else />
          </a-button>

          <a-breadcrumb class="topbar-breadcrumb">
            <a-breadcrumb-item>SIMORAWA</a-breadcrumb-item>
            <a-breadcrumb-item class="active-crumb">
              {{ currentPageTitle }}
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <div class="topbar-right">
          <!-- Ikon Lonceng Notifikasi + Unread Badge Real-time -->
          <a-popover
            v-model:open="notifPopoverOpen"
            placement="bottomRight"
            trigger="click"
            overlay-class-name="simorawa-notif-popover"
          >
            <template #title>
              <div class="notif-popover-header">
                <span class="notif-popover-title">
                  Notifikasi ({{ unreadNotificationsCount }} belum dibaca)
                </span>
                <a-button
                  v-if="unreadNotificationsCount > 0"
                  type="link"
                  size="small"
                  :loading="markingAllRead"
                  :icon="h(CheckOutlined)"
                  @click="handleMarkAllRead"
                >
                  Tandai Semua Dibaca
                </a-button>
              </div>
            </template>
            <template #content>
              <a-spin :spinning="loadingNotifications">
                <div v-if="notifications.length > 0" class="notif-list">
                  <div
                    v-for="item in notifications"
                    :key="item.id"
                    class="notif-item"
                    :class="{ 'notif-item-unread': !item.isRead }"
                    @click="handleNotificationClick(item)"
                  >
                    <div class="notif-item-top">
                      <span class="notif-item-title">
                        <span v-if="!item.isRead" class="notif-unread-dot" />
                        {{ item.title }}
                      </span>
                      <span class="notif-item-date">
                        {{ formatDate(item.createdAt) }}
                      </span>
                    </div>
                    <div class="notif-item-msg">{{ item.message }}</div>
                  </div>
                </div>
                <div v-else class="notif-placeholder">
                  Belum ada notifikasi terbaru.
                </div>
              </a-spin>
            </template>
            <a-badge :count="unreadNotificationsCount" :offset="[-2, 2]">
              <a-button
                type="text"
                shape="circle"
                class="notif-bell-btn"
                title="Notifikasi"
              >
                <template #icon>
                  <BellOutlined />
                </template>
              </a-button>
            </a-badge>
          </a-popover>

          <a-divider type="vertical" class="topbar-divider" />

          <!-- Info User & Role Tag -->
          <div class="user-profile-info">
            <a-avatar class="user-avatar" size="small">
              <template #icon><UserOutlined /></template>
            </a-avatar>
            <span class="user-name">{{ authStore.user?.name }}</span>
            <a-tag :color="roleColor" class="role-tag">
              {{ roleLabel }}
            </a-tag>
          </div>

          <!-- Tombol Logout -->
          <a-button
            danger
            size="small"
            class="logout-btn"
            :icon="h(LogoutOutlined)"
            @click="handleLogout"
          >
            Keluar
          </a-button>
        </div>
      </a-layout-header>

      <!-- Konten Halaman (#F9F7F7) -->
      <a-layout-content class="simorawa-content">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.simorawa-layout {
  min-height: 100vh;
  background-color: #f9f7f7;
}

.simorawa-sider {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  background-color: #112d4e !important;
  box-shadow: 2px 0 8px rgba(17, 45, 78, 0.15);
  display: flex;
  flex-direction: column;
}

.sider-brand {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(219, 226, 239, 0.15);
}

.brand-logo-circle {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3f72af 0%, #5b8fd1 100%);
  color: #ffffff;
  font-weight: 800;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-text-wrap {
  overflow: hidden;
  white-space: nowrap;
}

.brand-name {
  color: #ffffff;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.8px;
  line-height: 1.2;
}

.brand-org {
  color: #dbe2ef;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.simorawa-menu {
  background-color: #112d4e !important;
  padding: 12px 8px;
  border-right: none;
}

:deep(.simorawa-menu .ant-menu-item) {
  border-radius: 8px;
  margin-bottom: 6px;
  color: rgba(249, 247, 247, 0.85);
  font-weight: 500;
}

:deep(.simorawa-menu .ant-menu-item:hover) {
  background-color: rgba(63, 114, 175, 0.35) !important;
  color: #ffffff !important;
}

:deep(.simorawa-menu .ant-menu-item-selected) {
  background-color: #3f72af !important;
  color: #ffffff !important;
  font-weight: 600;
}

.sider-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 20px;
  border-top: 1px solid rgba(219, 226, 239, 0.14);
  background-color: rgba(0, 0, 0, 0.12);
}

.sider-role-label {
  font-size: 11px;
  color: rgba(219, 226, 239, 0.7);
}

.sider-user-email {
  font-size: 12px;
  color: #ffffff;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.simorawa-topbar {
  height: 64px;
  background-color: #f9f7f7 !important;
  border-bottom: 1px solid #dbe2ef;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 90;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 18px;
  color: #112d4e;
}

.active-crumb {
  font-weight: 600;
  color: #112d4e;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notif-bell-btn {
  color: #112d4e;
  font-size: 17px;
}

.notif-placeholder {
  font-size: 13px;
  color: #52616b;
  padding: 16px 8px;
  text-align: center;
  width: 340px;
}

.notif-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 350px;
}

.notif-popover-title {
  font-weight: 700;
  color: #112d4e;
  font-size: 13.5px;
}

.notif-list {
  width: 350px;
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notif-item {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #dbe2ef;
  background-color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.notif-item:hover {
  background-color: #f1f5f9;
}

.notif-item-unread {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.notif-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.notif-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #112d4e;
  display: flex;
  align-items: center;
  gap: 6px;
}

.notif-unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #3f72af;
  flex-shrink: 0;
}

.notif-item-date {
  font-size: 11px;
  color: #8c98a4;
  white-space: nowrap;
}

.notif-item-msg {
  font-size: 12.5px;
  color: #52616b;
  line-height: 1.45;
}

.topbar-divider {
  border-color: #dbe2ef;
  height: 24px;
}

.user-profile-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background-color: #3f72af;
}

.user-name {
  font-weight: 600;
  color: #112d4e;
  font-size: 14px;
}

.role-tag {
  margin-inline-end: 0;
  font-weight: 600;
}

.logout-btn {
  margin-left: 4px;
}

.simorawa-content {
  padding: 24px;
  background-color: #f9f7f7;
  min-height: calc(100vh - 64px);
}
</style>

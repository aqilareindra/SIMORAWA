<script setup lang="ts">
import { computed, onMounted, reactive, ref, h } from 'vue';
import { message } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import {
  ROLE_COLORS,
  ROLE_LABELS,
  type Role,
  type User,
} from '@/types/auth';

const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(false);
const togglingId = ref<string | null>(null);

const filters = reactive<{
  search: string;
  role: Role | undefined;
  isActive: string | undefined;
}>({
  search: '',
  role: undefined,
  isActive: undefined,
});

const modalVisible = ref(false);
const modalSubmitting = ref(false);
const isEditMode = ref(false);
const editingUserId = ref<string | null>(null);
const formRef = ref();

const formState = reactive<{
  name: string;
  email: string;
  role: Role;
  password: string;
  isActive: boolean;
}>({
  name: '',
  email: '',
  role: 'PIC',
  password: '',
  isActive: true,
});

const roleOptions = (Object.keys(ROLE_LABELS) as Role[]).map((role) => ({
  value: role,
  label: `${ROLE_LABELS[role]} (${role})`,
}));

const columns = [
  {
    title: 'Nama Lengkap',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Email Institusi',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Peran (Role)',
    dataIndex: 'role',
    key: 'role',
    width: 170,
  },
  {
    title: 'Status Akun',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 190,
  },
  {
    title: 'Terdaftar Pada',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 170,
  },
  {
    title: 'Aksi',
    key: 'actions',
    width: 120,
    align: 'center' as const,
  },
];

const formRules = computed<Record<string, Rule[]>>(() => ({
  name: [{ required: true, message: 'Nama lengkap wajib diisi' }],
  email: [
    { required: true, message: 'Email wajib diisi' },
    { type: 'email', message: 'Format email tidak valid' },
  ],
  role: [{ required: true, message: 'Peran (Role) wajib dipilih' }],
  password: isEditMode.value
    ? [
        {
          validator: async (_rule: Rule, value: string) => {
            if (value && value.trim().length > 0 && value.length < 12) {
              return Promise.reject(
                new Error('Password baru minimal harus 12 karakter'),
              );
            }
            return Promise.resolve();
          },
          trigger: 'change',
        },
      ]
    : [
        { required: true, message: 'Password wajib diisi' },
        { min: 12, message: 'Password minimal harus 12 karakter (NFR-02)' },
      ],
}));

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.role) {
      params.role = filters.role;
    }
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.isActive = filters.isActive;
    }

    const { data } = await api.get<User[]>('/users', { params });
    users.value = data;
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal memuat daftar pengguna.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.role = undefined;
  filters.isActive = undefined;
  fetchUsers();
}

function openCreateModal() {
  isEditMode.value = false;
  editingUserId.value = null;
  formState.name = '';
  formState.email = '';
  formState.role = 'PIC';
  formState.password = '';
  formState.isActive = true;
  modalVisible.value = true;
}

function openEditModal(record: User) {
  isEditMode.value = true;
  editingUserId.value = record.id;
  formState.name = record.name;
  formState.email = record.email;
  formState.role = record.role;
  formState.password = '';
  formState.isActive = record.isActive;
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
    if (isEditMode.value && editingUserId.value) {
      const payload: Record<string, any> = {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        isActive: formState.isActive,
      };
      if (formState.password.trim()) {
        payload.password = formState.password;
      }

      await api.patch(`/users/${editingUserId.value}`, payload);
      message.success('Data pengguna berhasil diperbarui.');

      if (editingUserId.value === authStore.user?.id) {
        await authStore.fetchProfile();
      }
    } else {
      await api.post('/users', {
        name: formState.name.trim(),
        email: formState.email.trim(),
        role: formState.role,
        password: formState.password,
        isActive: formState.isActive,
      });
      message.success('Akun pengguna baru berhasil ditambahkan.');
    }

    modalVisible.value = false;
    await fetchUsers();
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal menyimpan data pengguna.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    modalSubmitting.value = false;
  }
}

async function handleToggleStatus(record: User, checked: boolean) {
  if (record.id === authStore.user?.id && !checked) {
    message.warning('Anda tidak dapat menonaktifkan akun Anda sendiri.');
    return;
  }

  togglingId.value = record.id;
  try {
    await api.patch(`/users/${record.id}/status`, {
      isActive: checked,
    });
    record.isActive = checked;
    message.success(
      `Status akun ${record.name} diubah menjadi ${
        checked ? 'Aktif' : 'Nonaktif'
      }.`,
    );
  } catch (err: any) {
    const msg =
      err?.response?.data?.message || 'Gagal mengubah status pengguna.';
    message.error(Array.isArray(msg) ? msg.join(', ') : msg);
  } finally {
    togglingId.value = null;
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

function getRowClassName(_record: User, index: number) {
  return index % 2 === 1 ? 'striped-row' : '';
}

onMounted(() => {
  fetchUsers();
});
</script>

<template>
  <div class="user-management-page">
    <!-- Header Halaman -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Kelola Pengguna</h2>
        <p class="page-subtitle">
          Manajemen akun pengurus HIMA IF UISI, hak akses peran (RBAC), dan
          status keaktifan akun.
        </p>
      </div>

      <a-button
        type="primary"
        size="large"
        :icon="h(PlusOutlined)"
        class="primary-action-btn"
        @click="openCreateModal"
      >
        Tambah Pengguna
      </a-button>
    </div>

    <!-- Bar Pencarian & Filter -->
    <a-card class="filter-card" :bordered="true">
      <div class="filter-toolbar">
        <a-input
          v-model:value="filters.search"
          placeholder="Cari nama atau email pengguna..."
          allow-clear
          class="search-input"
          @pressEnter="fetchUsers"
        >
          <template #prefix>
            <SearchOutlined style="color: #3f72af" />
          </template>
        </a-input>

        <a-select
          v-model:value="filters.role"
          placeholder="Filter Peran (Role)"
          allow-clear
          class="role-select"
          :options="roleOptions"
          @change="fetchUsers"
        />

        <a-select
          v-model:value="filters.isActive"
          placeholder="Filter Status"
          allow-clear
          class="status-select"
          @change="fetchUsers"
        >
          <a-select-option value="true">Aktif</a-select-option>
          <a-select-option value="false">Nonaktif</a-select-option>
        </a-select>

        <a-button type="primary" @click="fetchUsers">Terapkan</a-button>
        <a-button :icon="h(ReloadOutlined)" @click="resetFilters">
          Reset
        </a-button>
      </div>
    </a-card>

    <!-- Tabel Pengguna (Striped Table) -->
    <a-card class="table-card" :bordered="true">
      <a-table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        row-key="id"
        :row-class-name="getRowClassName"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
        bordered
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="user-name-cell">
              <span class="fw-semibold">{{ record.name }}</span>
              <a-tag
                v-if="record.id === authStore.user?.id"
                color="processing"
                class="self-badge"
              >
                Anda
              </a-tag>
            </div>
          </template>

          <template v-else-if="column.key === 'role'">
            <a-tag :color="ROLE_COLORS[record.role as Role]">
              {{ ROLE_LABELS[record.role as Role] }} ({{ record.role }})
            </a-tag>
          </template>

          <template v-else-if="column.key === 'isActive'">
            <div class="status-cell">
              <a-switch
                :checked="record.isActive"
                :loading="togglingId === record.id"
                :disabled="record.id === authStore.user?.id"
                checked-children="Aktif"
                un-checked-children="Nonaktif"
                @change="(checked: boolean) => handleToggleStatus(record as User, checked)"
              />
              <a-badge
                :status="record.isActive ? 'success' : 'error'"
                :text="record.isActive ? 'Aktif' : 'Nonaktif'"
              />
            </div>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <a-button
              type="link"
              size="small"
              :icon="h(EditOutlined)"
              @click="openEditModal(record as User)"
            >
              Edit
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Modal Tambah / Edit Pengguna -->
    <a-modal
      v-model:open="modalVisible"
      :title="isEditMode ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'"
      :confirm-loading="modalSubmitting"
      ok-text="Simpan"
      cancel-text="Batal"
      destroy-on-close
      @ok="handleSubmitModal"
    >
      <a-form
        ref="formRef"
        layout="vertical"
        :model="formState"
        :rules="formRules"
        class="user-modal-form"
      >
        <a-form-item label="Nama Lengkap" name="name">
          <a-input
            v-model:value="formState.name"
            placeholder="Masukkan nama lengkap pengurus"
          />
        </a-form-item>

        <a-form-item label="Email Institusi" name="email">
          <a-input
            v-model:value="formState.email"
            placeholder="contoh: nama@uisi.ac.id"
          />
        </a-form-item>

        <a-form-item label="Peran (Role)" name="role">
          <a-select
            v-model:value="formState.role"
            :options="roleOptions"
            placeholder="Pilih peran pengguna"
          />
        </a-form-item>

        <a-form-item
          :label="
            isEditMode
              ? 'Password Baru (Kosongkan jika tidak ingin mengubah)'
              : 'Password (Minimal 12 Karakter)'
          "
          name="password"
        >
          <a-input-password
            v-model:value="formState.password"
            :placeholder="
              isEditMode
                ? 'Isi minimal 12 karakter jika ingin mengganti password'
                : 'Minimal 12 karakter (NFR-02)'
            "
          />
        </a-form-item>

        <a-form-item label="Status Keaktifan Akun" name="isActive">
          <div class="switch-form-row">
            <a-switch
              v-model:checked="formState.isActive"
              :disabled="
                isEditMode && editingUserId === authStore.user?.id
              "
              checked-children="Aktif"
              un-checked-children="Nonaktif"
            />
            <span class="switch-hint">
              {{
                isEditMode && editingUserId === authStore.user?.id
                  ? 'Akun Admin yang sedang digunakan tidak dapat dinonaktifkan.'
                  : 'Akun berstatus Nonaktif akan ditolak saat mencoba login.'
              }}
            </span>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.user-management-page {
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

.filter-card,
.table-card {
  border-color: #dbe2ef;
  border-radius: 10px;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 280px;
}

.role-select {
  width: 210px;
}

.status-select {
  width: 150px;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fw-semibold {
  font-weight: 600;
  color: #112d4e;
}

.self-badge {
  margin-inline-end: 0;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-modal-form {
  margin-top: 12px;
}

.switch-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.switch-hint {
  font-size: 12.5px;
  color: #52616b;
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

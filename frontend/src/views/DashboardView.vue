<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS } from '@/types/auth';

const authStore = useAuthStore();
</script>

<template>
  <div class="placeholder-page">
    <a-card class="welcome-card" :bordered="true">
      <h2 class="welcome-title">
        Selamat Datang di SIMORAWA, {{ authStore.user?.name }}!
      </h2>
      <p class="welcome-desc">
        Anda masuk sebagai
        <strong>{{
          authStore.userRole ? ROLE_LABELS[authStore.userRole] : '-'
        }}</strong>
        ({{ authStore.user?.email }}). Modul Statistik Dashboard Monitoring Utama
        (FR-16) akan diintegrasikan secara penuh pada Fase 3.2.
      </p>
    </a-card>
  </div>
</template>

<style scoped>
.welcome-card {
  border-color: #dbe2ef;
  border-radius: 10px;
}

.welcome-title {
  color: #112d4e;
  font-weight: 700;
  margin-bottom: 8px;
}

.welcome-desc {
  color: #52616b;
  margin: 0;
}
</style>

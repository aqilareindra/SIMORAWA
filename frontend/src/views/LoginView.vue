<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ProjectOutlined,
  FundProjectionScreenOutlined,
  BellOutlined,
} from '@ant-design/icons-vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const formState = reactive({
  email: '',
  password: '',
});

const errorMessage = ref<string | null>(null);

async function handleLogin() {
  errorMessage.value = null;

  if (!formState.email.trim() || !formState.password) {
    errorMessage.value = 'Email dan password wajib diisi.';
    return;
  }

  try {
    const user = await authStore.login(
      formState.email.trim(),
      formState.password,
    );
    message.success(`Selamat datang, ${user.name}!`);
    await router.push('/dashboard');
  } catch (err: any) {
    const backendMessage = err?.response?.data?.message;
    if (Array.isArray(backendMessage)) {
      errorMessage.value = backendMessage.join(', ');
    } else if (typeof backendMessage === 'string' && backendMessage.trim()) {
      errorMessage.value = backendMessage;
    } else {
      errorMessage.value =
        'Gagal masuk ke sistem. Periksa kembali email dan password Anda.';
    }
  }
}
</script>

<template>
  <div class="login-split-container">
    <!-- Sisi Kiri: Branding SIMORAWA dengan Gradien #112D4E ke #3F72AF -->
    <div class="login-brand-panel">
      <div class="brand-content">
        <div class="brand-badge">HIMA INFORMATIKA UISI</div>
        <h1 class="brand-title">SIMORAWA</h1>
        <p class="brand-subtitle">
          Sistem Informasi Manajemen Program Kerja Himpunan Mahasiswa
          Informatika Universitas Internasional Semen Indonesia
        </p>

        <div class="feature-list">
          <div class="feature-item">
            <ProjectOutlined class="feature-icon" />
            <div>
              <div class="feature-title">Monitoring Program Kerja & Dokumen</div>
              <div class="feature-desc">
                Kelola siklus hidup proker, KAK, laporan progres PIC, dan LPJ
                secara terpusat.
              </div>
            </div>
          </div>

          <div class="feature-item">
            <FundProjectionScreenOutlined class="feature-icon" />
            <div>
              <div class="feature-title">Evaluasi KPI/KPA & Manajemen Kas</div>
              <div class="feature-desc">
                Standarisasi penilaian indikator proker serta transparansi
                anggaran dan saldo kas organisasi.
              </div>
            </div>
          </div>

          <div class="feature-item">
            <BellOutlined class="feature-icon" />
            <div>
              <div class="feature-title">Pengingat Otomatis H-30</div>
              <div class="feature-desc">
                Notifikasi terjadwal via panel aplikasi dan email institusi
                sebelum tenggat waktu kegiatan.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="brand-footer">
        <SafetyCertificateOutlined />
        <span>Ekosistem Digital Terintegrasi HIMA IF UISI &copy; 2026</span>
      </div>
    </div>

    <!-- Sisi Kanan: Form Login Minimalis di atas #F9F7F7 -->
    <div class="login-form-panel">
      <div class="login-card">
        <div class="login-header">
          <h2 class="login-heading">Masuk ke SIMORAWA</h2>
          <p class="login-description">
            Gunakan akun email institusi UISI yang telah terdaftar sesuai peran
            kepengurusan Anda.
          </p>
        </div>

        <a-alert
          v-if="errorMessage"
          :message="errorMessage"
          type="error"
          show-icon
          closable
          class="login-alert"
          @close="errorMessage = null"
        />

        <a-form
          layout="vertical"
          :model="formState"
          @finish="handleLogin"
          class="login-form"
        >
          <a-form-item
            label="Email Institusi"
            name="email"
            :rules="[
              { required: true, message: 'Email wajib diisi' },
              { type: 'email', message: 'Format email tidak valid' },
            ]"
          >
            <a-input
              v-model:value="formState.email"
              size="large"
              placeholder="contoh: admin@uisi.ac.id"
              autocomplete="email"
            >
              <template #prefix>
                <MailOutlined class="input-icon" />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            label="Kata Sandi (Password)"
            name="password"
            :rules="[{ required: true, message: 'Password wajib diisi' }]"
          >
            <a-input-password
              v-model:value="formState.password"
              size="large"
              placeholder="Masukkan kata sandi Anda"
              autocomplete="current-password"
            >
              <template #prefix>
                <LockOutlined class="input-icon" />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item class="submit-item">
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="authStore.loading"
              class="login-submit-btn"
            >
              Masuk Sekarang
            </a-button>
          </a-form-item>
        </a-form>

        <div class="login-help-box">
          <div class="help-title">Informasi Akses Pengurus</div>
          <div class="help-text">
            Jika akun Anda belum aktif atau lupa kata sandi, silakan hubungi
            <strong>Administrator SIMORAWA</strong>.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-split-container {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: #f9f7f7;
}

.login-brand-panel {
  flex: 1.1;
  background: linear-gradient(135deg, #112d4e 0%, #3f72af 100%);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 56px 64px;
  position: relative;
  overflow: hidden;
}

.brand-content {
  max-width: 540px;
  margin: auto 0;
}

.brand-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(219, 226, 239, 0.35);
  color: #f9f7f7;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.2px;
  margin-bottom: 20px;
}

.brand-title {
  font-size: 44px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 12px 0;
  letter-spacing: 1px;
}

.brand-subtitle {
  font-size: 16px;
  line-height: 1.6;
  color: rgba(249, 247, 247, 0.9);
  margin: 0 0 40px 0;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: rgba(17, 45, 78, 0.28);
  border: 1px solid rgba(219, 226, 239, 0.2);
  padding: 16px 18px;
  border-radius: 10px;
}

.feature-icon {
  font-size: 22px;
  color: #dbe2ef;
  margin-top: 2px;
}

.feature-title {
  font-weight: 600;
  font-size: 15px;
  color: #ffffff;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 13px;
  color: rgba(249, 247, 247, 0.82);
  line-height: 1.5;
}

.brand-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(219, 226, 239, 0.85);
}

.login-form-panel {
  flex: 0.9;
  background-color: #f9f7f7;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}

.login-card {
  width: 100%;
  max-width: 430px;
  background: #ffffff;
  border: 1px solid #dbe2ef;
  border-radius: 12px;
  padding: 40px 36px;
  box-shadow: 0 8px 28px rgba(17, 45, 78, 0.06);
}

.login-header {
  margin-bottom: 28px;
}

.login-heading {
  font-size: 26px;
  font-weight: 700;
  color: #112d4e;
  margin: 0 0 8px 0;
}

.login-description {
  font-size: 14px;
  color: #52616b;
  margin: 0;
  line-height: 1.5;
}

.login-alert {
  margin-bottom: 20px;
}

.input-icon {
  color: #3f72af;
}

.submit-item {
  margin-top: 8px;
  margin-bottom: 20px;
}

.login-submit-btn {
  background-color: #3f72af;
  border-color: #3f72af;
  font-weight: 600;
  height: 44px;
}

.login-submit-btn:hover,
.login-submit-btn:focus {
  background-color: #112d4e !important;
  border-color: #112d4e !important;
}

.login-help-box {
  background-color: #f9f7f7;
  border: 1px solid #dbe2ef;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 12.5px;
}

.help-title {
  font-weight: 600;
  color: #112d4e;
  margin-bottom: 3px;
}

.help-text {
  color: #52616b;
  line-height: 1.45;
}

@media (max-width: 960px) {
  .login-split-container {
    flex-direction: column;
  }

  .login-brand-panel {
    padding: 36px 28px;
  }

  .brand-title {
    font-size: 32px;
  }

  .login-form-panel {
    padding: 28px 20px;
  }
}
</style>

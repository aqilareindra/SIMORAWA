import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import api from '@/services/api';
import type { LoginResponse, Role, User } from '@/types/auth';

const TOKEN_STORAGE_KEY = 'simorawa_token';
const USER_STORAGE_KEY = 'simorawa_user';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );
  const user = ref<User | null>(loadStoredUser());
  const loading = ref(false);

  const isAuthenticated = computed(
    () => Boolean(accessToken.value && user.value),
  );
  const userRole = computed<Role | null>(() => user.value?.role ?? null);

  function setSession(token: string, userData: User) {
    accessToken.value = token;
    user.value = userData;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }

  function clearSession() {
    accessToken.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  async function login(email: string, password: string): Promise<User> {
    loading.value = true;
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      setSession(data.accessToken, data.user);
      return data.user;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProfile(): Promise<User | null> {
    if (!accessToken.value) {
      clearSession();
      return null;
    }

    try {
      const { data } = await api.get<User>('/auth/me');
      user.value = data;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch {
      clearSession();
      return null;
    }
  }

  async function logout(): Promise<void> {
    try {
      if (accessToken.value) {
        await api.post('/auth/logout');
      }
    } catch {
      // Abaikan error jaringan saat logout agar sesi client tetap bersih
    } finally {
      clearSession();
    }
  }

  return {
    accessToken,
    user,
    loading,
    isAuthenticated,
    userRole,
    setSession,
    clearSession,
    login,
    fetchProfile,
    logout,
  };
});

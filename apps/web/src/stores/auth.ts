import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/client';

interface User {
  id: string;
  clinicId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  twoFactorEnabled: boolean;
  clinic?: {
    id: string;
    name: string;
    subdomain: string;
    logo?: string;
  };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const initialized = ref(false);
  const loading = ref(false);
  const pendingUserId = ref<string | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

  async function initialize() {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken;
      refreshToken.value = storedRefreshToken;

      try {
        await fetchUser();
      } catch {
        logout();
      }
    }

    initialized.value = true;
  }

  async function login(email: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      const data = response.data;

      if (data.requires2FA) {
        pendingUserId.value = data.userId;
        return { requires2FA: true };
      }

      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      user.value = data.user;

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  async function verify2FA(code: string) {
    if (!pendingUserId.value) {
      throw new Error('No pending 2FA verification');
    }

    loading.value = true;
    try {
      const response = await api.post('/auth/2fa/verify', {
        userId: pendingUserId.value,
        code,
      });

      setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
      await fetchUser();
      pendingUserId.value = null;

      return { success: true };
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    const response = await api.get('/auth/me');
    user.value = response.data.user;
  }

  async function refreshTokens() {
    if (!refreshToken.value) {
      throw new Error('No refresh token');
    }

    const response = await api.post('/auth/refresh', {
      refreshToken: refreshToken.value,
    });

    setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
  }

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  async function logout() {
    try {
      if (accessToken.value) {
        await api.post('/auth/logout');
      }
    } catch {
      // Ignore errors during logout
    } finally {
      user.value = null;
      accessToken.value = null;
      refreshToken.value = null;
      pendingUserId.value = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async function forgotPassword(email: string) {
    loading.value = true;
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(token: string, password: string) {
    loading.value = true;
    try {
      await api.post('/auth/reset-password', { token, password });
    } finally {
      loading.value = false;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    loading.value = true;
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    accessToken,
    refreshToken,
    initialized,
    loading,
    pendingUserId,
    isAuthenticated,
    initialize,
    login,
    verify2FA,
    fetchUser,
    refreshTokens,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
  };
});

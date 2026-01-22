<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

const { t } = useI18n();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

onMounted(() => {
  // Check if already logged in
  const adminToken = localStorage.getItem('adminAccessToken');
  if (adminToken) {
    router.push('/admin');
  }
});

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    const response = await api.post('/admin/auth/login', {
      email: email.value,
      password: password.value,
    });

    if (response.data.tokens) {
      localStorage.setItem('adminAccessToken', response.data.tokens.accessToken);
      localStorage.setItem('adminRefreshToken', response.data.tokens.refreshToken);
      router.push('/admin');
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-white">{{ t('common.appName') }}</h1>
        <h2 class="mt-4 text-xl font-semibold text-gray-300">{{ t('admin.login') }}</h2>
      </div>

      <form class="mt-8 space-y-6 bg-gray-800 rounded-lg p-8" @submit.prevent="handleSubmit">
        <div v-if="error" class="bg-red-900/50 text-red-300 px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-300">
              {{ t('auth.email') }}
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="admin@exemplo.com"
            />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-300">
              {{ t('auth.password') }}
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {{ loading ? t('auth.signingIn') : t('auth.signIn') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const code = ref('');
const error = ref('');

// Redirect if no pending 2FA
if (!authStore.pendingUserId) {
  router.push({ name: 'login' });
}

async function handleSubmit() {
  error.value = '';

  try {
    await authStore.verify2FA(code.value);
    router.push('/');
  } catch (e: any) {
    error.value = e.response?.data?.error || t('auth.invalidCredentials');
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h1 class="text-center text-3xl font-bold text-primary">{{ t('common.appName') }}</h1>
        <h2 class="mt-6 text-center text-2xl font-semibold text-gray-900">
          {{ t('auth.twoFactorAuth') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          {{ t('auth.enterCode') }}
        </p>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div>
          <label for="code" class="block text-sm font-medium text-gray-700">
            {{ t('auth.authCode') }}
          </label>
          <input
            id="code"
            v-model="code"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="6"
            required
            class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest"
            placeholder="000000"
          />
        </div>

        <button
          type="submit"
          :disabled="authStore.loading || code.length !== 6"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ authStore.loading ? t('auth.verifying') : t('auth.verify') }}
        </button>

        <div class="text-center">
          <router-link
            :to="{ name: 'login' }"
            class="text-sm text-primary hover:text-primary/80"
          >
            {{ t('auth.backToLogin') }}
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

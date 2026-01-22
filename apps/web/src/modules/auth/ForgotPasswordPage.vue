<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const authStore = useAuthStore();

const email = ref('');
const submitted = ref(false);
const error = ref('');

async function handleSubmit() {
  error.value = '';

  try {
    await authStore.forgotPassword(email.value);
    submitted.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.error || t('common.error');
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h1 class="text-center text-3xl font-bold text-primary">{{ t('common.appName') }}</h1>
        <h2 class="mt-6 text-center text-2xl font-semibold text-gray-900">
          {{ t('auth.resetPassword') }}
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Digite seu e-mail e enviaremos um link para redefinir sua senha
        </p>
      </div>

      <div v-if="submitted" class="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
        <p class="font-medium">{{ t('auth.checkEmail') }}</p>
        <p class="mt-1">
          {{ t('auth.resetEmailSent') }}
        </p>
      </div>

      <form v-else class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            {{ t('auth.email') }}
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="voce@exemplo.com"
          />
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ authStore.loading ? t('auth.sending') : t('auth.sendResetLink') }}
        </button>
      </form>

      <div class="text-center">
        <router-link
          :to="{ name: 'login' }"
          class="text-sm text-primary hover:text-primary/80"
        >
          {{ t('auth.backToLogin') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const showPassword = ref(false);

async function handleSubmit() {
  error.value = '';

  try {
    const result = await authStore.login(email.value, password.value, rememberMe.value);

    if (result.requires2FA) {
      router.push({ name: '2fa' });
    } else {
      const redirect = route.query.redirect as string;
      router.push(redirect || '/');
    }
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
          {{ t('auth.signInToAccount') }}
        </h2>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
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

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              {{ t('auth.password') }}
            </label>
            <div class="relative mt-1">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                :placeholder="t('auth.password')"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3"
                @click="showPassword = !showPassword"
              >
                <span class="text-gray-400 text-sm">
                  {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <input
              id="remember-me"
              v-model="rememberMe"
              type="checkbox"
              class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label for="remember-me" class="ml-2 block text-sm text-gray-900">
              {{ t('auth.rememberMe') }}
            </label>
          </div>

          <div class="text-sm">
            <router-link
              :to="{ name: 'forgot-password' }"
              class="font-medium text-primary hover:text-primary/80"
            >
              {{ t('auth.forgotPassword') }}
            </router-link>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.loading"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ authStore.loading ? t('auth.signingIn') : t('auth.signIn') }}
        </button>
      </form>
    </div>
  </div>
</template>

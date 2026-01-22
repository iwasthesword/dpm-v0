<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const password = ref('');
const confirmPassword = ref('');
const showPassword = ref(false);
const error = ref('');
const success = ref(false);

const token = computed(() => route.query.token as string);

// Redirect if no token
if (!token.value) {
  router.push({ name: 'login' });
}

const passwordsMatch = computed(() => password.value === confirmPassword.value);

const passwordRequirements = computed(() => ({
  minLength: password.value.length >= 8,
  hasUppercase: /[A-Z]/.test(password.value),
  hasLowercase: /[a-z]/.test(password.value),
  hasNumber: /[0-9]/.test(password.value),
  hasSpecial: /[^A-Za-z0-9]/.test(password.value),
}));

const isPasswordValid = computed(() =>
  Object.values(passwordRequirements.value).every(Boolean)
);

async function handleSubmit() {
  error.value = '';

  if (!passwordsMatch.value) {
    error.value = t('auth.passwordsDoNotMatch');
    return;
  }

  if (!isPasswordValid.value) {
    error.value = t('validation.passwordTooWeak');
    return;
  }

  try {
    await authStore.resetPassword(token.value, password.value);
    success.value = true;
    setTimeout(() => {
      router.push({ name: 'login' });
    }, 3000);
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
          {{ t('auth.createNewPassword') }}
        </h2>
      </div>

      <div v-if="success" class="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
        <p class="font-medium">{{ t('auth.passwordResetSuccess') }}</p>
        <p class="mt-1">{{ t('auth.redirectingToLogin') }}</p>
      </div>

      <form v-else class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              {{ t('auth.newPassword') }}
            </label>
            <div class="relative mt-1">
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
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

          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">
              {{ t('auth.confirmPassword') }}
            </label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              :type="showPassword ? 'text' : 'password'"
              required
              class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div class="text-sm space-y-1">
            <p class="font-medium text-gray-700">{{ t('auth.passwordRequirements') }}</p>
            <ul class="space-y-1">
              <li :class="passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'">
                {{ passwordRequirements.minLength ? '✓' : '○' }} {{ t('auth.minLength') }}
              </li>
              <li :class="passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'">
                {{ passwordRequirements.hasUppercase ? '✓' : '○' }} {{ t('auth.hasUppercase') }}
              </li>
              <li :class="passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'">
                {{ passwordRequirements.hasLowercase ? '✓' : '○' }} {{ t('auth.hasLowercase') }}
              </li>
              <li :class="passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'">
                {{ passwordRequirements.hasNumber ? '✓' : '○' }} {{ t('auth.hasNumber') }}
              </li>
              <li :class="passwordRequirements.hasSpecial ? 'text-green-600' : 'text-gray-500'">
                {{ passwordRequirements.hasSpecial ? '✓' : '○' }} {{ t('auth.hasSpecial') }}
              </li>
            </ul>
          </div>
        </div>

        <button
          type="submit"
          :disabled="authStore.loading || !isPasswordValid || !passwordsMatch"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ authStore.loading ? t('auth.resetting') : t('auth.resetPassword') }}
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

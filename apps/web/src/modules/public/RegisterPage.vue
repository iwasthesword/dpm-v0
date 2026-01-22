<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
}

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const plans = ref<Plan[]>([]);
const selectedPlanId = ref<string>('');
const loading = ref(false);
const checkingSubdomain = ref(false);
const subdomainAvailable = ref<boolean | null>(null);
const error = ref('');

// Form data
const form = ref({
  clinicName: '',
  subdomain: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
  phone: '',
  cnpj: '',
  acceptTerms: false,
});

// Password validation
const passwordChecks = computed(() => ({
  minLength: form.value.adminPassword.length >= 8,
  hasUppercase: /[A-Z]/.test(form.value.adminPassword),
  hasLowercase: /[a-z]/.test(form.value.adminPassword),
  hasNumber: /\d/.test(form.value.adminPassword),
}));

const isPasswordValid = computed(() =>
  Object.values(passwordChecks.value).every(Boolean)
);

const passwordsMatch = computed(() =>
  form.value.adminPassword === form.value.confirmPassword
);

// Subdomain validation
const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,18}[a-z0-9])?$/;
const isSubdomainValid = computed(() =>
  subdomainRegex.test(form.value.subdomain)
);

// Form validation
const isFormValid = computed(() =>
  form.value.clinicName &&
  form.value.subdomain &&
  isSubdomainValid.value &&
  subdomainAvailable.value === true &&
  form.value.adminName &&
  form.value.adminEmail &&
  isPasswordValid.value &&
  passwordsMatch.value &&
  form.value.phone &&
  form.value.acceptTerms
);

// Auto-generate subdomain from clinic name
watch(() => form.value.clinicName, (newVal) => {
  if (!form.value.subdomain || form.value.subdomain === generateSubdomain(form.value.clinicName.slice(0, -1))) {
    form.value.subdomain = generateSubdomain(newVal);
  }
});

function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
}

// Check subdomain availability with debounce
let subdomainCheckTimeout: ReturnType<typeof setTimeout>;
watch(() => form.value.subdomain, async (newVal) => {
  subdomainAvailable.value = null;
  clearTimeout(subdomainCheckTimeout);

  if (!newVal || !isSubdomainValid.value) return;

  checkingSubdomain.value = true;
  subdomainCheckTimeout = setTimeout(async () => {
    try {
      const response = await api.get(`/public/check-subdomain/${newVal}`);
      subdomainAvailable.value = response.data.available;
    } catch {
      subdomainAvailable.value = null;
    } finally {
      checkingSubdomain.value = false;
    }
  }, 500);
});

onMounted(async () => {
  // Redirect if already authenticated
  if (authStore.isAuthenticated) {
    router.push('/');
    return;
  }

  // Load plans
  try {
    const response = await api.get('/public/plans');
    plans.value = response.data.plans;

    // Set selected plan from query or default to first plan
    const queryPlan = route.query.plan as string;
    if (queryPlan && plans.value.some(p => p.id === queryPlan)) {
      selectedPlanId.value = queryPlan;
    } else if (plans.value.length > 0) {
      selectedPlanId.value = plans.value[0].id;
    }
  } catch {
    console.error('Failed to load plans');
  }
});

async function handleSubmit() {
  if (!isFormValid.value) return;

  loading.value = true;
  error.value = '';

  try {
    const response = await api.post('/public/register', {
      clinicName: form.value.clinicName,
      subdomain: form.value.subdomain,
      adminName: form.value.adminName,
      adminEmail: form.value.adminEmail,
      adminPassword: form.value.adminPassword,
      phone: form.value.phone,
      cnpj: form.value.cnpj || undefined,
    });

    // Store tokens and redirect to onboarding
    if (response.data.tokens) {
      localStorage.setItem('accessToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      await authStore.initialize();
      router.push('/onboarding');
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || t('register.registrationFailed');
  } finally {
    loading.value = false;
  }
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function handlePhoneInput(e: Event) {
  const input = e.target as HTMLInputElement;
  form.value.phone = formatPhone(input.value);
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <router-link to="/landing" class="inline-block mb-4">
          <h1 class="text-3xl font-bold text-primary">{{ t('common.appName') }}</h1>
        </router-link>
        <h2 class="text-2xl font-semibold text-gray-900">{{ t('register.title') }}</h2>
        <p class="mt-2 text-gray-600">{{ t('register.subtitle') }}</p>
      </div>

      <!-- Registration Form -->
      <form @submit.prevent="handleSubmit" class="bg-white shadow-sm rounded-lg p-8 space-y-6">
        <!-- Error Alert -->
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <!-- Clinic Information -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('register.clinicInfo') }}</h3>
          <div class="space-y-4">
            <div>
              <label for="clinicName" class="block text-sm font-medium text-gray-700">
                {{ t('register.clinicName') }} *
              </label>
              <input
                id="clinicName"
                v-model="form.clinicName"
                type="text"
                required
                class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                :placeholder="t('register.clinicNamePlaceholder')"
              />
            </div>

            <div>
              <label for="subdomain" class="block text-sm font-medium text-gray-700">
                {{ t('register.subdomain') }} *
              </label>
              <div class="mt-1 flex rounded-md shadow-sm">
                <input
                  id="subdomain"
                  v-model="form.subdomain"
                  type="text"
                  required
                  class="flex-1 block w-full px-3 py-2 border border-input rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  :class="{
                    'border-green-500': subdomainAvailable === true,
                    'border-red-500': subdomainAvailable === false || (form.subdomain && !isSubdomainValid),
                  }"
                  placeholder="minha-clinica"
                />
                <span class="inline-flex items-center px-3 border border-l-0 border-input bg-gray-50 text-gray-500 rounded-r-md text-sm">
                  .dpm.app
                </span>
              </div>
              <div class="mt-1 text-sm">
                <span v-if="checkingSubdomain" class="text-gray-500">{{ t('register.checkingAvailability') }}</span>
                <span v-else-if="!isSubdomainValid && form.subdomain" class="text-red-600">{{ t('register.invalidSubdomain') }}</span>
                <span v-else-if="subdomainAvailable === true" class="text-green-600">{{ t('register.subdomainAvailable') }}</span>
                <span v-else-if="subdomainAvailable === false" class="text-red-600">{{ t('register.subdomainTaken') }}</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-700">
                  {{ t('common.phone') }} *
                </label>
                <input
                  id="phone"
                  :value="form.phone"
                  @input="handlePhoneInput"
                  type="tel"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label for="cnpj" class="block text-sm font-medium text-gray-700">
                  {{ t('settings.clinicCnpj') }}
                </label>
                <input
                  id="cnpj"
                  v-model="form.cnpj"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="00.000.000/0001-00"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Information -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">{{ t('register.adminInfo') }}</h3>
          <div class="space-y-4">
            <div>
              <label for="adminName" class="block text-sm font-medium text-gray-700">
                {{ t('common.name') }} *
              </label>
              <input
                id="adminName"
                v-model="form.adminName"
                type="text"
                required
                class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                :placeholder="t('register.adminNamePlaceholder')"
              />
            </div>

            <div>
              <label for="adminEmail" class="block text-sm font-medium text-gray-700">
                {{ t('common.email') }} *
              </label>
              <input
                id="adminEmail"
                v-model="form.adminEmail"
                type="email"
                required
                class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="adminPassword" class="block text-sm font-medium text-gray-700">
                  {{ t('auth.password') }} *
                </label>
                <input
                  id="adminPassword"
                  v-model="form.adminPassword"
                  type="password"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                  {{ t('auth.confirmPassword') }} *
                </label>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  :class="{ 'border-red-500': form.confirmPassword && !passwordsMatch }"
                />
              </div>
            </div>

            <!-- Password Requirements -->
            <div class="text-sm space-y-1">
              <p class="font-medium text-gray-700">{{ t('auth.passwordRequirements') }}</p>
              <div class="grid grid-cols-2 gap-1">
                <span :class="passwordChecks.minLength ? 'text-green-600' : 'text-gray-500'">
                  {{ passwordChecks.minLength ? '✓' : '○' }} {{ t('auth.minLength') }}
                </span>
                <span :class="passwordChecks.hasUppercase ? 'text-green-600' : 'text-gray-500'">
                  {{ passwordChecks.hasUppercase ? '✓' : '○' }} {{ t('auth.hasUppercase') }}
                </span>
                <span :class="passwordChecks.hasLowercase ? 'text-green-600' : 'text-gray-500'">
                  {{ passwordChecks.hasLowercase ? '✓' : '○' }} {{ t('auth.hasLowercase') }}
                </span>
                <span :class="passwordChecks.hasNumber ? 'text-green-600' : 'text-gray-500'">
                  {{ passwordChecks.hasNumber ? '✓' : '○' }} {{ t('auth.hasNumber') }}
                </span>
              </div>
              <p v-if="form.confirmPassword && !passwordsMatch" class="text-red-600">
                {{ t('auth.passwordsDoNotMatch') }}
              </p>
            </div>
          </div>
        </div>

        <!-- Terms -->
        <div class="flex items-start">
          <input
            id="acceptTerms"
            v-model="form.acceptTerms"
            type="checkbox"
            required
            class="h-4 w-4 mt-1 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label for="acceptTerms" class="ml-2 text-sm text-gray-600">
            {{ t('register.acceptTerms') }}
            <a href="#" class="text-primary hover:underline">{{ t('landing.terms') }}</a>
            {{ t('register.and') }}
            <a href="#" class="text-primary hover:underline">{{ t('landing.privacy') }}</a>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="!isFormValid || loading"
          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? t('register.creating') : t('register.createAccount') }}
        </button>

        <!-- Trial Info -->
        <p class="text-center text-sm text-gray-500">
          {{ t('landing.trialInfo') }}
        </p>

        <!-- Login Link -->
        <p class="text-center text-sm text-gray-600">
          {{ t('register.alreadyHaveAccount') }}
          <router-link to="/login" class="text-primary hover:underline font-medium">
            {{ t('auth.signIn') }}
          </router-link>
        </p>
      </form>
    </div>
  </div>
</template>

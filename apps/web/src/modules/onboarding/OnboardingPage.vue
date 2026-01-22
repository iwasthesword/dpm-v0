<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface OnboardingStatus {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  steps: { step: number; name: string; completed: boolean }[];
}

const { t } = useI18n();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const currentStep = ref(1);
const status = ref<OnboardingStatus | null>(null);
const error = ref('');
const showSuccess = ref(false);

// Form data
const clinicInfo = ref({
  tradeName: '',
  cnpj: '',
  phone: '',
  email: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
});

const clinicSettings = ref({
  appointmentDuration: 30,
  operatingHours: {
    monday: { enabled: true, start: '08:00', end: '18:00' },
    tuesday: { enabled: true, start: '08:00', end: '18:00' },
    wednesday: { enabled: true, start: '08:00', end: '18:00' },
    thursday: { enabled: true, start: '08:00', end: '18:00' },
    friday: { enabled: true, start: '08:00', end: '18:00' },
    saturday: { enabled: false, start: '08:00', end: '12:00' },
    sunday: { enabled: false, start: '08:00', end: '12:00' },
  },
});

const professional = ref({
  name: '',
  cro: '',
  croState: '',
  specialty: '',
  phone: '',
  email: '',
});

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const stepProgress = computed(() => {
  if (!status.value) return 0;
  return (status.value.steps.filter(s => s.completed).length / status.value.totalSteps) * 100;
});

onMounted(async () => {
  await loadStatus();
});

async function loadStatus() {
  loading.value = true;
  try {
    const response = await api.get('/onboarding/status');
    status.value = response.data;

    // If onboarding is complete, redirect to dashboard
    if (response.data.isComplete) {
      router.push('/');
      return;
    }

    // Set current step to first incomplete step
    const firstIncomplete = status.value?.steps.find(s => !s.completed);
    if (firstIncomplete) {
      currentStep.value = firstIncomplete.step;
    }
  } catch (e) {
    console.error('Failed to load onboarding status:', e);
  } finally {
    loading.value = false;
  }
}

async function saveStep1() {
  saving.value = true;
  error.value = '';
  try {
    await api.put('/onboarding/clinic', clinicInfo.value);
    await loadStatus();
    currentStep.value = 2;
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save clinic info';
  } finally {
    saving.value = false;
  }
}

async function saveStep2() {
  saving.value = true;
  error.value = '';
  try {
    await api.put('/onboarding/settings', clinicSettings.value);
    await loadStatus();
    currentStep.value = 3;
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save settings';
  } finally {
    saving.value = false;
  }
}

async function saveStep3() {
  saving.value = true;
  error.value = '';
  try {
    await api.post('/onboarding/professional', professional.value);
    await loadStatus();
    await completeOnboarding();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save professional';
  } finally {
    saving.value = false;
  }
}

async function completeOnboarding() {
  try {
    await api.post('/onboarding/complete');
    showSuccess.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to complete onboarding';
  }
}

async function skipOnboarding() {
  try {
    await api.post('/onboarding/skip');
    router.push('/');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to skip onboarding';
  }
}

function goToDashboard() {
  router.push('/');
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary mb-2">{{ t('common.appName') }}</h1>
        <h2 class="text-xl font-semibold text-gray-900">{{ t('onboarding.title') }}</h2>
        <p class="text-gray-600">{{ t('onboarding.subtitle') }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p class="mt-4 text-gray-600">{{ t('common.loading') }}</p>
      </div>

      <!-- Success Screen -->
      <div v-else-if="showSuccess" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ t('onboarding.congratulations') }}</h3>
        <p class="text-gray-600 mb-6">{{ t('onboarding.setupComplete') }}</p>
        <button
          @click="goToDashboard"
          class="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium"
        >
          {{ t('onboarding.goToDashboard') }}
        </button>
      </div>

      <!-- Onboarding Steps -->
      <div v-else>
        <!-- Progress Bar -->
        <div class="mb-8">
          <div class="flex justify-between text-sm text-gray-600 mb-2">
            <span>{{ t('onboarding.step') }} {{ currentStep }} {{ t('onboarding.of') }} 3</span>
            <span>{{ Math.round(stepProgress) }}%</span>
          </div>
          <div class="h-2 bg-gray-200 rounded-full">
            <div class="h-2 bg-primary rounded-full transition-all" :style="{ width: `${stepProgress}%` }"></div>
          </div>
        </div>

        <!-- Step Indicators -->
        <div class="flex justify-center mb-8">
          <div class="flex items-center">
            <div
              v-for="step in 3"
              :key="step"
              class="flex items-center"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                :class="{
                  'bg-primary text-white': currentStep === step,
                  'bg-green-500 text-white': status?.steps[step - 1]?.completed,
                  'bg-gray-200 text-gray-600': currentStep !== step && !status?.steps[step - 1]?.completed,
                }"
              >
                <svg v-if="status?.steps[step - 1]?.completed" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else>{{ step }}</span>
              </div>
              <div v-if="step < 3" class="w-16 h-0.5 bg-gray-200 mx-2"></div>
            </div>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm mb-6">
          {{ error }}
        </div>

        <!-- Step 1: Clinic Info -->
        <form v-if="currentStep === 1" @submit.prevent="saveStep1" class="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ t('onboarding.steps.clinicInfo') }}</h3>
            <p class="text-sm text-gray-500">{{ t('onboarding.clinicInfoDesc') }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.tradeName') }}</label>
              <input v-model="clinicInfo.tradeName" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.cnpj') }} *</label>
              <input :value="clinicInfo.cnpj" @input="e => clinicInfo.cnpj = formatCnpj((e.target as HTMLInputElement).value)" type="text" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.phone') }} *</label>
              <input :value="clinicInfo.phone" @input="e => clinicInfo.phone = formatPhone((e.target as HTMLInputElement).value)" type="tel" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.email') }} *</label>
              <input v-model="clinicInfo.email" type="email" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          </div>

          <div>
            <h4 class="text-sm font-medium text-gray-700 mb-3">{{ t('onboarding.address') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm text-gray-600">{{ t('onboarding.street') }}</label>
                <input v-model="clinicInfo.address.street" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.number') }}</label>
                <input v-model="clinicInfo.address.number" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.complement') }}</label>
                <input v-model="clinicInfo.address.complement" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.neighborhood') }}</label>
                <input v-model="clinicInfo.address.neighborhood" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.zipCode') }}</label>
                <input :value="clinicInfo.address.zipCode" @input="e => clinicInfo.address.zipCode = formatCep((e.target as HTMLInputElement).value)" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="00000-000" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.city') }}</label>
                <input v-model="clinicInfo.address.city" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm text-gray-600">{{ t('onboarding.state') }}</label>
                <select v-model="clinicInfo.address.state" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="">Selecione</option>
                  <option v-for="state in brazilianStates" :key="state" :value="state">{{ state }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-between pt-4">
            <button type="button" @click="skipOnboarding" class="text-gray-500 hover:text-gray-700">
              {{ t('onboarding.skip') }}
            </button>
            <button type="submit" :disabled="saving" class="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium disabled:opacity-50">
              {{ saving ? t('common.saving') : t('onboarding.next') }}
            </button>
          </div>
        </form>

        <!-- Step 2: Operating Hours -->
        <form v-if="currentStep === 2" @submit.prevent="saveStep2" class="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ t('onboarding.steps.operatingHours') }}</h3>
            <p class="text-sm text-gray-500">{{ t('onboarding.operatingHoursDesc') }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('onboarding.defaultDuration') }}</label>
            <div class="flex items-center space-x-2">
              <input v-model.number="clinicSettings.appointmentDuration" type="number" min="15" max="120" step="15" class="w-24 px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              <span class="text-gray-600">{{ t('onboarding.minutes') }}</span>
            </div>
          </div>

          <div class="space-y-3">
            <div v-for="day in weekdays" :key="day" class="flex items-center space-x-4">
              <div class="w-32">
                <label class="flex items-center">
                  <input v-model="clinicSettings.operatingHours[day].enabled" type="checkbox" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                  <span class="ml-2 text-sm font-medium text-gray-700">{{ t(`onboarding.${day}`) }}</span>
                </label>
              </div>
              <div class="flex items-center space-x-2">
                <input v-model="clinicSettings.operatingHours[day].start" type="time" :disabled="!clinicSettings.operatingHours[day].enabled" class="px-2 py-1 border border-input rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" />
                <span class="text-gray-500">-</span>
                <input v-model="clinicSettings.operatingHours[day].end" type="time" :disabled="!clinicSettings.operatingHours[day].enabled" class="px-2 py-1 border border-input rounded-md text-sm disabled:opacity-50 disabled:bg-gray-100" />
              </div>
            </div>
          </div>

          <div class="flex justify-between pt-4">
            <button type="button" @click="currentStep = 1" class="text-gray-500 hover:text-gray-700">
              {{ t('onboarding.previous') }}
            </button>
            <button type="submit" :disabled="saving" class="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium disabled:opacity-50">
              {{ saving ? t('common.saving') : t('onboarding.next') }}
            </button>
          </div>
        </form>

        <!-- Step 3: First Professional -->
        <form v-if="currentStep === 3" @submit.prevent="saveStep3" class="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">{{ t('onboarding.steps.firstProfessional') }}</h3>
            <p class="text-sm text-gray-500">{{ t('onboarding.professionalDesc') }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.professionalName') }} *</label>
              <input v-model="professional.name" type="text" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.cro') }} *</label>
              <input v-model="professional.cro" type="text" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="12345" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.croState') }} *</label>
              <select v-model="professional.croState" required class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">Selecione</option>
                <option v-for="state in brazilianStates" :key="state" :value="state">{{ state }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('onboarding.specialty') }}</label>
              <input v-model="professional.specialty" type="text" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Ex: Ortodontia" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('common.phone') }}</label>
              <input :value="professional.phone" @input="e => professional.phone = formatPhone((e.target as HTMLInputElement).value)" type="tel" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
              <input v-model="professional.email" type="email" class="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
            </div>
          </div>

          <div class="flex justify-between pt-4">
            <button type="button" @click="currentStep = 2" class="text-gray-500 hover:text-gray-700">
              {{ t('onboarding.previous') }}
            </button>
            <button type="submit" :disabled="saving" class="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium disabled:opacity-50">
              {{ saving ? t('common.saving') : t('onboarding.complete') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

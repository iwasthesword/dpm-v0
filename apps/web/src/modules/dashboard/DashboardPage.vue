<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import HealthCard from '@/components/dashboard/HealthCard.vue';
import type { HealthStatus, Metric } from '@/components/dashboard/HealthCard.vue';

const { t, n } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

interface BusinessHealth {
  status: HealthStatus;
  netProfit: number;
  averageTicket: number;
  noShowRate: number;
  conversionRate: number;
  scheduleCapacity: number;
}

interface ScheduleHealth {
  status: HealthStatus;
  todayOccupancy: number;
  tomorrowOccupancy: number;
  idleHours: number;
  underutilizedProfessionals: { id: string; name: string; occupancy: number }[];
}

interface CashHealth {
  status: HealthStatus;
  netIncome: number;
  expenses: number;
  projectedBalance: number;
  overdueAmount: number;
  overdueCount: number;
}

interface MarketingHealth {
  status: HealthStatus;
  newPatientsThisMonth: number;
  newPatientsPreviousMonth: number;
  patientSources: { source: string; count: number }[];
  marketingExpenses: number;
}

interface DashboardHealth {
  businessHealth: BusinessHealth;
  scheduleHealth: ScheduleHealth;
  cashHealth: CashHealth;
  marketingHealth: MarketingHealth;
}

const health = ref<DashboardHealth | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

async function fetchHealthData() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get('/dashboard/health');
    health.value = response.data.health;
  } catch (err) {
    console.error('Failed to fetch health data:', err);
    error.value = t('common.error');
  } finally {
    loading.value = false;
  }
}

// Computed metrics for each card
const businessMetrics = computed<Metric[]>(() => {
  if (!health.value) return [];
  const h = health.value.businessHealth;
  return [
    { key: 'netProfit', value: h.netProfit, format: 'currency' },
    { key: 'averageTicket', value: h.averageTicket, format: 'currency' },
    { key: 'noShowRate', value: h.noShowRate, format: 'percent' },
    { key: 'conversionRate', value: h.conversionRate, format: 'percent' },
    { key: 'scheduleCapacity', value: h.scheduleCapacity, format: 'percent' },
  ];
});

const businessAlert = computed(() => {
  if (!health.value) return undefined;
  const h = health.value.businessHealth;
  if (h.noShowRate > 20) return t('dashboard.health.alerts.highNoShow');
  if (h.conversionRate < 40) return t('dashboard.health.alerts.lowConversion');
  return undefined;
});

const scheduleMetrics = computed<Metric[]>(() => {
  if (!health.value) return [];
  const h = health.value.scheduleHealth;
  return [
    { key: 'todayOccupancy', value: h.todayOccupancy, format: 'percent' },
    { key: 'tomorrowOccupancy', value: h.tomorrowOccupancy, format: 'percent' },
    { key: 'idleHours', value: h.idleHours, format: 'number' },
  ];
});

const scheduleAlert = computed(() => {
  if (!health.value) return undefined;
  const h = health.value.scheduleHealth;
  if (h.idleHours > 4) return t('dashboard.health.alerts.idleSchedule');
  return undefined;
});

const cashMetrics = computed<Metric[]>(() => {
  if (!health.value) return [];
  const h = health.value.cashHealth;
  return [
    { key: 'netIncome', value: h.netIncome, format: 'currency' },
    { key: 'expenses', value: h.expenses, format: 'currency' },
    { key: 'projectedBalance', value: h.projectedBalance, format: 'currency' },
  ];
});

const cashAlert = computed(() => {
  if (!health.value) return undefined;
  const h = health.value.cashHealth;
  if (h.projectedBalance < 0) return t('dashboard.health.alerts.negativeBalance');
  if (h.overdueCount > 0) return t('dashboard.health.alerts.overduePayments', { count: h.overdueCount });
  return undefined;
});

const marketingMetrics = computed<Metric[]>(() => {
  if (!health.value) return [];
  const h = health.value.marketingHealth;
  return [
    { key: 'newPatients', value: h.newPatientsThisMonth, format: 'number' },
    { key: 'marketingCost', value: h.marketingExpenses, format: 'currency' },
  ];
});

const marketingTrend = computed(() => {
  if (!health.value) return '';
  const h = health.value.marketingHealth;
  const diff = h.newPatientsThisMonth - h.newPatientsPreviousMonth;
  if (diff > 0) return `+${diff}`;
  return String(diff);
});

// Navigation actions
function goToSchedule() {
  router.push('/schedule');
}

function goToFinancial() {
  router.push('/financial');
}

function goToPatients() {
  router.push('/patients');
}

onMounted(fetchHealthData);
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('dashboard.health.title') }}</h1>
      <p class="mt-2 text-gray-600">
        {{ t('dashboard.welcomeBack', { name: authStore.user?.name }) }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">{{ t('common.loading') }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-red-700">{{ error }}</p>
      <button @click="fetchHealthData" class="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
        {{ t('common.loading') }}
      </button>
    </div>

    <!-- Health Cards Grid -->
    <div v-else-if="health" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Business Health Card -->
      <HealthCard
        :title="t('dashboard.health.businessHealth')"
        :status="health.businessHealth.status"
        icon="heart"
        :metrics="businessMetrics"
        :alert="businessAlert"
        :cta-label="t('dashboard.health.cta.seeDetails')"
        :cta-action="goToFinancial"
      />

      <!-- Schedule Health Card -->
      <HealthCard
        :title="t('dashboard.health.scheduleHealth')"
        :status="health.scheduleHealth.status"
        icon="clock"
        :metrics="scheduleMetrics"
        :alert="scheduleAlert"
        :cta-label="t('dashboard.health.cta.optimizeSchedule')"
        :cta-action="goToSchedule"
      />

      <!-- Cash Health Card -->
      <HealthCard
        :title="t('dashboard.health.cashHealth')"
        :status="health.cashHealth.status"
        icon="cash"
        :metrics="cashMetrics"
        :alert="cashAlert"
        :cta-label="health.cashHealth.overdueCount > 0 ? t('dashboard.health.cta.viewOverdue') : t('dashboard.health.cta.seeDetails')"
        :cta-action="goToFinancial"
      />

      <!-- Marketing Health Card -->
      <HealthCard
        :title="t('dashboard.health.marketingHealth')"
        :status="health.marketingHealth.status"
        icon="megaphone"
        :metrics="marketingMetrics"
        :cta-label="t('dashboard.health.cta.seeDetails')"
        :cta-action="goToPatients"
      >
        <!-- Patient Sources Breakdown -->
        <template v-if="health.marketingHealth.patientSources.length > 0">
          <div class="mt-4 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-500 mb-2">{{ t('dashboard.health.metrics.patientSources') }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="source in health.marketingHealth.patientSources"
                :key="source.source"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
              >
                {{ source.source }}: {{ source.count }}
              </span>
            </div>
          </div>
        </template>
      </HealthCard>
    </div>

    <!-- Quick Stats (below cards) -->
    <div v-if="health" class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <p class="text-sm text-gray-500">{{ t('dashboard.health.metrics.newPatients') }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ health.marketingHealth.newPatientsThisMonth }}</p>
        <p class="text-xs" :class="health.marketingHealth.newPatientsThisMonth >= health.marketingHealth.newPatientsPreviousMonth ? 'text-green-600' : 'text-red-600'">
          {{ marketingTrend }} vs. {{ t('dashboard.health.previousMonth') }}
        </p>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <p class="text-sm text-gray-500">{{ t('dashboard.health.metrics.todayOccupancy') }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ health.scheduleHealth.todayOccupancy.toFixed(0) }}%</p>
        <div class="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all"
            :class="health.scheduleHealth.todayOccupancy >= 80 ? 'bg-green-500' : health.scheduleHealth.todayOccupancy >= 60 ? 'bg-yellow-500' : 'bg-red-500'"
            :style="{ width: `${Math.min(100, health.scheduleHealth.todayOccupancy)}%` }"
          ></div>
        </div>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <p class="text-sm text-gray-500">{{ t('dashboard.health.metrics.overduePayments') }}</p>
        <p class="text-2xl font-bold" :class="health.cashHealth.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'">
          {{ health.cashHealth.overdueCount }}
        </p>
        <p v-if="health.cashHealth.overdueCount > 0" class="text-xs text-red-600">
          {{ n(health.cashHealth.overdueAmount, 'currency') }}
        </p>
      </div>

      <div class="bg-white rounded-lg border border-gray-200 p-4 text-center">
        <p class="text-sm text-gray-500">{{ t('dashboard.health.metrics.noShowRate') }}</p>
        <p class="text-2xl font-bold" :class="health.businessHealth.noShowRate > 10 ? 'text-yellow-600' : 'text-gray-900'">
          {{ health.businessHealth.noShowRate.toFixed(1) }}%
        </p>
      </div>
    </div>

    <!-- Underutilized Professionals Alert -->
    <div
      v-if="health && health.scheduleHealth.underutilizedProfessionals.length > 0"
      class="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p class="font-medium text-yellow-800">{{ t('dashboard.health.alerts.underutilizedProfessionals') }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="prof in health.scheduleHealth.underutilizedProfessionals"
              :key="prof.id"
              class="px-2 py-1 text-sm bg-yellow-100 text-yellow-800 rounded"
            >
              {{ prof.name }} ({{ prof.occupancy.toFixed(0) }}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

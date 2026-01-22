<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface Subscription {
  id: string;
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: {
    id: string;
    name: string;
    tier: string;
    price: number;
    billingPeriod: string;
    maxUsers: number;
    maxPatients: number;
    maxAppointments: number;
    maxStorage: number;
  };
}

interface UsageMetrics {
  users: { current: number; limit: number };
  patients: { current: number; limit: number };
  appointments: { current: number; limit: number };
  storage: { current: number; limit: number };
}

interface Invoice {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  billingPeriod: string;
  maxUsers: number;
  maxPatients: number;
  maxAppointments: number;
  features: string[];
}

const { t } = useI18n();

const loading = ref(true);
const subscription = ref<Subscription | null>(null);
const usage = ref<UsageMetrics | null>(null);
const invoices = ref<Invoice[]>([]);
const plans = ref<Plan[]>([]);
const trialDaysRemaining = ref(0);
const changingPlan = ref(false);
const showPlansModal = ref(false);

const statusColor = computed(() => {
  if (!subscription.value) return 'bg-gray-100 text-gray-800';
  switch (subscription.value.status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'TRIALING': return 'bg-blue-100 text-blue-800';
    case 'PAST_DUE': return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
    case 'EXPIRED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const [subRes, usageRes, plansRes] = await Promise.all([
      api.get('/subscription'),
      api.get('/subscription/usage'),
      api.get('/public/plans'),
    ]);

    subscription.value = subRes.data.subscription;
    usage.value = usageRes.data.usage;
    trialDaysRemaining.value = usageRes.data.trialDaysRemaining || 0;
    plans.value = plansRes.data.plans;

    // Load invoices if subscription is active
    if (subscription.value?.status === 'ACTIVE') {
      try {
        const invoicesRes = await api.get('/subscription/invoices');
        invoices.value = invoicesRes.data.invoices || [];
      } catch {
        // Invoices endpoint might not exist yet
      }
    }
  } catch (e) {
    console.error('Failed to load subscription data:', e);
  } finally {
    loading.value = false;
  }
}

async function openCheckout(planId?: string) {
  changingPlan.value = true;
  try {
    const response = await api.post('/subscription/create-checkout', {
      priceId: planId || undefined,
      successUrl: `${window.location.origin}/settings/subscription?success=true`,
      cancelUrl: `${window.location.origin}/settings/subscription?canceled=true`,
    });

    if (response.data.url) {
      window.location.href = response.data.url;
    }
  } catch (e) {
    console.error('Failed to create checkout session:', e);
  } finally {
    changingPlan.value = false;
  }
}

async function openBillingPortal() {
  try {
    const response = await api.post('/subscription/create-portal', {
      returnUrl: window.location.href,
    });

    if (response.data.url) {
      window.location.href = response.data.url;
    }
  } catch (e) {
    console.error('Failed to create billing portal session:', e);
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getUsagePercentage(current: number, limit: number): number {
  if (limit === -1) return 0;
  return Math.min((current / limit) * 100, 100);
}

function getUsageColor(current: number, limit: number): string {
  if (limit === -1) return 'bg-green-500';
  const pct = (current / limit) * 100;
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}
</script>

<template>
  <div class="max-w-4xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-8">{{ t('subscription.title') }}</h1>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    </div>

    <div v-else class="space-y-6">
      <!-- Current Plan -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ t('subscription.currentPlan') }}</h2>
            <div class="mt-2 flex items-center space-x-3">
              <span class="text-2xl font-bold">{{ subscription?.plan.name || 'Free' }}</span>
              <span :class="statusColor" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ t(`subscription.status.${subscription?.status || 'TRIALING'}`) }}
              </span>
            </div>
            <p v-if="subscription?.status === 'TRIALING' && trialDaysRemaining > 0" class="mt-2 text-sm text-gray-600">
              {{ t('subscription.trialEndsIn') }} <strong>{{ trialDaysRemaining }}</strong> {{ t('subscription.days') }}
            </p>
            <p v-if="subscription?.plan.price" class="mt-2 text-gray-600">
              {{ formatPrice(subscription.plan.price) }}/{{ subscription.plan.billingPeriod === 'yearly' ? 'ano' : 'mês' }}
            </p>
          </div>
          <div class="flex flex-col space-y-2">
            <button
              v-if="subscription?.status === 'TRIALING'"
              @click="showPlansModal = true"
              :disabled="changingPlan"
              class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
            >
              {{ t('subscription.upgradeNow') }}
            </button>
            <button
              v-if="subscription?.status === 'ACTIVE'"
              @click="openBillingPortal"
              class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium"
            >
              {{ t('subscription.manageBilling') }}
            </button>
            <button
              @click="showPlansModal = true"
              class="px-4 py-2 text-primary hover:underline text-sm font-medium"
            >
              {{ t('subscription.changePlan') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Usage -->
      <div v-if="usage" class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('subscription.usage') }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Users -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">{{ t('subscription.users') }}</span>
              <span class="font-medium">
                {{ usage.users.current }} {{ t('subscription.of') }}
                {{ usage.users.limit === -1 ? t('subscription.unlimited') : usage.users.limit }}
              </span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full">
              <div
                :class="getUsageColor(usage.users.current, usage.users.limit)"
                class="h-2 rounded-full transition-all"
                :style="{ width: `${getUsagePercentage(usage.users.current, usage.users.limit)}%` }"
              ></div>
            </div>
          </div>

          <!-- Patients -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">{{ t('subscription.patients') }}</span>
              <span class="font-medium">
                {{ usage.patients.current }} {{ t('subscription.of') }}
                {{ usage.patients.limit === -1 ? t('subscription.unlimited') : usage.patients.limit }}
              </span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full">
              <div
                :class="getUsageColor(usage.patients.current, usage.patients.limit)"
                class="h-2 rounded-full transition-all"
                :style="{ width: `${getUsagePercentage(usage.patients.current, usage.patients.limit)}%` }"
              ></div>
            </div>
          </div>

          <!-- Appointments -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">{{ t('subscription.appointments') }}</span>
              <span class="font-medium">
                {{ usage.appointments.current }} {{ t('subscription.of') }}
                {{ usage.appointments.limit === -1 ? t('subscription.unlimited') : usage.appointments.limit }}
              </span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full">
              <div
                :class="getUsageColor(usage.appointments.current, usage.appointments.limit)"
                class="h-2 rounded-full transition-all"
                :style="{ width: `${getUsagePercentage(usage.appointments.current, usage.appointments.limit)}%` }"
              ></div>
            </div>
          </div>

          <!-- Storage -->
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-600">{{ t('subscription.storage') }}</span>
              <span class="font-medium">
                {{ (usage.storage.current / 1024).toFixed(1) }} GB {{ t('subscription.of') }}
                {{ usage.storage.limit === -1 ? t('subscription.unlimited') : `${usage.storage.limit} GB` }}
              </span>
            </div>
            <div class="h-2 bg-gray-200 rounded-full">
              <div
                :class="getUsageColor(usage.storage.current / 1024, usage.storage.limit)"
                class="h-2 rounded-full transition-all"
                :style="{ width: `${getUsagePercentage(usage.storage.current / 1024, usage.storage.limit)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoices -->
      <div v-if="invoices.length > 0" class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ t('subscription.invoices') }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 text-sm font-medium text-gray-500">Data</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Valor</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Status</th>
                <th class="text-right py-2 text-sm font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invoice in invoices" :key="invoice.id" class="border-b last:border-b-0">
                <td class="py-3 text-sm text-gray-900">{{ formatDate(invoice.periodStart) }}</td>
                <td class="py-3 text-sm text-gray-900">{{ formatPrice(invoice.amount) }}</td>
                <td class="py-3">
                  <span
                    :class="invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ invoice.status === 'paid' ? 'Pago' : invoice.status }}
                  </span>
                </td>
                <td class="py-3 text-right">
                  <a v-if="invoice.pdfUrl" :href="invoice.pdfUrl" target="_blank" class="text-primary hover:underline text-sm">
                    PDF
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
        {{ t('subscription.noInvoices') }}
      </div>
    </div>

    <!-- Plans Modal -->
    <div v-if="showPlansModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold">{{ t('subscription.changePlan') }}</h2>
          <button @click="showPlansModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="border rounded-lg p-4"
            :class="{ 'ring-2 ring-primary': plan.id === subscription?.plan.id }"
          >
            <h3 class="font-semibold text-lg">{{ plan.name }}</h3>
            <p class="text-2xl font-bold mt-2">
              {{ formatPrice(plan.price) }}
              <span class="text-sm text-gray-500 font-normal">/mês</span>
            </p>
            <ul class="mt-4 space-y-2 text-sm text-gray-600">
              <li>{{ plan.maxUsers }} usuários</li>
              <li>{{ plan.maxPatients }} pacientes</li>
              <li>{{ plan.maxAppointments === -1 ? 'Consultas ilimitadas' : `${plan.maxAppointments} consultas/mês` }}</li>
            </ul>
            <button
              v-if="plan.id !== subscription?.plan.id"
              @click="openCheckout(plan.id)"
              :disabled="changingPlan"
              class="mt-4 w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
            >
              {{ changingPlan ? 'Processando...' : 'Selecionar' }}
            </button>
            <div v-else class="mt-4 w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-md text-sm font-medium text-center">
              Plano atual
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

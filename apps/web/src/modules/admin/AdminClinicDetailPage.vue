<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import adminApi from '@/api/adminClient';

interface ClinicDetail {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  cnpj: string | null;
  tradeName: string | null;
  isActive: boolean;
  createdAt: string;
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  subscription: {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    plan: {
      id: string;
      name: string;
      tier: string;
      price: number;
    };
  } | null;
  counts: {
    users: number;
    patients: number;
    appointments: number;
    professionals: number;
  };
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const clinic = ref<ClinicDetail | null>(null);
const plans = ref<Plan[]>([]);
const saving = ref(false);
const error = ref('');
const success = ref('');

// Modal states
const showExtendTrialModal = ref(false);
const showChangePlanModal = ref(false);
const showStatusModal = ref(false);

// Form values
const extendDays = ref(7);
const selectedPlanId = ref('');
const selectedStatus = ref('');

const statusOptions = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];

onMounted(async () => {
  await loadClinic();
  await loadPlans();
});

async function loadClinic() {
  loading.value = true;
  const clinicId = route.params.id;

  try {
    const response = await adminApi.get(`/admin/clinics/${clinicId}`);
    clinic.value = response.data.clinic;
    if (clinic.value?.subscription) {
      selectedPlanId.value = clinic.value.subscription.plan.id;
      selectedStatus.value = clinic.value.subscription.status;
    }
  } catch (e) {
    console.error('Failed to load clinic:', e);
    router.push('/admin/clinics');
  } finally {
    loading.value = false;
  }
}

async function loadPlans() {
  try {
    const response = await api.get('/public/plans');
    plans.value = response.data.plans;
  } catch (e) {
    console.error('Failed to load plans:', e);
  }
}

async function extendTrial() {
  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await adminApi.post(`/admin/clinics/${clinic.value?.id}/extend-trial`, {
      days: extendDays.value,
    });
    success.value = 'Período de teste estendido com sucesso';
    showExtendTrialModal.value = false;
    await loadClinic();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erro ao estender período de teste';
  } finally {
    saving.value = false;
  }
}

async function changePlan() {
  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await adminApi.post(`/admin/clinics/${clinic.value?.id}/change-plan`, {
      planId: selectedPlanId.value,
    });
    success.value = 'Plano alterado com sucesso';
    showChangePlanModal.value = false;
    await loadClinic();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erro ao alterar plano';
  } finally {
    saving.value = false;
  }
}

async function updateStatus() {
  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await adminApi.post(`/admin/clinics/${clinic.value?.id}/subscription-status`, {
      status: selectedStatus.value,
    });
    success.value = 'Status atualizado com sucesso';
    showStatusModal.value = false;
    await loadClinic();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Erro ao atualizar status';
  } finally {
    saving.value = false;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800';
    case 'TRIALING': return 'bg-blue-100 text-blue-800';
    case 'PAST_DUE': return 'bg-yellow-100 text-yellow-800';
    case 'CANCELLED':
    case 'EXPIRED': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
</script>

<template>
  <div>
    <!-- Back Link -->
    <router-link to="/admin/clinics" class="text-primary hover:underline text-sm mb-4 inline-block">
      &larr; Voltar para lista
    </router-link>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    </div>

    <div v-else-if="clinic" class="space-y-6">
      <!-- Success/Error Messages -->
      <div v-if="success" class="bg-green-100 text-green-800 px-4 py-3 rounded-md text-sm">
        {{ success }}
      </div>
      <div v-if="error" class="bg-red-100 text-red-800 px-4 py-3 rounded-md text-sm">
        {{ error }}
      </div>

      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ clinic.name }}</h1>
            <p class="text-gray-600">{{ clinic.subdomain }}.dpm.app</p>
          </div>
          <div class="flex items-center space-x-2">
            <span
              :class="clinic.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ clinic.isActive ? 'Ativo' : 'Inativo' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Clinic Info -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Informações da Clínica</h2>
          <dl class="space-y-3">
            <div class="flex justify-between">
              <dt class="text-gray-500">E-mail</dt>
              <dd class="text-gray-900">{{ clinic.email }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Telefone</dt>
              <dd class="text-gray-900">{{ clinic.phone || '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">CNPJ</dt>
              <dd class="text-gray-900">{{ clinic.cnpj || '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Nome Fantasia</dt>
              <dd class="text-gray-900">{{ clinic.tradeName || '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Criada em</dt>
              <dd class="text-gray-900">{{ formatDate(clinic.createdAt) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Onboarding</dt>
              <dd class="text-gray-900">
                {{ clinic.onboardingCompletedAt ? 'Completo' : `Passo ${clinic.onboardingStep}/3` }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Subscription Info -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Assinatura</h2>
          <dl class="space-y-3">
            <div class="flex justify-between items-center">
              <dt class="text-gray-500">Status</dt>
              <dd>
                <span
                  v-if="clinic.subscription"
                  :class="getStatusColor(clinic.subscription.status)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ t(`subscription.status.${clinic.subscription.status}`) }}
                </span>
                <span v-else class="text-gray-400">-</span>
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Plano</dt>
              <dd class="text-gray-900">{{ clinic.subscription?.plan.name || '-' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-500">Preço</dt>
              <dd class="text-gray-900">{{ clinic.subscription ? formatCurrency(clinic.subscription.plan.price) + '/mês' : '-' }}</dd>
            </div>
            <div v-if="clinic.subscription?.trialEndsAt" class="flex justify-between">
              <dt class="text-gray-500">Fim do teste</dt>
              <dd class="text-gray-900">{{ formatDate(clinic.subscription.trialEndsAt) }}</dd>
            </div>
            <div v-if="clinic.subscription?.currentPeriodEnd" class="flex justify-between">
              <dt class="text-gray-500">Próxima cobrança</dt>
              <dd class="text-gray-900">{{ formatDate(clinic.subscription.currentPeriodEnd) }}</dd>
            </div>
          </dl>

          <!-- Actions -->
          <div class="mt-6 flex flex-wrap gap-2">
            <button
              v-if="clinic.subscription?.status === 'TRIALING'"
              @click="showExtendTrialModal = true"
              class="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
            >
              {{ t('admin.extendTrial') }}
            </button>
            <button
              @click="showChangePlanModal = true"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              {{ t('admin.changePlan') }}
            </button>
            <button
              @click="showStatusModal = true"
              class="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
            >
              {{ t('admin.updateStatus') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-gray-900">{{ clinic.counts.users }}</p>
          <p class="text-sm text-gray-500">Usuários</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-gray-900">{{ clinic.counts.professionals }}</p>
          <p class="text-sm text-gray-500">Profissionais</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-gray-900">{{ clinic.counts.patients }}</p>
          <p class="text-sm text-gray-500">Pacientes</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-gray-900">{{ clinic.counts.appointments }}</p>
          <p class="text-sm text-gray-500">Consultas</p>
        </div>
      </div>
    </div>

    <!-- Extend Trial Modal -->
    <div v-if="showExtendTrialModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold mb-4">{{ t('admin.extendTrial') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('admin.extendTrialDays') }}</label>
          <input
            v-model.number="extendDays"
            type="number"
            min="1"
            max="90"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showExtendTrialModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            @click="extendTrial"
            :disabled="saving"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? 'Salvando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Change Plan Modal -->
    <div v-if="showChangePlanModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold mb-4">{{ t('admin.changePlan') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Plano</label>
          <select
            v-model="selectedPlanId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="plan in plans" :key="plan.id" :value="plan.id">
              {{ plan.name }} - {{ formatCurrency(plan.price) }}/mês
            </option>
          </select>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showChangePlanModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            @click="changePlan"
            :disabled="saving"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? 'Salvando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Update Status Modal -->
    <div v-if="showStatusModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold mb-4">{{ t('admin.updateStatus') }}</h3>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option v-for="status in statusOptions" :key="status" :value="status">
              {{ t(`subscription.status.${status}`) }}
            </option>
          </select>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showStatusModal = false"
            class="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            @click="updateStatus"
            :disabled="saving"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? 'Salvando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

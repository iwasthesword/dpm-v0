<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import adminApi from '@/api/adminClient';

interface DashboardStats {
  totalClinics: number;
  activeTrials: number;
  activeSubscriptions: number;
  newClinicsThisMonth: number;
  newClinicsThisWeek: number;
  mrr: number;
  subscriptionsByStatus: { status: string; count: number }[];
  subscriptionsByPlan: { plan: string; tier: string; count: number }[];
}

interface RecentClinic {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
  subscription: { status: string; plan: string } | null;
}

const { t } = useI18n();

const loading = ref(true);
const stats = ref<DashboardStats | null>(null);
const recentClinics = ref<RecentClinic[]>([]);

onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  loading.value = true;

  try {
    const response = await adminApi.get('/admin/dashboard');
    stats.value = response.data.stats;
    recentClinics.value = response.data.recentClinics;
  } catch (e) {
    console.error('Failed to load dashboard:', e);
  } finally {
    loading.value = false;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
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
    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    </div>

    <div v-else class="space-y-6">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.totalClinics') }}</p>
          <p class="text-3xl font-bold text-gray-900">{{ stats?.totalClinics || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.activeTrials') }}</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats?.activeTrials || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.activeSubscriptions') }}</p>
          <p class="text-3xl font-bold text-green-600">{{ stats?.activeSubscriptions || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.mrr') }}</p>
          <p class="text-3xl font-bold text-gray-900">{{ formatCurrency(stats?.mrr || 0) }}</p>
        </div>
      </div>

      <!-- Secondary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.newThisMonth') }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats?.newClinicsThisMonth || 0 }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-6">
          <p class="text-sm font-medium text-gray-500">{{ t('admin.stats.newThisWeek') }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ stats?.newClinicsThisWeek || 0 }}</p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Subscriptions by Status -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('admin.subscriptionsByStatus') }}</h3>
          <div class="space-y-3">
            <div v-for="item in stats?.subscriptionsByStatus" :key="item.status" class="flex items-center justify-between">
              <span :class="getStatusColor(item.status)" class="px-2 py-1 text-xs font-medium rounded-full">
                {{ t(`subscription.status.${item.status}`) }}
              </span>
              <span class="font-medium">{{ item.count }}</span>
            </div>
            <div v-if="!stats?.subscriptionsByStatus?.length" class="text-gray-500 text-sm">
              Nenhum dado disponível
            </div>
          </div>
        </div>

        <!-- Subscriptions by Plan -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('admin.subscriptionsByPlan') }}</h3>
          <div class="space-y-3">
            <div v-for="item in stats?.subscriptionsByPlan" :key="item.plan" class="flex items-center justify-between">
              <span class="text-gray-700">{{ item.plan }}</span>
              <span class="font-medium">{{ item.count }}</span>
            </div>
            <div v-if="!stats?.subscriptionsByPlan?.length" class="text-gray-500 text-sm">
              Nenhum dado disponível
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Clinics -->
      <div class="bg-white rounded-lg shadow-sm p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('admin.recentClinics') }}</h3>
          <router-link to="/admin/clinics" class="text-primary hover:underline text-sm">
            Ver todas
          </router-link>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 text-sm font-medium text-gray-500">Clínica</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Subdomínio</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Criada em</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Status</th>
                <th class="text-left py-2 text-sm font-medium text-gray-500">Plano</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="clinic in recentClinics" :key="clinic.id" class="border-b last:border-b-0 hover:bg-gray-50">
                <td class="py-3">
                  <router-link :to="`/admin/clinics/${clinic.id}`" class="text-primary hover:underline font-medium">
                    {{ clinic.name }}
                  </router-link>
                </td>
                <td class="py-3 text-sm text-gray-600">{{ clinic.subdomain }}.dpm.app</td>
                <td class="py-3 text-sm text-gray-600">{{ formatDate(clinic.createdAt) }}</td>
                <td class="py-3">
                  <span
                    v-if="clinic.subscription"
                    :class="getStatusColor(clinic.subscription.status)"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ t(`subscription.status.${clinic.subscription.status}`) }}
                  </span>
                  <span v-else class="text-gray-400 text-sm">-</span>
                </td>
                <td class="py-3 text-sm text-gray-600">
                  {{ clinic.subscription?.plan || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import adminApi from '@/api/adminClient';

interface Clinic {
  id: string;
  name: string;
  subdomain: string;
  email: string;
  phone: string;
  createdAt: string;
  isActive: boolean;
  subscription: {
    status: string;
    plan: { name: string; tier: string };
    trialEndsAt: string | null;
  } | null;
  _count: {
    users: number;
    patients: number;
  };
}

const { t } = useI18n();

const loading = ref(true);
const clinics = ref<Clinic[]>([]);
const total = ref(0);
const page = ref(1);
const limit = ref(20);
const search = ref('');
const statusFilter = ref('');

const statusOptions = ['', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];

let searchTimeout: ReturnType<typeof setTimeout>;

watch([search, statusFilter], () => {
  page.value = 1;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadClinics, 300);
});

onMounted(async () => {
  await loadClinics();
});

async function loadClinics() {
  loading.value = true;

  try {
    const params = new URLSearchParams();
    params.set('page', page.value.toString());
    params.set('limit', limit.value.toString());
    if (search.value) params.set('search', search.value);
    if (statusFilter.value) params.set('status', statusFilter.value);

    const response = await adminApi.get(`/admin/clinics?${params.toString()}`);
    clinics.value = response.data.clinics;
    total.value = response.data.total;
  } catch (e) {
    console.error('Failed to load clinics:', e);
  } finally {
    loading.value = false;
  }
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

function nextPage() {
  if ((page.value * limit.value) < total.value) {
    page.value++;
    loadClinics();
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    loadClinics();
  }
}
</script>

<template>
  <div>
    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            v-model="search"
            type="text"
            :placeholder="t('admin.searchClinics')"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div class="sm:w-48">
          <select
            v-model="statusFilter"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">{{ t('admin.allStatuses') }}</option>
            <option v-for="status in statusOptions.slice(1)" :key="status" :value="status">
              {{ t(`subscription.status.${status}`) }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
    </div>

    <!-- Clinics Table -->
    <div v-else class="bg-white rounded-lg shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Clínica</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Subdomínio</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Plano</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Usuários</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Pacientes</th>
              <th class="text-left py-3 px-4 text-sm font-medium text-gray-500">Criada em</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="clinic in clinics" :key="clinic.id" class="border-t hover:bg-gray-50">
              <td class="py-3 px-4">
                <router-link :to="`/admin/clinics/${clinic.id}`" class="text-primary hover:underline font-medium">
                  {{ clinic.name }}
                </router-link>
                <p class="text-xs text-gray-500">{{ clinic.email }}</p>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ clinic.subdomain }}.dpm.app
              </td>
              <td class="py-3 px-4">
                <span
                  v-if="clinic.subscription"
                  :class="getStatusColor(clinic.subscription.status)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ t(`subscription.status.${clinic.subscription.status}`) }}
                </span>
                <span v-else class="text-gray-400 text-sm">-</span>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ clinic.subscription?.plan?.name || '-' }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ clinic._count?.users || 0 }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ clinic._count?.patients || 0 }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600">
                {{ formatDate(clinic.createdAt) }}
              </td>
            </tr>
            <tr v-if="clinics.length === 0">
              <td colspan="7" class="py-8 text-center text-gray-500">
                {{ t('admin.noClinics') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t">
        <div class="text-sm text-gray-600">
          Mostrando {{ ((page - 1) * limit) + 1 }} - {{ Math.min(page * limit, total) }} de {{ total }}
        </div>
        <div class="flex space-x-2">
          <button
            @click="prevPage"
            :disabled="page === 1"
            class="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <button
            @click="nextPage"
            :disabled="(page * limit) >= total"
            class="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface ProfessionalCommission {
  id: string;
  name: string;
  commissionType: 'PERCENTAGE' | 'FIXED' | 'PER_PROCEDURE';
  commissionValue: number;
  totalRevenue: number;
  totalCommission: number;
  appointmentCount: number;
}

interface CommissionsSummary {
  period: { startDate: string; endDate: string };
  totalCommissions: number;
  totalRevenue: number;
  professionals: ProfessionalCommission[];
}

const props = defineProps<{
  startDate?: string;
  endDate?: string;
}>();

const { t, n } = useI18n();

const data = ref<CommissionsSummary | null>(null);
const loading = ref(true);

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {};
    if (props.startDate) params.startDate = props.startDate;
    if (props.endDate) params.endDate = props.endDate;

    const response = await api.get('/financial/commissions', { params });
    data.value = response.data.commissions;
  } catch (error) {
    console.error('Failed to fetch commissions:', error);
  } finally {
    loading.value = false;
  }
}

function getCommissionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PERCENTAGE: t('financial.commissions.typePercentage'),
    FIXED: t('financial.commissions.typeFixed'),
    PER_PROCEDURE: t('financial.commissions.typePerProcedure'),
  };
  return labels[type] || type;
}

function formatCommissionValue(professional: ProfessionalCommission): string {
  if (professional.commissionType === 'PERCENTAGE') {
    return `${professional.commissionValue}%`;
  }
  return n(professional.commissionValue, 'currency');
}

watch(() => [props.startDate, props.endDate], fetchData);
onMounted(fetchData);

defineExpose({ refresh: fetchData });
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-24 bg-gray-200 rounded-lg"></div>
      <div class="h-64 bg-gray-200 rounded-lg"></div>
    </div>

    <template v-else-if="data">
      <!-- Summary Header -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p class="text-sm text-gray-500">{{ t('financial.commissions.totalRevenue') }}</p>
            <p class="text-2xl font-bold text-gray-900">{{ n(data.totalRevenue, 'currency') }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">{{ t('financial.commissions.totalCommissions') }}</p>
            <p class="text-2xl font-bold text-orange-600">{{ n(data.totalCommissions, 'currency') }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">{{ t('financial.commissions.averageRate') }}</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ data.totalRevenue > 0 ? ((data.totalCommissions / data.totalRevenue) * 100).toFixed(1) : 0 }}%
            </p>
          </div>
        </div>
      </div>

      <!-- Professionals Table -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('financial.commissions.byProfessional') }}</h3>
        </div>

        <div v-if="data.professionals.length === 0" class="p-8 text-center text-gray-500">
          {{ t('financial.commissions.noCommissions') }}
        </div>

        <table v-else class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.commissions.professional') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.commissions.appointments') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.commissions.revenue') }}
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.commissions.type') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.commissions.commission') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="prof in data.professionals" :key="prof.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <p class="font-medium text-gray-900">{{ prof.name }}</p>
              </td>
              <td class="px-6 py-4 text-right text-gray-600">
                {{ prof.appointmentCount }}
              </td>
              <td class="px-6 py-4 text-right text-gray-900">
                {{ n(prof.totalRevenue, 'currency') }}
              </td>
              <td class="px-6 py-4 text-center">
                <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {{ getCommissionTypeLabel(prof.commissionType) }}
                  ({{ formatCommissionValue(prof) }})
                </span>
              </td>
              <td class="px-6 py-4 text-right font-semibold text-orange-600">
                {{ n(prof.totalCommission, 'currency') }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 border-t border-gray-200">
            <tr>
              <td class="px-6 py-3 font-semibold text-gray-900">{{ t('common.total') }}</td>
              <td class="px-6 py-3 text-right font-semibold text-gray-900">
                {{ data.professionals.reduce((sum, p) => sum + p.appointmentCount, 0) }}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-gray-900">
                {{ n(data.totalRevenue, 'currency') }}
              </td>
              <td></td>
              <td class="px-6 py-3 text-right font-semibold text-orange-600">
                {{ n(data.totalCommissions, 'currency') }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>

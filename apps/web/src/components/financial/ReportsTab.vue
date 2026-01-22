<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

type ReportType = 'by-professional' | 'by-procedure' | 'profit-loss';

interface RevenueByProfessional {
  id: string;
  name: string;
  appointmentCount: number;
  completedCount: number;
  revenue: number;
  averageTicket: number;
}

interface RevenueByProcedure {
  id: string;
  name: string;
  code: string | null;
  count: number;
  revenue: number;
  averagePrice: number;
}

interface ProfitLossStatement {
  period: { startDate: string; endDate: string };
  revenue: {
    treatments: number;
    consultations: number;
    other: number;
    total: number;
  };
  expenses: {
    salaries: number;
    rent: number;
    supplies: number;
    utilities: number;
    marketing: number;
    commissions: number;
    other: number;
    total: number;
  };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

const props = defineProps<{
  startDate?: string;
  endDate?: string;
}>();

const { t, n } = useI18n();

const selectedReport = ref<ReportType>('by-professional');
const loading = ref(true);
const revenueByProfessional = ref<RevenueByProfessional[]>([]);
const revenueByProcedure = ref<RevenueByProcedure[]>([]);
const profitLoss = ref<ProfitLossStatement | null>(null);

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {};
    if (props.startDate) params.startDate = props.startDate;
    if (props.endDate) params.endDate = props.endDate;

    if (selectedReport.value === 'by-professional') {
      const response = await api.get('/financial/revenue/by-professional', { params });
      revenueByProfessional.value = response.data.revenue;
    } else if (selectedReport.value === 'by-procedure') {
      const response = await api.get('/financial/revenue/by-procedure', { params });
      revenueByProcedure.value = response.data.revenue;
    } else if (selectedReport.value === 'profit-loss') {
      const response = await api.get('/financial/profit-loss', { params });
      profitLoss.value = response.data.profitLoss;
    }
  } catch (error) {
    console.error('Failed to fetch report data:', error);
  } finally {
    loading.value = false;
  }
}

watch(() => [props.startDate, props.endDate, selectedReport.value], fetchData);
onMounted(fetchData);

defineExpose({ refresh: fetchData });
</script>

<template>
  <div class="space-y-6">
    <!-- Report Type Selector -->
    <div class="flex gap-2">
      <button
        v-for="type in ['by-professional', 'by-procedure', 'profit-loss'] as ReportType[]"
        :key="type"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          selectedReport === type
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="selectedReport = type"
      >
        {{ t(`financial.reports.${type === 'by-professional' ? 'revenueByProfessional' : type === 'by-procedure' ? 'revenueByProcedure' : 'profitLoss'}`) }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse">
      <div class="h-64 bg-gray-200 rounded-lg"></div>
    </div>

    <!-- Revenue by Professional -->
    <template v-else-if="selectedReport === 'by-professional'">
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div v-if="revenueByProfessional.length === 0" class="p-8 text-center text-gray-500">
          {{ t('financial.noData') }}
        </div>
        <table v-else class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.professional') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.appointments') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.completed') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.revenue') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.averageTicket') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in revenueByProfessional" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900">{{ item.name }}</td>
              <td class="px-6 py-4 text-right text-gray-600">{{ item.appointmentCount }}</td>
              <td class="px-6 py-4 text-right text-gray-600">{{ item.completedCount }}</td>
              <td class="px-6 py-4 text-right font-semibold text-green-600">{{ n(item.revenue, 'currency') }}</td>
              <td class="px-6 py-4 text-right text-gray-900">{{ n(item.averageTicket, 'currency') }}</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 border-t border-gray-200">
            <tr>
              <td class="px-6 py-3 font-semibold text-gray-900">{{ t('common.total') }}</td>
              <td class="px-6 py-3 text-right font-semibold text-gray-900">
                {{ revenueByProfessional.reduce((sum, p) => sum + p.appointmentCount, 0) }}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-gray-900">
                {{ revenueByProfessional.reduce((sum, p) => sum + p.completedCount, 0) }}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-green-600">
                {{ n(revenueByProfessional.reduce((sum, p) => sum + p.revenue, 0), 'currency') }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>

    <!-- Revenue by Procedure -->
    <template v-else-if="selectedReport === 'by-procedure'">
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div v-if="revenueByProcedure.length === 0" class="p-8 text-center text-gray-500">
          {{ t('financial.noData') }}
        </div>
        <table v-else class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.procedure') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.code') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.count') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.revenue') }}
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {{ t('financial.reports.averagePrice') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="item in revenueByProcedure" :key="item.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium text-gray-900">{{ item.name }}</td>
              <td class="px-6 py-4 text-gray-500">{{ item.code || '-' }}</td>
              <td class="px-6 py-4 text-right text-gray-600">{{ item.count }}</td>
              <td class="px-6 py-4 text-right font-semibold text-green-600">{{ n(item.revenue, 'currency') }}</td>
              <td class="px-6 py-4 text-right text-gray-900">{{ n(item.averagePrice, 'currency') }}</td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 border-t border-gray-200">
            <tr>
              <td class="px-6 py-3 font-semibold text-gray-900" colspan="2">{{ t('common.total') }}</td>
              <td class="px-6 py-3 text-right font-semibold text-gray-900">
                {{ revenueByProcedure.reduce((sum, p) => sum + p.count, 0) }}
              </td>
              <td class="px-6 py-3 text-right font-semibold text-green-600">
                {{ n(revenueByProcedure.reduce((sum, p) => sum + p.revenue, 0), 'currency') }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>

    <!-- Profit & Loss Statement -->
    <template v-else-if="selectedReport === 'profit-loss' && profitLoss">
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-6">{{ t('financial.reports.profitLossStatement') }}</h3>

        <!-- Revenue Section -->
        <div class="mb-6">
          <h4 class="text-sm font-semibold text-gray-700 uppercase mb-3">{{ t('financial.reports.revenue') }}</h4>
          <div class="space-y-2 pl-4">
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.treatment') }}</span>
              <span class="text-green-600">{{ n(profitLoss.revenue.treatments, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.consultation') }}</span>
              <span class="text-green-600">{{ n(profitLoss.revenue.consultations, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.other') }}</span>
              <span class="text-green-600">{{ n(profitLoss.revenue.other, 'currency') }}</span>
            </div>
          </div>
          <div class="flex justify-between mt-3 pt-3 border-t border-gray-200 font-semibold">
            <span>{{ t('financial.reports.totalRevenue') }}</span>
            <span class="text-green-600">{{ n(profitLoss.revenue.total, 'currency') }}</span>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="mb-6">
          <h4 class="text-sm font-semibold text-gray-700 uppercase mb-3">{{ t('financial.reports.expenses') }}</h4>
          <div class="space-y-2 pl-4">
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.salary') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.salaries, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.rent') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.rent, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.supplies') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.supplies, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.utilities') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.utilities, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.marketing') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.marketing, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.commissions.title') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.commissions, 'currency') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">{{ t('financial.categories.other') }}</span>
              <span class="text-red-600">{{ n(profitLoss.expenses.other, 'currency') }}</span>
            </div>
          </div>
          <div class="flex justify-between mt-3 pt-3 border-t border-gray-200 font-semibold">
            <span>{{ t('financial.reports.totalExpenses') }}</span>
            <span class="text-red-600">{{ n(profitLoss.expenses.total, 'currency') }}</span>
          </div>
        </div>

        <!-- Net Profit -->
        <div class="pt-4 border-t-2 border-gray-300">
          <div class="flex justify-between text-xl font-bold">
            <span>{{ t('financial.netProfit') }}</span>
            <span :class="profitLoss.netProfit >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ n(profitLoss.netProfit, 'currency') }}
            </span>
          </div>
          <div class="flex justify-between mt-2 text-sm text-gray-500">
            <span>{{ t('financial.profitMargin') }}</span>
            <span>{{ profitLoss.profitMargin.toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

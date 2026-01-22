<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface NetProfitData {
  grossIncome: number;
  totalExpenses: number;
  totalCommissions: number;
  netProfit: number;
  profitMargin: number;
  comparison: {
    previousGrossIncome: number;
    previousExpenses: number;
    previousNetProfit: number;
    incomeChange: number;
    expenseChange: number;
    profitChange: number;
  };
  breakdown: {
    incomeByCategory: { category: string; amount: number }[];
    expensesByCategory: { category: string; amount: number }[];
    commissionsByProfessional: { professionalId: string; name: string; amount: number }[];
  };
}

const props = defineProps<{
  startDate?: string;
  endDate?: string;
}>();

const { t, n } = useI18n();

const data = ref<NetProfitData | null>(null);
const loading = ref(true);

const totalDeductions = computed(() => {
  if (!data.value) return 0;
  return data.value.totalExpenses + data.value.totalCommissions;
});

const expensePercentage = computed(() => {
  if (!data.value || totalDeductions.value === 0) return 0;
  return (data.value.totalExpenses / totalDeductions.value) * 100;
});

const commissionPercentage = computed(() => {
  if (!data.value || totalDeductions.value === 0) return 0;
  return (data.value.totalCommissions / totalDeductions.value) * 100;
});

async function fetchData() {
  loading.value = true;
  try {
    const params: any = {};
    if (props.startDate) params.startDate = props.startDate;
    if (props.endDate) params.endDate = props.endDate;

    const response = await api.get('/financial/net-profit', { params });
    data.value = response.data.netProfit;
  } catch (error) {
    console.error('Failed to fetch net profit data:', error);
  } finally {
    loading.value = false;
  }
}

function formatChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

function getChangeClass(value: number, inverse = false): string {
  if (inverse) {
    return value <= 0 ? 'text-green-600' : 'text-red-600';
  }
  return value >= 0 ? 'text-green-600' : 'text-red-600';
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    treatment: t('financial.categories.treatment'),
    consultation: t('financial.categories.consultation'),
    salary: t('financial.categories.salary'),
    rent: t('financial.categories.rent'),
    supplies: t('financial.categories.supplies'),
    utilities: t('financial.categories.utilities'),
    marketing: t('financial.categories.marketing'),
    other: t('financial.categories.other'),
  };
  return labels[category] || category;
}

watch(() => [props.startDate, props.endDate], fetchData);
onMounted(fetchData);

defineExpose({ refresh: fetchData });
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="h-32 bg-gray-200 rounded-lg"></div>
        <div class="h-32 bg-gray-200 rounded-lg"></div>
        <div class="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Gross Revenue -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-500">{{ t('financial.grossRevenue') }}</h3>
            <span
              :class="['text-sm font-medium', getChangeClass(data.comparison.incomeChange)]"
            >
              {{ formatChange(data.comparison.incomeChange) }}
            </span>
          </div>
          <p class="mt-2 text-3xl font-bold text-gray-900">
            {{ n(data.grossIncome, 'currency') }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('financial.vsLastPeriod') }}: {{ n(data.comparison.previousGrossIncome, 'currency') }}
          </p>
        </div>

        <!-- Total Expenses -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-500">{{ t('financial.totalExpenses') }}</h3>
            <span
              :class="['text-sm font-medium', getChangeClass(data.comparison.expenseChange, true)]"
            >
              {{ formatChange(data.comparison.expenseChange) }}
            </span>
          </div>
          <p class="mt-2 text-3xl font-bold text-red-600">
            {{ n(data.totalExpenses + data.totalCommissions, 'currency') }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('financial.commissions.title') }}: {{ n(data.totalCommissions, 'currency') }}
          </p>
        </div>

        <!-- Net Profit -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-500">{{ t('financial.netProfit') }}</h3>
            <span
              :class="['text-sm font-medium', getChangeClass(data.comparison.profitChange)]"
            >
              {{ formatChange(data.comparison.profitChange) }}
            </span>
          </div>
          <p :class="['mt-2 text-3xl font-bold', data.netProfit >= 0 ? 'text-green-600' : 'text-red-600']">
            {{ n(data.netProfit, 'currency') }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('financial.profitMargin') }}: {{ data.profitMargin.toFixed(1) }}%
          </p>
        </div>
      </div>

      <!-- Deductions Breakdown -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('financial.deductions') }}</h3>
        <div class="space-y-4">
          <!-- Operating Expenses -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-600">{{ t('financial.operatingExpenses') }}</span>
              <span class="text-sm font-medium text-gray-900">{{ n(data.totalExpenses, 'currency') }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-red-500 h-2 rounded-full transition-all"
                :style="{ width: `${Math.min(expensePercentage, 100)}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-400 mt-1">{{ expensePercentage.toFixed(0) }}% {{ t('financial.ofDeductions') }}</p>
          </div>

          <!-- Commissions -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-600">{{ t('financial.commissions.title') }}</span>
              <span class="text-sm font-medium text-gray-900">{{ n(data.totalCommissions, 'currency') }}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div
                class="bg-orange-500 h-2 rounded-full transition-all"
                :style="{ width: `${Math.min(commissionPercentage, 100)}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-400 mt-1">{{ commissionPercentage.toFixed(0) }}% {{ t('financial.ofDeductions') }}</p>
          </div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Income by Category -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('financial.incomeByCategory') }}</h3>
          <div v-if="data.breakdown.incomeByCategory.length === 0" class="text-gray-500 text-sm">
            {{ t('financial.noData') }}
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in data.breakdown.incomeByCategory"
              :key="item.category"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-gray-600">{{ getCategoryLabel(item.category) }}</span>
              <span class="text-sm font-medium text-green-600">{{ n(item.amount, 'currency') }}</span>
            </div>
          </div>
        </div>

        <!-- Expenses by Category -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('financial.expensesByCategory') }}</h3>
          <div v-if="data.breakdown.expensesByCategory.length === 0" class="text-gray-500 text-sm">
            {{ t('financial.noData') }}
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in data.breakdown.expensesByCategory"
              :key="item.category"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-gray-600">{{ getCategoryLabel(item.category) }}</span>
              <span class="text-sm font-medium text-red-600">{{ n(item.amount, 'currency') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Commissions by Professional -->
      <div v-if="data.breakdown.commissionsByProfessional.length > 0" class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('financial.commissionsByProfessional') }}</h3>
        <div class="space-y-3">
          <div
            v-for="item in data.breakdown.commissionsByProfessional"
            :key="item.professionalId"
            class="flex items-center justify-between"
          >
            <span class="text-sm text-gray-600">{{ item.name }}</span>
            <span class="text-sm font-medium text-orange-600">{{ n(item.amount, 'currency') }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

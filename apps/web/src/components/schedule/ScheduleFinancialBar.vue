<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ScheduleAlert {
  type: 'low_profit' | 'idle_schedule' | 'underutilized' | 'no_show_risk';
  message: string;
  severity: 'warning' | 'info';
  day?: string;
  professional?: string;
}

export interface FinancialSummary {
  totalExpectedRevenue: number;
  dailyRevenue: { date: string; dayName: string; amount: number; appointmentCount: number; occupancyPercent: number }[];
  professionalRevenue: { id: string; name: string; amount: number; appointmentCount: number }[];
  alerts: ScheduleAlert[];
  averageTicket: number;
  comparisonWithLastWeek: number;
  appointmentCount: number;
}

const props = defineProps<{
  summary: FinancialSummary | null;
  loading: boolean;
}>();

const { t } = useI18n();

// Use Intl.NumberFormat directly to avoid vue-i18n n() issues with undefined values
function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return '0.0%';
  const numValue = Number(value);
  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${numValue.toFixed(1)}%`;
}

const comparisonClass = computed(() => {
  if (!props.summary) return 'text-gray-500';
  return props.summary.comparisonWithLastWeek >= 0 ? 'text-green-600' : 'text-red-600';
});

const topAlerts = computed(() => {
  if (!props.summary) return [];
  return props.summary.alerts.slice(0, 3);
});

function getAlertIcon(type: string): string {
  switch (type) {
    case 'low_profit': return '!';
    case 'idle_schedule': return '~';
    case 'underutilized': return '-';
    case 'no_show_risk': return '?';
    default: return 'i';
  }
}

function getAlertClass(severity: string): string {
  return severity === 'warning'
    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-blue-100 text-blue-800 border-blue-300';
}
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-pulse flex items-center gap-4">
        <div class="h-8 w-32 bg-gray-200 rounded"></div>
        <div class="h-8 w-24 bg-gray-200 rounded"></div>
        <div class="h-8 w-40 bg-gray-200 rounded"></div>
      </div>
    </div>

    <!-- Financial Summary -->
    <div v-else-if="summary" class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <!-- Main Stats -->
      <div class="flex items-center gap-6">
        <!-- Expected Revenue -->
        <div class="flex items-center gap-2">
          <span class="text-2xl">$</span>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wide">{{ t('schedule.smart.expectedRevenue') }}</p>
            <p class="text-xl font-bold text-gray-900">{{ formatCurrency(summary.totalExpectedRevenue) }}</p>
          </div>
        </div>

        <!-- Comparison -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="summary.comparisonWithLastWeek >= 0 ? 'bg-green-100' : 'bg-red-100'">
            <span :class="comparisonClass">{{ summary.comparisonWithLastWeek >= 0 ? '^' : 'v' }}</span>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wide">{{ t('schedule.smart.vsLastWeek') }}</p>
            <p class="text-lg font-semibold" :class="comparisonClass">{{ formatPercent(summary.comparisonWithLastWeek) }}</p>
          </div>
        </div>

        <!-- Average Ticket -->
        <div class="hidden md:flex items-center gap-2">
          <span class="text-xl text-gray-400">#</span>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wide">{{ t('schedule.smart.averageTicket') }}</p>
            <p class="text-lg font-semibold text-gray-900">{{ formatCurrency(summary.averageTicket) }}</p>
          </div>
        </div>

        <!-- Appointment Count -->
        <div class="hidden lg:flex items-center gap-2">
          <span class="text-xl text-gray-400">=</span>
          <div>
            <p class="text-xs text-gray-500 uppercase tracking-wide">{{ t('schedule.smart.appointments') }}</p>
            <p class="text-lg font-semibold text-gray-900">{{ summary.appointmentCount }}</p>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="topAlerts.length > 0" class="flex flex-wrap gap-2">
        <div
          v-for="(alert, index) in topAlerts"
          :key="index"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
          :class="getAlertClass(alert.severity)"
        >
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                :class="alert.severity === 'warning' ? 'bg-yellow-300' : 'bg-blue-300'">
            {{ getAlertIcon(alert.type) }}
          </span>
          <span>{{ alert.message }}</span>
        </div>
      </div>

      <!-- No Alerts -->
      <div v-else class="flex items-center gap-2 text-green-600">
        <span class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">+</span>
        <span class="text-sm">{{ t('schedule.smart.noAlerts') }}</span>
      </div>
    </div>

    <!-- No Data -->
    <div v-else class="text-center py-4 text-gray-500">
      {{ t('schedule.smart.noData') }}
    </div>
  </div>
</template>

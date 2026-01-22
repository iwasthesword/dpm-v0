<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface Metric {
  key: string;
  value: string | number;
  format?: 'currency' | 'percent' | 'number';
}

const props = defineProps<{
  title: string;
  status: HealthStatus;
  icon: 'heart' | 'clock' | 'cash' | 'megaphone';
  metrics: Metric[];
  alert?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}>();

const { t, n } = useI18n();

const statusConfig = computed(() => {
  const configs = {
    healthy: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: 'bg-green-500',
      label: t('dashboard.health.status.healthy'),
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: 'bg-yellow-500',
      label: t('dashboard.health.status.warning'),
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: 'bg-red-500',
      label: t('dashboard.health.status.critical'),
    },
  };
  return configs[props.status];
});

function formatValue(metric: Metric): string {
  if (metric.format === 'currency') {
    return n(Number(metric.value), 'currency');
  }
  if (metric.format === 'percent') {
    return `${Number(metric.value).toFixed(1)}%`;
  }
  return String(metric.value);
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <!-- Icon -->
        <div
          class="w-12 h-12 rounded-lg flex items-center justify-center"
          :class="statusConfig.icon"
        >
          <!-- Heart Icon -->
          <svg v-if="icon === 'heart'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <!-- Clock Icon -->
          <svg v-else-if="icon === 'clock'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <!-- Cash Icon -->
          <svg v-else-if="icon === 'cash'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <!-- Megaphone Icon -->
          <svg v-else-if="icon === 'megaphone'" class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
      </div>
      <!-- Status Badge -->
      <span
        class="px-3 py-1 text-xs font-medium rounded-full"
        :class="[statusConfig.bg, statusConfig.text]"
      >
        {{ statusConfig.label }}
      </span>
    </div>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      <div
        v-for="metric in metrics"
        :key="metric.key"
        class="bg-gray-50 rounded-lg p-3"
      >
        <p class="text-xs text-gray-500 mb-1">{{ t(`dashboard.health.metrics.${metric.key}`) }}</p>
        <p class="text-lg font-semibold text-gray-900">{{ formatValue(metric) }}</p>
      </div>
    </div>

    <!-- Alert -->
    <div
      v-if="alert"
      class="flex items-center gap-2 p-3 rounded-lg mb-4"
      :class="status === 'critical' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'"
    >
      <svg class="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span class="text-sm font-medium">{{ alert }}</span>
    </div>

    <!-- Additional Content Slot -->
    <slot></slot>

    <!-- CTA Button -->
    <button
      v-if="ctaLabel && ctaAction"
      @click="ctaAction"
      class="w-full py-2.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors mt-4"
    >
      {{ ctaLabel }}
    </button>
  </div>
</template>

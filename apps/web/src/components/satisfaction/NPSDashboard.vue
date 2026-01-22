<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface DashboardData {
  currentNPS: number;
  previousNPS: number;
  npsChange: number;
  totalResponses: number;
  pendingAlerts: number;
  responseRate: number;
  breakdown: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  recentResponses: {
    id: string;
    patientName: string;
    score: number;
    completedAt: string;
    surveyName: string;
  }[];
  trendData: { month: string; score: number }[];
}

const { t, d } = useI18n();

const data = ref<DashboardData | null>(null);
const loading = ref(true);

const totalBreakdown = computed(() => {
  if (!data.value) return 0;
  return data.value.breakdown.promoters + data.value.breakdown.passives + data.value.breakdown.detractors;
});

const promoterPercentage = computed(() => {
  if (!totalBreakdown.value) return 0;
  return (data.value!.breakdown.promoters / totalBreakdown.value) * 100;
});

const passivePercentage = computed(() => {
  if (!totalBreakdown.value) return 0;
  return (data.value!.breakdown.passives / totalBreakdown.value) * 100;
});

const detractorPercentage = computed(() => {
  if (!totalBreakdown.value) return 0;
  return (data.value!.breakdown.detractors / totalBreakdown.value) * 100;
});

const npsColor = computed(() => {
  if (!data.value) return 'text-gray-500';
  const score = data.value.currentNPS;
  if (score >= 50) return 'text-green-600';
  if (score >= 0) return 'text-yellow-600';
  return 'text-red-600';
});

const npsGaugeRotation = computed(() => {
  if (!data.value) return 0;
  // NPS range is -100 to 100, map to 0 to 180 degrees
  const score = Math.max(-100, Math.min(100, data.value.currentNPS));
  return ((score + 100) / 200) * 180;
});

async function fetchData() {
  loading.value = true;
  try {
    const response = await api.get('/surveys/nps/dashboard');
    data.value = response.data.dashboard;
  } catch (error) {
    console.error('Failed to fetch NPS dashboard:', error);
  } finally {
    loading.value = false;
  }
}

function formatChange(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(0)}`;
}

function getScoreClass(score: number): string {
  if (score >= 9) return 'text-green-600';
  if (score >= 7) return 'text-yellow-600';
  return 'text-red-600';
}

onMounted(fetchData);

defineExpose({ refresh: fetchData });
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="h-32 bg-gray-200 rounded-lg"></div>
        <div class="h-32 bg-gray-200 rounded-lg"></div>
        <div class="h-32 bg-gray-200 rounded-lg"></div>
        <div class="h-32 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- NPS Score Card -->
        <div class="bg-white rounded-lg border border-gray-200 p-6 col-span-1 md:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-500">{{ t('satisfaction.npsScore') }}</h3>
            <span
              :class="[
                'text-sm font-medium',
                data.npsChange >= 0 ? 'text-green-600' : 'text-red-600'
              ]"
            >
              {{ formatChange(data.npsChange) }} {{ t('satisfaction.vsLastPeriod') }}
            </span>
          </div>

          <!-- NPS Gauge -->
          <div class="flex items-center justify-center">
            <div class="relative w-48 h-24">
              <!-- Gauge Background -->
              <svg class="w-full h-full" viewBox="0 0 200 100">
                <!-- Background arc -->
                <path
                  d="M 10 100 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="12"
                  stroke-linecap="round"
                />
                <!-- Red zone (detractors: -100 to 0) -->
                <path
                  d="M 10 100 A 90 90 0 0 1 100 10"
                  fill="none"
                  stroke="#ef4444"
                  stroke-width="12"
                  stroke-linecap="round"
                  opacity="0.3"
                />
                <!-- Yellow zone (passives: 0 to 50) -->
                <path
                  d="M 100 10 A 90 90 0 0 1 145 26"
                  fill="none"
                  stroke="#eab308"
                  stroke-width="12"
                  stroke-linecap="round"
                  opacity="0.3"
                />
                <!-- Green zone (promoters: 50 to 100) -->
                <path
                  d="M 145 26 A 90 90 0 0 1 190 100"
                  fill="none"
                  stroke="#22c55e"
                  stroke-width="12"
                  stroke-linecap="round"
                  opacity="0.3"
                />
                <!-- Needle -->
                <g :style="{ transform: `rotate(${npsGaugeRotation}deg)`, transformOrigin: '100px 100px' }">
                  <line
                    x1="100"
                    y1="100"
                    x2="100"
                    y2="20"
                    stroke="#1f2937"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                </g>
                <!-- Center circle -->
                <circle cx="100" cy="100" r="8" fill="#1f2937" />
              </svg>
              <!-- Score Display -->
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <span :class="['text-4xl font-bold', npsColor]">{{ data.currentNPS }}</span>
              </div>
            </div>
          </div>

          <!-- Scale Labels -->
          <div class="flex justify-between text-xs text-gray-500 mt-2 px-4">
            <span>-100</span>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <!-- Response Rate -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-sm font-medium text-gray-500">{{ t('satisfaction.responseRate') }}</h3>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ data.responseRate.toFixed(1) }}%</p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('satisfaction.totalResponses') }}: {{ data.totalResponses }}
          </p>
        </div>

        <!-- Pending Alerts -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-sm font-medium text-gray-500">{{ t('satisfaction.pendingAlerts') }}</h3>
          <p :class="['mt-2 text-3xl font-bold', data.pendingAlerts > 0 ? 'text-red-600' : 'text-green-600']">
            {{ data.pendingAlerts }}
          </p>
          <p class="mt-1 text-xs text-gray-400">
            {{ t('satisfaction.alertsRequireAttention') }}
          </p>
        </div>
      </div>

      <!-- Breakdown & Trend -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- NPS Breakdown -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('satisfaction.breakdown') }}</h3>

          <!-- Stacked Bar -->
          <div class="h-8 flex rounded-lg overflow-hidden mb-4">
            <div
              class="bg-green-500 transition-all"
              :style="{ width: `${promoterPercentage}%` }"
              :title="`${t('satisfaction.promoters')}: ${data.breakdown.promoters}`"
            ></div>
            <div
              class="bg-yellow-500 transition-all"
              :style="{ width: `${passivePercentage}%` }"
              :title="`${t('satisfaction.passives')}: ${data.breakdown.passives}`"
            ></div>
            <div
              class="bg-red-500 transition-all"
              :style="{ width: `${detractorPercentage}%` }"
              :title="`${t('satisfaction.detractors')}: ${data.breakdown.detractors}`"
            ></div>
          </div>

          <!-- Legend -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-green-500 rounded"></div>
                <span class="text-sm text-gray-600">{{ t('satisfaction.promoters') }} (9-10)</span>
              </div>
              <div class="text-right">
                <span class="font-semibold text-gray-900">{{ data.breakdown.promoters }}</span>
                <span class="text-sm text-gray-500 ml-1">({{ promoterPercentage.toFixed(0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-yellow-500 rounded"></div>
                <span class="text-sm text-gray-600">{{ t('satisfaction.passives') }} (7-8)</span>
              </div>
              <div class="text-right">
                <span class="font-semibold text-gray-900">{{ data.breakdown.passives }}</span>
                <span class="text-sm text-gray-500 ml-1">({{ passivePercentage.toFixed(0) }}%)</span>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 bg-red-500 rounded"></div>
                <span class="text-sm text-gray-600">{{ t('satisfaction.detractors') }} (0-6)</span>
              </div>
              <div class="text-right">
                <span class="font-semibold text-gray-900">{{ data.breakdown.detractors }}</span>
                <span class="text-sm text-gray-500 ml-1">({{ detractorPercentage.toFixed(0) }}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- NPS Trend -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('satisfaction.trend') }}</h3>

          <div v-if="data.trendData.length === 0" class="text-center py-8 text-gray-500">
            {{ t('satisfaction.noTrendData') }}
          </div>

          <div v-else class="h-48 flex items-end gap-2">
            <div
              v-for="point in data.trendData"
              :key="point.month"
              class="flex-1 flex flex-col items-center"
            >
              <!-- Bar -->
              <div
                class="w-full rounded-t transition-all"
                :class="[
                  point.score >= 50 ? 'bg-green-500' :
                  point.score >= 0 ? 'bg-yellow-500' : 'bg-red-500'
                ]"
                :style="{ height: `${Math.abs(point.score) + 10}%` }"
              ></div>
              <!-- Score -->
              <span class="text-xs font-medium mt-1">{{ point.score }}</span>
              <!-- Month -->
              <span class="text-xs text-gray-500">{{ point.month }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Responses -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('satisfaction.recentResponses') }}</h3>

        <div v-if="data.recentResponses.length === 0" class="text-center py-8 text-gray-500">
          {{ t('satisfaction.noResponses') }}
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="response in data.recentResponses"
            :key="response.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ response.patientName }}</p>
              <p class="text-sm text-gray-500">{{ response.surveyName }}</p>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm text-gray-500">
                {{ d(new Date(response.completedAt), 'short') }}
              </span>
              <span :class="['text-2xl font-bold', getScoreClass(response.score)]">
                {{ response.score }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

const { t } = useI18n();

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  endpoint: string;
  hasDateRange: boolean;
  hasProfessionalFilter?: boolean;
}

const reports: ReportConfig[] = [
  {
    id: 'financial-summary',
    name: t('reports.financialSummary'),
    description: t('reports.financialSummaryDesc'),
    icon: 'currency-dollar',
    endpoint: '/reports/financial/summary',
    hasDateRange: true,
  },
  {
    id: 'patients-list',
    name: t('reports.patientsList'),
    description: t('reports.patientsListDesc'),
    icon: 'users',
    endpoint: '/reports/patients/list',
    hasDateRange: false,
  },
  {
    id: 'appointments-history',
    name: t('reports.appointmentsHistory'),
    description: t('reports.appointmentsHistoryDesc'),
    icon: 'calendar',
    endpoint: '/reports/appointments/history',
    hasDateRange: true,
    hasProfessionalFilter: true,
  },
  {
    id: 'commissions',
    name: t('reports.commissions'),
    description: t('reports.commissionsDesc'),
    icon: 'chart-bar',
    endpoint: '/reports/staff/commissions',
    hasDateRange: true,
  },
  {
    id: 'activity-log',
    name: t('reports.activityLog'),
    description: t('reports.activityLogDesc'),
    icon: 'clipboard-list',
    endpoint: '/reports/audit/activity',
    hasDateRange: true,
  },
];

const selectedReport = ref<ReportConfig | null>(null);
const downloading = ref(false);
const format = ref<'excel' | 'csv'>('excel');
const startDate = ref('');
const endDate = ref('');
const professionalId = ref('');
const professionals = ref<{ id: string; name: string }[]>([]);

// Set default date range to last 30 days
const today = new Date();
const thirtyDaysAgo = new Date(today);
thirtyDaysAgo.setDate(today.getDate() - 30);
startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
endDate.value = today.toISOString().split('T')[0];

async function fetchProfessionals() {
  try {
    const response = await api.get('/staff');
    professionals.value = response.data.staff.map((s: any) => ({ id: s.id, name: s.name }));
  } catch (error) {
    console.error('Failed to fetch professionals:', error);
  }
}

function selectReport(report: ReportConfig) {
  selectedReport.value = report;
  if (report.hasProfessionalFilter && professionals.value.length === 0) {
    fetchProfessionals();
  }
}

async function downloadReport() {
  if (!selectedReport.value) return;

  downloading.value = true;
  try {
    const params = new URLSearchParams();
    params.append('format', format.value);

    if (selectedReport.value.hasDateRange) {
      if (startDate.value) params.append('startDate', startDate.value);
      if (endDate.value) params.append('endDate', endDate.value);
    }

    if (selectedReport.value.hasProfessionalFilter && professionalId.value) {
      params.append('professionalId', professionalId.value);
    }

    const response = await api.get(`${selectedReport.value.endpoint}?${params}`, {
      responseType: 'blob',
    });

    // Get filename from Content-Disposition header or generate one
    const contentDisposition = response.headers['content-disposition'];
    let filename = `${selectedReport.value.id}.${format.value === 'excel' ? 'xlsx' : 'csv'}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download report:', error);
  } finally {
    downloading.value = false;
  }
}

function getIconPath(icon: string): string {
  const icons: Record<string, string> = {
    'currency-dollar':
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    users:
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    calendar:
      'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'clipboard-list':
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  };
  return icons[icon] || icons['clipboard-list'];
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('reports.title') }}</h1>
      <p class="text-gray-500">{{ t('reports.subtitle') }}</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6">
      <!-- Report Selection -->
      <div class="space-y-4">
        <h2 class="text-lg font-medium text-gray-900">{{ t('reports.selectReport') }}</h2>

        <div class="space-y-3">
          <div
            v-for="report in reports"
            :key="report.id"
            @click="selectReport(report)"
            :class="[
              'p-4 bg-white rounded-lg border-2 cursor-pointer transition-all',
              selectedReport?.id === report.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300',
            ]"
          >
            <div class="flex items-start gap-3">
              <div
                :class="[
                  'p-2 rounded-lg',
                  selectedReport?.id === report.id ? 'bg-primary/10' : 'bg-gray-100',
                ]"
              >
                <svg
                  class="w-6 h-6"
                  :class="selectedReport?.id === report.id ? 'text-primary' : 'text-gray-600'"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    :d="getIconPath(report.icon)"
                  />
                </svg>
              </div>
              <div>
                <h3 class="font-medium text-gray-900">{{ report.name }}</h3>
                <p class="text-sm text-gray-500">{{ report.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Options -->
      <div v-if="selectedReport" class="bg-white rounded-lg border border-gray-200 p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">{{ t('reports.options') }}</h2>

        <div class="space-y-4">
          <!-- Format Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">{{
              t('reports.format')
            }}</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="format"
                  value="excel"
                  class="text-primary focus:ring-primary"
                />
                <span class="text-sm">Excel (.xlsx)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="format"
                  value="csv"
                  class="text-primary focus:ring-primary"
                />
                <span class="text-sm">CSV</span>
              </label>
            </div>
          </div>

          <!-- Date Range -->
          <div v-if="selectedReport.hasDateRange" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{
                t('reports.startDate')
              }}</label>
              <input
                v-model="startDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{
                t('reports.endDate')
              }}</label>
              <input
                v-model="endDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <!-- Professional Filter -->
          <div v-if="selectedReport.hasProfessionalFilter">
            <label class="block text-sm font-medium text-gray-700 mb-1">{{
              t('reports.professional')
            }}</label>
            <select
              v-model="professionalId"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{{ t('reports.allProfessionals') }}</option>
              <option v-for="p in professionals" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <!-- Download Button -->
          <button
            @click="downloadReport"
            :disabled="downloading"
            class="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg
              v-if="!downloading"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <svg
              v-else
              class="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {{ downloading ? t('reports.downloading') : t('reports.download') }}
          </button>
        </div>
      </div>

      <!-- No Selection -->
      <div
        v-else
        class="bg-gray-50 rounded-lg border border-gray-200 p-6 flex items-center justify-center"
      >
        <p class="text-gray-500">{{ t('reports.selectToDownload') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface Alert {
  id: string;
  clinicId: string;
  responseId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  score: number;
  notes: string | null;
  surveyName: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

const { t, d } = useI18n();

const alerts = ref<Alert[]>([]);
const loading = ref(true);
const statusFilter = ref<'all' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'>('all');

// Modal state
const showNoteModal = ref(false);
const selectedAlert = ref<Alert | null>(null);
const noteText = ref('');
const newStatus = ref<'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'>('IN_PROGRESS');

async function fetchAlerts() {
  loading.value = true;
  try {
    const params: any = {};
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value;
    }

    const response = await api.get('/surveys/alerts', { params });
    alerts.value = response.data.alerts;
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
  } finally {
    loading.value = false;
  }
}

function getPriorityClass(priority: string): string {
  const classes: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return classes[priority] || 'bg-gray-100 text-gray-800';
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    PENDING: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    DISMISSED: 'bg-gray-100 text-gray-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    URGENT: t('satisfaction.priorities.urgent'),
    HIGH: t('satisfaction.priorities.high'),
    MEDIUM: t('satisfaction.priorities.medium'),
    LOW: t('satisfaction.priorities.low'),
  };
  return labels[priority] || priority;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: t('satisfaction.statuses.pending'),
    IN_PROGRESS: t('satisfaction.statuses.inProgress'),
    RESOLVED: t('satisfaction.statuses.resolved'),
    DISMISSED: t('satisfaction.statuses.dismissed'),
  };
  return labels[status] || status;
}

function openUpdateModal(alert: Alert, status: 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED') {
  selectedAlert.value = alert;
  newStatus.value = status;
  noteText.value = alert.notes || '';
  showNoteModal.value = true;
}

async function updateAlert() {
  if (!selectedAlert.value) return;

  try {
    await api.put(`/surveys/alerts/${selectedAlert.value.id}`, {
      status: newStatus.value,
      notes: noteText.value || null,
    });

    showNoteModal.value = false;
    await fetchAlerts();
  } catch (error) {
    console.error('Failed to update alert:', error);
    alert(t('satisfaction.updateError'));
  }
}

async function quickUpdateStatus(alertId: string, status: 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED') {
  try {
    await api.put(`/surveys/alerts/${alertId}`, { status });
    await fetchAlerts();
  } catch (error) {
    console.error('Failed to update alert:', error);
  }
}

onMounted(fetchAlerts);

defineExpose({ refresh: fetchAlerts });
</script>

<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="flex gap-2">
      <button
        v-for="status in ['all', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'] as const"
        :key="status"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
          statusFilter === status
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
        @click="statusFilter = status; fetchAlerts()"
      >
        {{ status === 'all' ? t('common.all') : getStatusLabel(status) }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-24 bg-gray-200 rounded-lg"></div>
      <div class="h-24 bg-gray-200 rounded-lg"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="alerts.length === 0" class="text-center py-12 text-gray-500">
      {{ t('satisfaction.noAlerts') }}
    </div>

    <!-- Alerts List -->
    <div v-else class="space-y-3">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        :class="[
          'bg-white rounded-lg border p-4',
          getPriorityClass(alert.priority)
        ]"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <span :class="['px-2 py-0.5 text-xs font-medium rounded', getPriorityClass(alert.priority)]">
                {{ getPriorityLabel(alert.priority) }}
              </span>
              <span :class="['px-2 py-0.5 text-xs font-medium rounded', getStatusClass(alert.status)]">
                {{ getStatusLabel(alert.status) }}
              </span>
              <span class="text-2xl font-bold text-red-600">{{ alert.score }}</span>
            </div>

            <div class="space-y-1">
              <p class="font-medium text-gray-900">{{ alert.patientName }}</p>
              <p class="text-sm text-gray-600">{{ alert.patientPhone }}</p>
              <p class="text-sm text-gray-500">{{ alert.surveyName }}</p>
              <p class="text-xs text-gray-400">
                {{ d(new Date(alert.createdAt), 'long') }}
              </p>
            </div>

            <div v-if="alert.notes" class="mt-3 p-2 bg-white/50 rounded text-sm text-gray-700">
              <span class="font-medium">{{ t('satisfaction.notes') }}:</span> {{ alert.notes }}
            </div>
          </div>

          <div v-if="alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED'" class="flex flex-col gap-2">
            <button
              v-if="alert.status === 'PENDING'"
              class="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              @click="quickUpdateStatus(alert.id, 'IN_PROGRESS')"
            >
              {{ t('satisfaction.startWorking') }}
            </button>
            <button
              class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              @click="openUpdateModal(alert, 'RESOLVED')"
            >
              {{ t('satisfaction.resolve') }}
            </button>
            <button
              class="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              @click="openUpdateModal(alert, 'DISMISSED')"
            >
              {{ t('satisfaction.dismiss') }}
            </button>
          </div>

          <div v-else class="text-sm text-gray-500">
            <p v-if="alert.resolvedAt">
              {{ t('satisfaction.resolvedAt') }}: {{ d(new Date(alert.resolvedAt), 'short') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Note Modal -->
    <Teleport to="body">
      <div
        v-if="showNoteModal && selectedAlert"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            {{ newStatus === 'RESOLVED' ? t('satisfaction.resolveAlert') : t('satisfaction.dismissAlert') }}
          </h3>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('satisfaction.addNote') }}
            </label>
            <textarea
              v-model="noteText"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('satisfaction.notePlaceholder')"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3">
            <button
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="showNoteModal = false"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              :class="[
                'px-4 py-2 text-white rounded-lg transition-colors',
                newStatus === 'RESOLVED'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-500 hover:bg-gray-600'
              ]"
              @click="updateAlert"
            >
              {{ newStatus === 'RESOLVED' ? t('satisfaction.resolve') : t('satisfaction.dismiss') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

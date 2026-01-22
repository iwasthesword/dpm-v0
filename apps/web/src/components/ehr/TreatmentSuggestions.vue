<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface TreatmentSuggestion {
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  tooth: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
}

const props = defineProps<{
  patientId: string;
}>();

const emit = defineEmits<{
  (e: 'add-to-plan', suggestion: TreatmentSuggestion): void;
}>();

const { t, n } = useI18n();

const suggestions = ref<TreatmentSuggestion[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const collapsed = ref(false);

const highPriority = computed(() =>
  suggestions.value.filter(s => s.priority === 'high')
);
const mediumPriority = computed(() =>
  suggestions.value.filter(s => s.priority === 'medium')
);
const lowPriority = computed(() =>
  suggestions.value.filter(s => s.priority === 'low')
);

async function fetchSuggestions() {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get(`/ehr/patients/${props.patientId}/suggestions`);
    suggestions.value = response.data.suggestions;
  } catch (err) {
    console.error('Failed to fetch suggestions:', err);
    error.value = t('ehr.suggestions.errorLoading');
  } finally {
    loading.value = false;
  }
}

function formatCurrency(value: number): string {
  return n(value, 'currency');
}

function getPriorityLabel(priority: string): string {
  return t(`ehr.suggestions.priority.${priority}`);
}

function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function addToPlan(suggestion: TreatmentSuggestion) {
  emit('add-to-plan', suggestion);
}

onMounted(fetchSuggestions);

defineExpose({ refresh: fetchSuggestions });
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 cursor-pointer"
      @click="collapsed = !collapsed"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">*</span>
        <h3 class="font-semibold text-gray-900">{{ t('ehr.suggestions.title') }}</h3>
        <span v-if="suggestions.length > 0" class="px-2 py-0.5 text-xs bg-purple-200 text-purple-800 rounded-full">
          {{ suggestions.length }}
        </span>
      </div>
      <button class="text-gray-400 hover:text-gray-600">
        {{ collapsed ? '+' : '-' }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="!collapsed" class="p-4">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8 text-red-500">
        {{ error }}
        <button @click="fetchSuggestions" class="block mx-auto mt-2 text-sm text-purple-600 hover:underline">
          {{ t('common.retry') }}
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="suggestions.length === 0" class="text-center py-8 text-gray-500">
        <span class="text-3xl block mb-2">+</span>
        <p>{{ t('ehr.suggestions.noSuggestions') }}</p>
        <p class="text-sm mt-1">{{ t('ehr.suggestions.odontogramUpToDate') }}</p>
      </div>

      <!-- Suggestions List -->
      <div v-else class="space-y-4">
        <p class="text-sm text-gray-600 mb-4">{{ t('ehr.suggestions.basedOnOdontogram') }}</p>

        <!-- High Priority -->
        <div v-if="highPriority.length > 0">
          <h4 class="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
            <span class="w-2 h-2 rounded-full bg-red-500"></span>
            {{ t('ehr.suggestions.priority.high') }}
          </h4>
          <div class="space-y-2">
            <div
              v-for="suggestion in highPriority"
              :key="`${suggestion.tooth}-${suggestion.procedureId}`"
              class="flex items-center justify-between p-3 rounded-lg border"
              :class="getPriorityClass(suggestion.priority)"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ t('ehr.suggestions.tooth') }} {{ suggestion.tooth }}</span>
                  <span class="text-gray-500">-</span>
                  <span>{{ suggestion.procedureName }}</span>
                </div>
                <p class="text-sm opacity-80 mt-0.5">{{ suggestion.reason }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium">{{ formatCurrency(suggestion.estimatedCost) }}</span>
                <button
                  @click="addToPlan(suggestion)"
                  class="px-3 py-1 text-sm bg-white rounded border border-current hover:bg-red-50 transition-colors"
                >
                  + {{ t('ehr.suggestions.add') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Medium Priority -->
        <div v-if="mediumPriority.length > 0">
          <h4 class="flex items-center gap-2 text-sm font-medium text-yellow-700 mb-2">
            <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
            {{ t('ehr.suggestions.priority.medium') }}
          </h4>
          <div class="space-y-2">
            <div
              v-for="suggestion in mediumPriority"
              :key="`${suggestion.tooth}-${suggestion.procedureId}`"
              class="flex items-center justify-between p-3 rounded-lg border"
              :class="getPriorityClass(suggestion.priority)"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ t('ehr.suggestions.tooth') }} {{ suggestion.tooth }}</span>
                  <span class="text-gray-500">-</span>
                  <span>{{ suggestion.procedureName }}</span>
                </div>
                <p class="text-sm opacity-80 mt-0.5">{{ suggestion.reason }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium">{{ formatCurrency(suggestion.estimatedCost) }}</span>
                <button
                  @click="addToPlan(suggestion)"
                  class="px-3 py-1 text-sm bg-white rounded border border-current hover:bg-yellow-50 transition-colors"
                >
                  + {{ t('ehr.suggestions.add') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Low Priority -->
        <div v-if="lowPriority.length > 0">
          <h4 class="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            {{ t('ehr.suggestions.priority.low') }}
          </h4>
          <div class="space-y-2">
            <div
              v-for="suggestion in lowPriority"
              :key="`${suggestion.tooth}-${suggestion.procedureId}`"
              class="flex items-center justify-between p-3 rounded-lg border"
              :class="getPriorityClass(suggestion.priority)"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ t('ehr.suggestions.tooth') }} {{ suggestion.tooth }}</span>
                  <span class="text-gray-500">-</span>
                  <span>{{ suggestion.procedureName }}</span>
                </div>
                <p class="text-sm opacity-80 mt-0.5">{{ suggestion.reason }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium">{{ formatCurrency(suggestion.estimatedCost) }}</span>
                <button
                  @click="addToPlan(suggestion)"
                  class="px-3 py-1 text-sm bg-white rounded border border-current hover:bg-blue-50 transition-colors"
                >
                  + {{ t('ehr.suggestions.add') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentFilters;
  patientCount: number | null;
  isActive: boolean;
}

interface SegmentFilters {
  ageMin?: number;
  ageMax?: number;
  gender?: string;
  tags?: string[];
  lastVisitDaysAgo?: number;
  noVisitDaysAgo?: number;
  source?: string;
  hasWhatsApp?: boolean;
  hasEmail?: boolean;
}

interface PreviewData {
  count: number;
  patients: { id: string; name: string; phone: string }[];
}

const props = defineProps<{
  segment: Segment | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();

const isEditing = computed(() => !!props.segment);
const saving = ref(false);
const previewing = ref(false);
const preview = ref<PreviewData | null>(null);

const genderOptions = ['MALE', 'FEMALE', 'OTHER'] as const;

const form = ref({
  name: '',
  description: '',
  isActive: true,
  filters: {
    ageMin: undefined as number | undefined,
    ageMax: undefined as number | undefined,
    gender: '' as string,
    tags: [] as string[],
    lastVisitDaysAgo: undefined as number | undefined,
    noVisitDaysAgo: undefined as number | undefined,
    source: '' as string,
    hasWhatsApp: false,
    hasEmail: false,
  },
});

const newTag = ref('');

watch(
  () => props.segment,
  (segment) => {
    if (segment) {
      form.value = {
        name: segment.name,
        description: segment.description || '',
        isActive: segment.isActive,
        filters: {
          ageMin: segment.filters.ageMin,
          ageMax: segment.filters.ageMax,
          gender: segment.filters.gender || '',
          tags: segment.filters.tags || [],
          lastVisitDaysAgo: segment.filters.lastVisitDaysAgo,
          noVisitDaysAgo: segment.filters.noVisitDaysAgo,
          source: segment.filters.source || '',
          hasWhatsApp: segment.filters.hasWhatsApp || false,
          hasEmail: segment.filters.hasEmail || false,
        },
      };
    }
  },
  { immediate: true }
);

function addTag() {
  if (newTag.value.trim() && !form.value.filters.tags.includes(newTag.value.trim())) {
    form.value.filters.tags.push(newTag.value.trim());
    newTag.value = '';
  }
}

function removeTag(tag: string) {
  form.value.filters.tags = form.value.filters.tags.filter((t) => t !== tag);
}

function getGenderLabel(gender: string): string {
  const labels: Record<string, string> = {
    MALE: t('common.male'),
    FEMALE: t('common.female'),
    OTHER: t('common.other'),
  };
  return labels[gender] || gender;
}

function buildFiltersForApi(): SegmentFilters {
  const filters: SegmentFilters = {};

  if (form.value.filters.ageMin !== undefined) {
    filters.ageMin = form.value.filters.ageMin;
  }
  if (form.value.filters.ageMax !== undefined) {
    filters.ageMax = form.value.filters.ageMax;
  }
  if (form.value.filters.gender) {
    filters.gender = form.value.filters.gender;
  }
  if (form.value.filters.tags.length > 0) {
    filters.tags = form.value.filters.tags;
  }
  if (form.value.filters.lastVisitDaysAgo !== undefined) {
    filters.lastVisitDaysAgo = form.value.filters.lastVisitDaysAgo;
  }
  if (form.value.filters.noVisitDaysAgo !== undefined) {
    filters.noVisitDaysAgo = form.value.filters.noVisitDaysAgo;
  }
  if (form.value.filters.source) {
    filters.source = form.value.filters.source;
  }
  if (form.value.filters.hasWhatsApp) {
    filters.hasWhatsApp = true;
  }
  if (form.value.filters.hasEmail) {
    filters.hasEmail = true;
  }

  return filters;
}

async function previewSegment() {
  previewing.value = true;
  try {
    const response = await api.post('/campaigns/segments/preview', {
      filters: buildFiltersForApi(),
    });
    preview.value = response.data.preview;
  } catch (error) {
    console.error('Failed to preview segment:', error);
  } finally {
    previewing.value = false;
  }
}

async function saveSegment() {
  if (!form.value.name.trim()) return;

  saving.value = true;
  try {
    const data = {
      name: form.value.name,
      description: form.value.description || null,
      isActive: form.value.isActive,
      filters: buildFiltersForApi(),
    };

    if (isEditing.value) {
      await api.put(`/campaigns/segments/${props.segment!.id}`, data);
    } else {
      await api.post('/campaigns/segments', data);
    }

    emit('saved');
  } catch (error) {
    console.error('Failed to save segment:', error);
    alert(t('campaigns.saveError'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ isEditing ? t('campaigns.editSegment') : t('campaigns.createSegment') }}
          </h2>
          <button
            class="text-gray-500 hover:text-gray-700"
            @click="emit('close')"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('campaigns.segmentName') }} *
              </label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('campaigns.segmentNamePlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('campaigns.description') }}
              </label>
              <input
                v-model="form.description"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('campaigns.descriptionPlaceholder')"
              />
            </div>
          </div>

          <!-- Filters Section -->
          <div class="border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 class="font-semibold text-gray-900">{{ t('campaigns.filters') }}</h3>

            <!-- Age Range -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('campaigns.ageRange') }}
              </label>
              <div class="flex items-center gap-3">
                <input
                  v-model.number="form.filters.ageMin"
                  type="number"
                  min="0"
                  max="120"
                  class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  :placeholder="t('campaigns.min')"
                />
                <span class="text-gray-500">-</span>
                <input
                  v-model.number="form.filters.ageMax"
                  type="number"
                  min="0"
                  max="120"
                  class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  :placeholder="t('campaigns.max')"
                />
                <span class="text-sm text-gray-500">{{ t('campaigns.years') }}</span>
              </div>
            </div>

            <!-- Gender -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('campaigns.gender') }}
              </label>
              <select
                v-model="form.filters.gender"
                class="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{{ t('common.all') }}</option>
                <option v-for="gender in genderOptions" :key="gender" :value="gender">
                  {{ getGenderLabel(gender) }}
                </option>
              </select>
            </div>

            <!-- Tags -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('campaigns.tags') }}
              </label>
              <div class="flex items-center gap-2 mb-2">
                <input
                  v-model="newTag"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  :placeholder="t('campaigns.addTag')"
                  @keydown.enter.prevent="addTag"
                />
                <button
                  class="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  @click="addTag"
                >
                  {{ t('common.add') }}
                </button>
              </div>
              <div v-if="form.filters.tags.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="tag in form.filters.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {{ tag }}
                  <button class="hover:text-blue-900" @click="removeTag(tag)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Source -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                {{ t('campaigns.source') }}
              </label>
              <input
                v-model="form.filters.source"
                type="text"
                class="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('campaigns.sourcePlaceholder')"
              />
            </div>

            <!-- Channel Preferences -->
            <div class="flex flex-wrap gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.filters.hasWhatsApp"
                  type="checkbox"
                  class="w-4 h-4 text-primary rounded focus:ring-primary/50"
                />
                <span class="text-sm text-gray-700">{{ t('campaigns.hasWhatsApp') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="form.filters.hasEmail"
                  type="checkbox"
                  class="w-4 h-4 text-primary rounded focus:ring-primary/50"
                />
                <span class="text-sm text-gray-700">{{ t('campaigns.hasEmail') }}</span>
              </label>
            </div>
          </div>

          <!-- Preview Section -->
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900">{{ t('campaigns.preview') }}</h3>
              <button
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                :disabled="previewing"
                @click="previewSegment"
              >
                {{ previewing ? t('common.loading') : t('campaigns.previewMatching') }}
              </button>
            </div>

            <div v-if="preview" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-3xl font-bold text-primary">{{ preview.count }}</span>
                <span class="text-gray-500">{{ t('campaigns.matchingPatients') }}</span>
              </div>

              <div v-if="preview.patients.length > 0" class="max-h-40 overflow-y-auto">
                <div
                  v-for="patient in preview.patients"
                  :key="patient.id"
                  class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span class="text-sm font-medium text-gray-900">{{ patient.name }}</span>
                  <span class="text-sm text-gray-500">{{ patient.phone }}</span>
                </div>
              </div>

              <p v-if="preview.count > preview.patients.length" class="text-xs text-gray-500">
                {{ t('campaigns.showingFirst', { count: preview.patients.length }) }}
              </p>
            </div>

            <p v-else class="text-sm text-gray-500">
              {{ t('campaigns.previewHint') }}
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            @click="emit('close')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            :disabled="saving || !form.name.trim()"
            @click="saveSegment"
          >
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

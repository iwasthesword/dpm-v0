<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

const props = defineProps<{
  patientId: string;
}>();

const { t } = useI18n();

interface ToothData {
  status?: string;
  surfaces?: Record<string, string>;
  notes?: string;
  conditions?: string[];
}

interface Odontogram {
  id: string;
  type: 'ADULT' | 'CHILD';
  teeth: Record<string, ToothData>;
}

const odontogram = ref<Odontogram | null>(null);
const loading = ref(true);
const selectedTooth = ref<string | null>(null);
const saving = ref(false);

// Adult teeth layout (FDI notation)
const upperTeeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const lowerTeeth = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

const toothStatuses = [
  { value: 'HEALTHY', label: t('treatments.toothStatus.healthy'), color: '#22C55E' },
  { value: 'CARIES', label: t('treatments.toothStatus.caries'), color: '#EF4444' },
  { value: 'RESTORATION', label: t('treatments.toothStatus.restoration'), color: '#3B82F6' },
  { value: 'EXTRACTION', label: t('treatments.toothStatus.extraction'), color: '#6B7280' },
  { value: 'IMPLANT', label: t('treatments.toothStatus.implant'), color: '#8B5CF6' },
  { value: 'CROWN', label: t('treatments.toothStatus.crown'), color: '#F59E0B' },
  { value: 'MISSING', label: t('treatments.toothStatus.missing'), color: '#1F2937' },
  { value: 'IMPACTED', label: t('treatments.toothStatus.impacted'), color: '#EC4899' },
  { value: 'ROOT_CANAL', label: t('treatments.toothStatus.rootCanal'), color: '#14B8A6' },
  { value: 'BRIDGE', label: t('treatments.toothStatus.bridge'), color: '#F97316' },
];

const selectedToothData = computed(() => {
  if (!selectedTooth.value || !odontogram.value) return null;
  return odontogram.value.teeth[selectedTooth.value] || { status: 'HEALTHY' };
});

function getToothColor(toothNumber: string): string {
  if (!odontogram.value) return '#E5E7EB';
  const tooth = odontogram.value.teeth[toothNumber];
  if (!tooth || !tooth.status) return '#E5E7EB';

  const status = toothStatuses.find(s => s.value === tooth.status);
  return status?.color || '#E5E7EB';
}

function getToothLabel(toothNumber: string): string {
  // Check if it's a molar, premolar, canine, or incisor
  const num = parseInt(toothNumber.slice(-1));
  if (num >= 6) return 'M'; // Molar
  if (num >= 4) return 'P'; // Premolar
  if (num === 3) return 'C'; // Canine
  return 'I'; // Incisor
}

function selectTooth(toothNumber: string) {
  selectedTooth.value = toothNumber;
}

async function fetchOdontogram() {
  loading.value = true;
  try {
    const response = await api.get(`/ehr/patients/${props.patientId}/odontogram`);
    odontogram.value = response.data.odontogram;
  } catch (error) {
    console.error('Failed to fetch odontogram:', error);
  } finally {
    loading.value = false;
  }
}

async function updateToothStatus(status: string) {
  if (!selectedTooth.value || !odontogram.value) return;

  saving.value = true;
  try {
    const response = await api.put(`/ehr/patients/${props.patientId}/odontogram`, {
      teeth: {
        [selectedTooth.value]: {
          ...odontogram.value.teeth[selectedTooth.value],
          status,
        },
      },
    });
    odontogram.value = response.data.odontogram;
  } catch (error) {
    console.error('Failed to update tooth:', error);
  } finally {
    saving.value = false;
  }
}

async function updateToothNotes(notes: string) {
  if (!selectedTooth.value || !odontogram.value) return;

  saving.value = true;
  try {
    const response = await api.put(`/ehr/patients/${props.patientId}/odontogram`, {
      teeth: {
        [selectedTooth.value]: {
          ...odontogram.value.teeth[selectedTooth.value],
          notes,
        },
      },
    });
    odontogram.value = response.data.odontogram;
  } catch (error) {
    console.error('Failed to update notes:', error);
  } finally {
    saving.value = false;
  }
}

onMounted(fetchOdontogram);
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('treatments.odontogram') }}</h3>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else class="space-y-6">
      <!-- Odontogram Chart -->
      <div class="flex flex-col items-center gap-4">
        <!-- Upper teeth -->
        <div class="flex gap-1">
          <div
            v-for="tooth in upperTeeth"
            :key="tooth"
            class="relative cursor-pointer group"
            @click="selectTooth(tooth)"
          >
            <div
              class="w-10 h-12 rounded-t-lg border-2 flex flex-col items-center justify-center transition-all"
              :class="[
                selectedTooth === tooth ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300 hover:border-gray-400',
              ]"
              :style="{ backgroundColor: getToothColor(tooth) }"
            >
              <span class="text-xs font-medium text-white drop-shadow">{{ tooth }}</span>
              <span class="text-[10px] text-white/80 drop-shadow">{{ getToothLabel(tooth) }}</span>
            </div>
            <!-- Root indicator -->
            <div class="w-6 h-4 mx-auto bg-gray-200 rounded-b" />
          </div>
        </div>

        <!-- Divider -->
        <div class="w-full max-w-xl border-t-2 border-gray-300" />

        <!-- Lower teeth -->
        <div class="flex gap-1">
          <div
            v-for="tooth in lowerTeeth"
            :key="tooth"
            class="relative cursor-pointer group"
            @click="selectTooth(tooth)"
          >
            <!-- Root indicator -->
            <div class="w-6 h-4 mx-auto bg-gray-200 rounded-t" />
            <div
              class="w-10 h-12 rounded-b-lg border-2 flex flex-col items-center justify-center transition-all"
              :class="[
                selectedTooth === tooth ? 'border-primary ring-2 ring-primary/30' : 'border-gray-300 hover:border-gray-400',
              ]"
              :style="{ backgroundColor: getToothColor(tooth) }"
            >
              <span class="text-xs font-medium text-white drop-shadow">{{ tooth }}</span>
              <span class="text-[10px] text-white/80 drop-shadow">{{ getToothLabel(tooth) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-100">
        <div
          v-for="status in toothStatuses"
          :key="status.value"
          class="flex items-center gap-1.5"
        >
          <div
            class="w-3 h-3 rounded"
            :style="{ backgroundColor: status.color }"
          />
          <span class="text-xs text-gray-600">{{ status.label }}</span>
        </div>
      </div>

      <!-- Selected Tooth Details -->
      <div v-if="selectedTooth" class="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 class="font-medium text-gray-900 mb-3">
          {{ t('treatments.toothNumber', { number: selectedTooth }) }}
        </h4>

        <!-- Status Selection -->
        <div class="mb-4">
          <label class="block text-sm text-gray-600 mb-2">Status</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="status in toothStatuses"
              :key="status.value"
              class="px-3 py-1.5 text-sm rounded-full border transition-all"
              :class="[
                selectedToothData?.status === status.value
                  ? 'border-transparent text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400',
              ]"
              :style="selectedToothData?.status === status.value ? { backgroundColor: status.color } : {}"
              :disabled="saving"
              @click="updateToothStatus(status.value)"
            >
              {{ status.label }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm text-gray-600 mb-2">{{ t('common.notes') }}</label>
          <textarea
            :value="selectedToothData?.notes || ''"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows="2"
            :placeholder="t('common.notes')"
            @blur="updateToothNotes(($event.target as HTMLTextAreaElement).value)"
          />
        </div>
      </div>

      <p v-else class="text-center text-gray-500 text-sm">
        {{ t('treatments.selectTooth') }}
      </p>
    </div>
  </div>
</template>

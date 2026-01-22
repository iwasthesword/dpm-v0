<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/ui/Modal.vue';
import api from '@/api/client';

interface Anamnesis {
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  surgeries?: string[];
  bloodType?: string;
  smoker?: boolean;
  alcoholUse?: string;
  pregnant?: boolean;
  breastfeeding?: boolean;
  brushingFrequency?: string;
  usesFloss?: boolean;
  usesMouthwash?: boolean;
  lastDentalVisit?: string;
  mainComplaint?: string;
  observations?: string;
}

const props = defineProps<{
  open: boolean;
  patientId: string;
  anamnesis?: Anamnesis | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [anamnesis: Anamnesis];
}>();

const { t } = useI18n();

const form = ref<Anamnesis>({
  allergies: [],
  medications: [],
  conditions: [],
  surgeries: [],
  bloodType: '',
  smoker: false,
  alcoholUse: 'none',
  pregnant: false,
  breastfeeding: false,
  brushingFrequency: 'twice',
  usesFloss: false,
  usesMouthwash: false,
  lastDentalVisit: '',
  mainComplaint: '',
  observations: '',
});

const loading = ref(false);
const error = ref('');

// Input fields for array items
const newAllergy = ref('');
const newMedication = ref('');
const newCondition = ref('');
const newSurgery = ref('');

const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const alcoholOptions = ['none', 'occasional', 'moderate', 'frequent'];
const brushingOptions = ['once', 'twice', 'three_plus'];
const lastVisitOptions = ['less_than_6_months', '6_to_12_months', '1_to_2_years', 'more_than_2_years'];

watch(() => props.open, (isOpen) => {
  if (isOpen && props.anamnesis) {
    form.value = {
      allergies: props.anamnesis.allergies || [],
      medications: props.anamnesis.medications || [],
      conditions: props.anamnesis.conditions || [],
      surgeries: props.anamnesis.surgeries || [],
      bloodType: props.anamnesis.bloodType || '',
      smoker: props.anamnesis.smoker || false,
      alcoholUse: props.anamnesis.alcoholUse || 'none',
      pregnant: props.anamnesis.pregnant || false,
      breastfeeding: props.anamnesis.breastfeeding || false,
      brushingFrequency: props.anamnesis.brushingFrequency || 'twice',
      usesFloss: props.anamnesis.usesFloss || false,
      usesMouthwash: props.anamnesis.usesMouthwash || false,
      lastDentalVisit: props.anamnesis.lastDentalVisit || '',
      mainComplaint: props.anamnesis.mainComplaint || '',
      observations: props.anamnesis.observations || '',
    };
  } else if (isOpen) {
    resetForm();
  }
  error.value = '';
});

function resetForm() {
  form.value = {
    allergies: [],
    medications: [],
    conditions: [],
    surgeries: [],
    bloodType: '',
    smoker: false,
    alcoholUse: 'none',
    pregnant: false,
    breastfeeding: false,
    brushingFrequency: 'twice',
    usesFloss: false,
    usesMouthwash: false,
    lastDentalVisit: '',
    mainComplaint: '',
    observations: '',
  };
}

function addAllergy() {
  const value = newAllergy.value.trim();
  if (value && !form.value.allergies?.includes(value)) {
    form.value.allergies = [...(form.value.allergies || []), value];
    newAllergy.value = '';
  }
}

function addMedication() {
  const value = newMedication.value.trim();
  if (value && !form.value.medications?.includes(value)) {
    form.value.medications = [...(form.value.medications || []), value];
    newMedication.value = '';
  }
}

function addCondition() {
  const value = newCondition.value.trim();
  if (value && !form.value.conditions?.includes(value)) {
    form.value.conditions = [...(form.value.conditions || []), value];
    newCondition.value = '';
  }
}

function addSurgery() {
  const value = newSurgery.value.trim();
  if (value && !form.value.surgeries?.includes(value)) {
    form.value.surgeries = [...(form.value.surgeries || []), value];
    newSurgery.value = '';
  }
}

function removeItem(field: 'allergies' | 'medications' | 'conditions' | 'surgeries', index: number) {
  form.value[field] = form.value[field]?.filter((_, i) => i !== index);
}

async function handleSubmit() {
  loading.value = true;
  error.value = '';

  try {
    await api.patch(`/patients/${props.patientId}`, {
      anamnesis: form.value,
    });
    emit('saved', form.value);
    emit('close');
  } catch (err: any) {
    console.error('Failed to save anamnesis:', err);
    error.value = err.response?.data?.error || t('common.error');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal :open="open" :title="t('patients.medicalHistory')" size="lg" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Error Message -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {{ error }}
      </div>

      <!-- Main Complaint -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.mainComplaint') }}</label>
        <input
          v-model="form.mainComplaint"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <!-- Allergies -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.allergies') }}</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="newAllergy"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            @keydown.enter.prevent="addAllergy()"
          />
          <button
            type="button"
            @click="addAllergy()"
            class="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            +
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(item, index) in form.allergies"
            :key="item"
            class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1"
          >
            {{ item }}
            <button type="button" @click="removeItem('allergies', index)" class="hover:text-red-900">&times;</button>
          </span>
        </div>
      </div>

      <!-- Medications -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.medications') }}</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="newMedication"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            @keydown.enter.prevent="addMedication()"
          />
          <button
            type="button"
            @click="addMedication()"
            class="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            +
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(item, index) in form.medications"
            :key="item"
            class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
          >
            {{ item }}
            <button type="button" @click="removeItem('medications', index)" class="hover:text-blue-900">&times;</button>
          </span>
        </div>
      </div>

      <!-- Conditions -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.conditions') }}</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="newCondition"
            type="text"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            @keydown.enter.prevent="addCondition()"
          />
          <button
            type="button"
            @click="addCondition()"
            class="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            +
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(item, index) in form.conditions"
            :key="item"
            class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm flex items-center gap-1"
          >
            {{ item }}
            <button type="button" @click="removeItem('conditions', index)" class="hover:text-yellow-900">&times;</button>
          </span>
        </div>
      </div>

      <!-- Blood Type & Health Habits Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.bloodType') }}</label>
          <select
            v-model="form.bloodType"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">-</option>
            <option v-for="type in bloodTypes" :key="type" :value="type">{{ type }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.alcoholUse') }}</label>
          <select
            v-model="form.alcoholUse"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option v-for="opt in alcoholOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2 pt-6">
          <input type="checkbox" v-model="form.smoker" id="smoker" class="w-4 h-4 text-primary" />
          <label for="smoker" class="text-sm text-gray-700">{{ t('patients.smoker') }}</label>
        </div>

        <div class="flex items-center gap-2 pt-6">
          <input type="checkbox" v-model="form.pregnant" id="pregnant" class="w-4 h-4 text-primary" />
          <label for="pregnant" class="text-sm text-gray-700">{{ t('patients.pregnant') }}</label>
        </div>
      </div>

      <!-- Dental Habits -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.brushingFrequency') }}</label>
          <select
            v-model="form.brushingFrequency"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option v-for="opt in brushingOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.lastDentalVisit') }}</label>
          <select
            v-model="form.lastDentalVisit"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">-</option>
            <option v-for="opt in lastVisitOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div class="flex items-center gap-2 pt-6">
          <input type="checkbox" v-model="form.usesFloss" id="usesFloss" class="w-4 h-4 text-primary" />
          <label for="usesFloss" class="text-sm text-gray-700">{{ t('patients.usesFloss') }}</label>
        </div>

        <div class="flex items-center gap-2 pt-6">
          <input type="checkbox" v-model="form.usesMouthwash" id="usesMouthwash" class="w-4 h-4 text-primary" />
          <label for="usesMouthwash" class="text-sm text-gray-700">{{ t('patients.usesMouthwash') }}</label>
        </div>
      </div>

      <!-- Observations -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('patients.observations') }}</label>
        <textarea
          v-model="form.observations"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        ></textarea>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="loading"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {{ loading ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

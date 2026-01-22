<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/ui/Modal.vue';
import api from '@/api/client';

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Professional {
  id: string;
  name: string;
  color: string;
}

interface Room {
  id: string;
  name: string;
  color: string;
}

interface Appointment {
  id?: string;
  patientId: string;
  professionalId: string;
  roomId?: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string;
}

const props = defineProps<{
  open: boolean;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [appointment: any];
}>();

const { t } = useI18n();

const isEditing = computed(() => !!props.appointment?.id);
const title = computed(() => isEditing.value ? t('schedule.editAppointment') : t('schedule.createAppointment'));

// Form state
const form = ref({
  patientId: '',
  professionalId: '',
  roomId: '',
  date: '',
  startTime: '09:00',
  duration: 30,
  type: 'EVALUATION',
  notes: '',
});

// Lookup data
const patients = ref<Patient[]>([]);
const professionals = ref<Professional[]>([]);
const rooms = ref<Room[]>([]);
const patientSearch = ref('');
const loadingPatients = ref(false);
const selectedPatient = ref<Patient | null>(null);

const loading = ref(false);
const error = ref('');

const appointmentTypes = [
  { value: 'EVALUATION', label: 'schedule.types.evaluation' },
  { value: 'TREATMENT', label: 'schedule.types.treatment' },
  { value: 'RETURN', label: 'schedule.types.return' },
  { value: 'EMERGENCY', label: 'schedule.types.emergency' },
  { value: 'MAINTENANCE', label: 'schedule.types.maintenance' },
];

const durations = [15, 30, 45, 60, 90, 120];

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    error.value = '';
    if (props.appointment) {
      // Edit mode - populate form
      const startDate = new Date(props.appointment.startTime);
      const endDate = new Date(props.appointment.endTime);
      const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;

      form.value = {
        patientId: props.appointment.patientId,
        professionalId: props.appointment.professionalId,
        roomId: props.appointment.roomId || '',
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        duration: durationMinutes,
        type: props.appointment.type,
        notes: props.appointment.notes || '',
      };
    } else {
      // Create mode - reset form with defaults
      const defaultDate = props.defaultDate || new Date();
      form.value = {
        patientId: '',
        professionalId: professionals.value[0]?.id || '',
        roomId: '',
        date: defaultDate.toISOString().split('T')[0],
        startTime: props.defaultTime || '09:00',
        duration: 30,
        type: 'EVALUATION',
        notes: '',
      };
      selectedPatient.value = null;
      patientSearch.value = '';
    }
  }
});

async function searchPatients() {
  if (patientSearch.value.length < 2) {
    patients.value = [];
    return;
  }

  loadingPatients.value = true;
  try {
    const response = await api.get('/patients', {
      params: { search: patientSearch.value, limit: 10 },
    });
    patients.value = response.data.patients;
  } catch (e) {
    console.error('Failed to search patients:', e);
  } finally {
    loadingPatients.value = false;
  }
}

function selectPatient(patient: Patient) {
  selectedPatient.value = patient;
  form.value.patientId = patient.id;
  patientSearch.value = patient.name;
  patients.value = [];
}

async function fetchProfessionals() {
  try {
    // For now, we'll create a simple endpoint or use existing data
    // The professionals endpoint would be at /clinics/professionals
    const response = await api.get('/clinics/professionals');
    professionals.value = response.data.professionals;
    if (professionals.value.length > 0 && !form.value.professionalId) {
      form.value.professionalId = professionals.value[0].id;
    }
  } catch (e) {
    console.error('Failed to fetch professionals:', e);
  }
}

async function fetchRooms() {
  try {
    const response = await api.get('/clinics/rooms');
    rooms.value = response.data.rooms;
  } catch (e) {
    console.error('Failed to fetch rooms:', e);
  }
}

async function handleSubmit() {
  error.value = '';

  if (!form.value.patientId) {
    error.value = t('validation.required');
    return;
  }

  loading.value = true;

  try {
    // Calculate end time based on duration
    const [hours, minutes] = form.value.startTime.split(':').map(Number);
    const startDateTime = new Date(form.value.date);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime.getTime() + form.value.duration * 60000);

    const payload = {
      patientId: form.value.patientId,
      professionalId: form.value.professionalId,
      roomId: form.value.roomId || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      type: form.value.type,
      notes: form.value.notes || undefined,
    };

    let response;
    if (isEditing.value) {
      response = await api.put(`/appointments/${props.appointment!.id}`, payload);
    } else {
      response = await api.post('/appointments', payload);
    }

    emit('saved', response.data.appointment);
    emit('close');
  } catch (e: any) {
    error.value = e.response?.data?.error || t('common.error');
  } finally {
    loading.value = false;
  }
}

// Debounce patient search
let searchTimeout: ReturnType<typeof setTimeout>;
watch(patientSearch, (value) => {
  if (selectedPatient.value && value !== selectedPatient.value.name) {
    selectedPatient.value = null;
    form.value.patientId = '';
  }
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(searchPatients, 300);
});

onMounted(() => {
  fetchProfessionals();
  fetchRooms();
});
</script>

<template>
  <Modal :open="open" :title="title" size="md" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Error message -->
      <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
        {{ error }}
      </div>

      <!-- Patient Search -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('schedule.appointment.patient') }} <span class="text-destructive">*</span>
        </label>
        <div class="relative mt-1">
          <input
            v-model="patientSearch"
            type="text"
            :placeholder="t('schedule.selectPatient')"
            class="block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            :class="{ 'bg-green-50 border-green-300': selectedPatient }"
          />
          <!-- Dropdown -->
          <div
            v-if="patients.length > 0 && !selectedPatient"
            class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto"
          >
            <button
              v-for="patient in patients"
              :key="patient.id"
              type="button"
              class="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
              @click="selectPatient(patient)"
            >
              <span class="font-medium">{{ patient.name }}</span>
              <span class="text-sm text-gray-500">{{ patient.phone }}</span>
            </button>
          </div>
          <div v-if="loadingPatients" class="absolute right-3 top-2.5">
            <span class="text-gray-400 text-sm">...</span>
          </div>
        </div>
      </div>

      <!-- Professional -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('schedule.appointment.professional') }} <span class="text-destructive">*</span>
        </label>
        <select
          v-model="form.professionalId"
          required
          class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option v-for="prof in professionals" :key="prof.id" :value="prof.id">
            {{ prof.name }}
          </option>
        </select>
      </div>

      <!-- Date and Time -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('schedule.appointment.date') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="form.date"
            type="date"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('schedule.appointment.startTime') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="form.startTime"
            type="time"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <!-- Duration and Type -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('schedule.appointment.duration') }}
          </label>
          <select
            v-model="form.duration"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="d in durations" :key="d" :value="d">
              {{ d }} {{ t('schedule.minutes') }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('schedule.appointment.type') }}
          </label>
          <select
            v-model="form.type"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="type in appointmentTypes" :key="type.value" :value="type.value">
              {{ t(type.label) }}
            </option>
          </select>
        </div>
      </div>

      <!-- Room -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('schedule.appointment.room') }}
        </label>
        <select
          v-model="form.roomId"
          class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">{{ t('schedule.selectRoom') }}</option>
          <option v-for="room in rooms" :key="room.id" :value="room.id">
            {{ room.name }}
          </option>
        </select>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700">
          {{ t('schedule.appointment.notes') }}
        </label>
        <textarea
          v-model="form.notes"
          rows="2"
          class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        ></textarea>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="loading || !form.patientId || !form.professionalId"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? t('common.loading') : t('common.save') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

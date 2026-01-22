<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import PatientFormModal from '@/components/patients/PatientFormModal.vue';
import AnamnesisFormModal from '@/components/patients/AnamnesisFormModal.vue';
import Odontogram from '@/components/ehr/Odontogram.vue';
import ClinicalNotes from '@/components/ehr/ClinicalNotes.vue';
import TreatmentPlans from '@/components/ehr/TreatmentPlans.vue';
import TreatmentSuggestions from '@/components/ehr/TreatmentSuggestions.vue';
import PatientRiskBadges from '@/components/ehr/PatientRiskBadges.vue';
import PatientImages from '@/components/ehr/PatientImages.vue';
import PatientDocuments from '@/components/documents/PatientDocuments.vue';

const { t, d } = useI18n();
const route = useRoute();
const router = useRouter();

interface Patient {
  id: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  phoneSecondary?: string;
  email?: string;
  photo?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  guardian?: {
    name: string;
    cpf: string;
    relationship: string;
    phone: string;
  };
  anamnesis?: Record<string, any>;
  tags: string[];
  notes?: string;
  source?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    appointments: number;
    treatments: number;
    images: number;
    documents: number;
  };
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  professional: { id: string; name: string };
  procedure?: { id: string; name: string };
}

const patient = ref<Patient | null>(null);
const appointments = ref<Appointment[]>([]);
const loading = ref(true);
const loadingAppointments = ref(false);
const showEditModal = ref(false);
const showAnamnesisModal = ref(false);
const activeTab = ref<'info' | 'appointments' | 'odontogram' | 'notes' | 'plans' | 'images' | 'documents' | 'anamnesis'>('info');
const treatmentPlansRef = ref<InstanceType<typeof TreatmentPlans> | null>(null);
const treatmentSuggestionsRef = ref<InstanceType<typeof TreatmentSuggestions> | null>(null);

interface TreatmentSuggestion {
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  tooth: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
}

const genderLabel = computed(() => {
  if (!patient.value?.gender) return '-';
  const genderMap: Record<string, string> = {
    MALE: t('patients.male'),
    FEMALE: t('patients.female'),
    OTHER: t('patients.other'),
  };
  return genderMap[patient.value.gender] || '-';
});

const formattedAddress = computed(() => {
  const addr = patient.value?.address;
  if (!addr) return null;
  const parts = [];
  if (addr.street) {
    let line = addr.street;
    if (addr.number) line += `, ${addr.number}`;
    if (addr.complement) line += ` - ${addr.complement}`;
    parts.push(line);
  }
  if (addr.neighborhood) parts.push(addr.neighborhood);
  if (addr.city && addr.state) {
    parts.push(`${addr.city} - ${addr.state}`);
  } else if (addr.city) {
    parts.push(addr.city);
  }
  if (addr.zipCode) parts.push(`CEP: ${addr.zipCode}`);
  return parts.length > 0 ? parts : null;
});

async function fetchPatient() {
  try {
    const response = await api.get(`/patients/${route.params.id}`);
    patient.value = response.data.patient;
  } catch (error) {
    console.error('Failed to fetch patient:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchAppointments() {
  if (loadingAppointments.value) return;
  loadingAppointments.value = true;
  try {
    const response = await api.get(`/patients/${route.params.id}/appointments`);
    appointments.value = response.data.appointments;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
  } finally {
    loadingAppointments.value = false;
  }
}

function handlePatientSaved(updatedPatient: Partial<Patient>) {
  if (patient.value) {
    patient.value = { ...patient.value, ...updatedPatient } as Patient;
  }
}

function handleAnamnesisSaved(anamnesis: Record<string, any>) {
  if (patient.value) {
    patient.value = { ...patient.value, anamnesis };
  }
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    WAITING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    NO_SHOW: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status: string) {
  const statusMap: Record<string, string> = {
    SCHEDULED: t('schedule.status.scheduled'),
    CONFIRMED: t('schedule.status.confirmed'),
    WAITING: t('schedule.status.waiting'),
    IN_PROGRESS: t('schedule.status.inProgress'),
    COMPLETED: t('schedule.status.completed'),
    NO_SHOW: t('schedule.status.noShow'),
    CANCELLED: t('schedule.status.cancelled'),
  };
  return statusMap[status] || status;
}

function getTypeLabel(type: string) {
  const typeMap: Record<string, string> = {
    EVALUATION: t('schedule.types.evaluation'),
    TREATMENT: t('schedule.types.treatment'),
    RETURN: t('schedule.types.return'),
    EMERGENCY: t('schedule.types.emergency'),
    MAINTENANCE: t('schedule.types.maintenance'),
  };
  return typeMap[type] || type;
}

function handleAddToPlan(suggestion: TreatmentSuggestion) {
  // Open the treatment plans create modal with the suggestion pre-filled
  if (treatmentPlansRef.value) {
    treatmentPlansRef.value.addSuggestionToNewPlan(suggestion);
  }
}

onMounted(() => {
  fetchPatient();
  fetchAppointments();
});
</script>

<template>
  <div>
    <div v-if="loading" class="text-center py-12 text-gray-500">
      {{ t('patients.loadingDetails') }}
    </div>

    <div v-else-if="!patient" class="text-center py-12 text-gray-500">
      {{ t('patients.patientNotFound') }}
    </div>

    <div v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <router-link to="/patients" class="text-sm text-primary hover:text-primary/80">
            {{ t('patients.backToPatients') }}
          </router-link>
          <div class="mt-2 flex items-center gap-3">
            <h1 class="text-2xl font-bold text-gray-900">{{ patient.name }}</h1>
            <span
              v-if="!patient.isActive"
              class="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full"
            >
              {{ t('patients.patientDeactivated') }}
            </span>
          </div>
          <!-- Patient Risk Badges -->
          <div class="mt-2">
            <PatientRiskBadges :patient-id="patient.id" compact />
          </div>
        </div>
        <div class="flex gap-3">
          <button
            @click="showEditModal = true"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {{ t('common.edit') }}
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {{ t('patients.scheduleAppointment') }}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            @click="activeTab = 'info'"
            :class="[
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.contactInfo') }}
          </button>
          <button
            @click="activeTab = 'appointments'"
            :class="[
              activeTab === 'appointments'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.appointments') }}
            <span class="ml-1 px-2 py-0.5 text-xs bg-gray-100 rounded-full">
              {{ patient._count?.appointments || 0 }}
            </span>
          </button>
          <button
            @click="activeTab = 'odontogram'"
            :class="[
              activeTab === 'odontogram'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('treatments.odontogram') }}
          </button>
          <button
            @click="activeTab = 'notes'"
            :class="[
              activeTab === 'notes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('treatments.clinicalNotes') }}
          </button>
          <button
            @click="activeTab = 'plans'"
            :class="[
              activeTab === 'plans'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('treatments.treatmentPlans') }}
          </button>
          <button
            @click="activeTab = 'images'"
            :class="[
              activeTab === 'images'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.images') }}
          </button>
          <button
            @click="activeTab = 'documents'"
            :class="[
              activeTab === 'documents'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('documents.title') }}
          </button>
          <button
            @click="activeTab = 'anamnesis'"
            :class="[
              activeTab === 'anamnesis'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.anamnesis') }}
          </button>
        </nav>
      </div>

      <!-- Info Tab -->
      <div v-show="activeTab === 'info'" class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Contact Info -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('patients.contactInfo') }}</h2>
          <dl class="mt-4 space-y-4">
            <div>
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.phone') }}</dt>
              <dd class="mt-1 text-gray-900">{{ patient.phone }}</dd>
            </div>
            <div v-if="patient.phoneSecondary">
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.secondaryPhone') }}</dt>
              <dd class="mt-1 text-gray-900">{{ patient.phoneSecondary }}</dd>
            </div>
            <div v-if="patient.email">
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.email') }}</dt>
              <dd class="mt-1 text-gray-900">{{ patient.email }}</dd>
            </div>
          </dl>
        </div>

        <!-- Personal Info -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('patients.personalInfo') }}</h2>
          <dl class="mt-4 space-y-4">
            <div v-if="patient.cpf">
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.cpf') }}</dt>
              <dd class="mt-1 text-gray-900">{{ patient.cpf }}</dd>
            </div>
            <div v-if="patient.birthDate">
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.birthDate') }}</dt>
              <dd class="mt-1 text-gray-900">{{ d(new Date(patient.birthDate), 'short') }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-gray-500">{{ t('patients.gender') }}</dt>
              <dd class="mt-1 text-gray-900">{{ genderLabel }}</dd>
            </div>
          </dl>
        </div>

        <!-- Address -->
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('patients.address') }}</h2>
          <div v-if="formattedAddress" class="mt-4 text-gray-900">
            <p v-for="(line, idx) in formattedAddress" :key="idx">{{ line }}</p>
          </div>
          <p v-else class="mt-4 text-gray-500">-</p>
        </div>

        <!-- Tags -->
        <div v-if="patient.tags?.length" class="bg-white rounded-lg border border-gray-200 p-6">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('patients.tags') }}</h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in patient.tags"
              :key="tag"
              class="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="patient.notes" class="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <h2 class="text-lg font-semibold text-gray-900">{{ t('common.notes') }}</h2>
          <p class="mt-4 text-gray-700 whitespace-pre-wrap">{{ patient.notes }}</p>
        </div>
      </div>

      <!-- Appointments Tab -->
      <div v-show="activeTab === 'appointments'" class="mt-6">
        <div class="bg-white rounded-lg border border-gray-200">
          <div v-if="loadingAppointments" class="p-8 text-center text-gray-500">
            {{ t('common.loading') }}
          </div>
          <div v-else-if="appointments.length === 0" class="p-8 text-center text-gray-500">
            {{ t('patients.noAppointmentsYet') }}
          </div>
          <table v-else class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('common.date') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('common.time') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('schedule.appointment.type') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('schedule.appointment.professional') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {{ t('common.status') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="apt in appointments" :key="apt.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-gray-900">
                  {{ d(new Date(apt.startTime), 'short') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                  {{ d(new Date(apt.startTime), 'time') }} - {{ d(new Date(apt.endTime), 'time') }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-900">
                  {{ getTypeLabel(apt.type) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-gray-500">
                  {{ apt.professional.name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="['px-2 py-1 text-xs rounded-full', getStatusClass(apt.status)]">
                    {{ getStatusLabel(apt.status) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Odontogram Tab -->
      <div v-show="activeTab === 'odontogram'" class="mt-6">
        <Odontogram :patient-id="patient.id" />
      </div>

      <!-- Clinical Notes Tab -->
      <div v-show="activeTab === 'notes'" class="mt-6">
        <ClinicalNotes :patient-id="patient.id" />
      </div>

      <!-- Treatment Plans Tab -->
      <div v-show="activeTab === 'plans'" class="mt-6 space-y-6">
        <!-- Treatment Suggestions -->
        <TreatmentSuggestions
          ref="treatmentSuggestionsRef"
          :patient-id="patient.id"
          @add-to-plan="handleAddToPlan"
        />
        <!-- Treatment Plans -->
        <TreatmentPlans ref="treatmentPlansRef" :patient-id="patient.id" />
      </div>

      <!-- Images Tab -->
      <div v-show="activeTab === 'images'" class="mt-6">
        <PatientImages :patient-id="patient.id" />
      </div>

      <!-- Documents Tab -->
      <div v-show="activeTab === 'documents'" class="mt-6">
        <PatientDocuments :patient-id="patient.id" :patient-name="patient.name" />
      </div>

      <!-- Anamnesis Tab -->
      <div v-show="activeTab === 'anamnesis'" class="mt-6">
        <div class="bg-white rounded-lg border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('patients.medicalHistory') }}</h2>
            <button
              @click="showAnamnesisModal = true"
              class="text-sm text-primary hover:text-primary/80"
            >
              {{ t('common.edit') }}
            </button>
          </div>

          <div v-if="patient.anamnesis" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Main Complaint -->
            <div v-if="patient.anamnesis.mainComplaint" class="md:col-span-2">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.mainComplaint') }}</h3>
              <p class="mt-1 text-gray-900">{{ patient.anamnesis.mainComplaint }}</p>
            </div>

            <!-- Allergies -->
            <div v-if="patient.anamnesis.allergies?.length">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.allergies') }}</h3>
              <ul class="mt-1 list-disc list-inside text-gray-900">
                <li v-for="item in patient.anamnesis.allergies" :key="item">{{ item }}</li>
              </ul>
            </div>

            <!-- Medications -->
            <div v-if="patient.anamnesis.medications?.length">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.medications') }}</h3>
              <ul class="mt-1 list-disc list-inside text-gray-900">
                <li v-for="item in patient.anamnesis.medications" :key="item">{{ item }}</li>
              </ul>
            </div>

            <!-- Conditions -->
            <div v-if="patient.anamnesis.conditions?.length">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.conditions') }}</h3>
              <ul class="mt-1 list-disc list-inside text-gray-900">
                <li v-for="item in patient.anamnesis.conditions" :key="item">{{ item }}</li>
              </ul>
            </div>

            <!-- Surgeries -->
            <div v-if="patient.anamnesis.surgeries?.length">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.surgeries') }}</h3>
              <ul class="mt-1 list-disc list-inside text-gray-900">
                <li v-for="item in patient.anamnesis.surgeries" :key="item">{{ item }}</li>
              </ul>
            </div>

            <!-- Blood Type -->
            <div v-if="patient.anamnesis.bloodType">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.bloodType') }}</h3>
              <p class="mt-1 text-gray-900">{{ patient.anamnesis.bloodType }}</p>
            </div>

            <!-- Health Habits -->
            <div class="md:col-span-2">
              <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('patients.healthHabits') }}</h3>
              <div class="flex flex-wrap gap-3">
                <span v-if="patient.anamnesis.smoker" class="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                  {{ t('patients.smoker') }}
                </span>
                <span v-if="patient.anamnesis.alcoholUse && patient.anamnesis.alcoholUse !== 'none'" class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                  {{ t('patients.alcoholUse') }}: {{ patient.anamnesis.alcoholUse }}
                </span>
                <span v-if="patient.anamnesis.pregnant" class="px-3 py-1 bg-pink-100 text-pink-800 text-sm rounded-full">
                  {{ t('patients.pregnant') }}
                </span>
                <span v-if="patient.anamnesis.breastfeeding" class="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                  {{ t('patients.breastfeeding') }}
                </span>
              </div>
            </div>

            <!-- Dental Habits -->
            <div class="md:col-span-2">
              <h3 class="text-sm font-medium text-gray-500 mb-2">{{ t('patients.dentalHabits') }}</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span class="text-gray-500">{{ t('patients.brushingFrequency') }}:</span>
                  <span class="ml-1 text-gray-900">{{ patient.anamnesis.brushingFrequency || '-' }}</span>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('patients.usesFloss') }}:</span>
                  <span class="ml-1 text-gray-900">{{ patient.anamnesis.usesFloss ? t('common.yes') : t('common.no') }}</span>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('patients.usesMouthwash') }}:</span>
                  <span class="ml-1 text-gray-900">{{ patient.anamnesis.usesMouthwash ? t('common.yes') : t('common.no') }}</span>
                </div>
                <div>
                  <span class="text-gray-500">{{ t('patients.lastDentalVisit') }}:</span>
                  <span class="ml-1 text-gray-900">{{ patient.anamnesis.lastDentalVisit || '-' }}</span>
                </div>
              </div>
            </div>

            <!-- Observations -->
            <div v-if="patient.anamnesis.observations" class="md:col-span-2">
              <h3 class="text-sm font-medium text-gray-500">{{ t('patients.observations') }}</h3>
              <p class="mt-1 text-gray-900 whitespace-pre-wrap">{{ patient.anamnesis.observations }}</p>
            </div>
          </div>
          <p v-else class="text-gray-500 text-center py-4">
            {{ t('patients.noAnamnesisData') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <PatientFormModal
      :open="showEditModal"
      :patient="patient"
      @close="showEditModal = false"
      @saved="handlePatientSaved"
    />

    <!-- Anamnesis Modal -->
    <AnamnesisFormModal
      v-if="patient"
      :open="showAnamnesisModal"
      :patient-id="patient.id"
      :anamnesis="patient.anamnesis"
      @close="showAnamnesisModal = false"
      @saved="handleAnamnesisSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import api from '@/api/client';
import PatientFormModal from '@/components/patients/PatientFormModal.vue';

const { t } = useI18n();
const router = useRouter();

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  tags: string[];
  isActive: boolean;
}

const patients = ref<Patient[]>([]);
const loading = ref(true);
const search = ref('');
const showFormModal = ref(false);
const editingPatient = ref<Patient | null>(null);

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout>;
watch(search, () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchPatients();
  }, 300);
});

async function fetchPatients() {
  try {
    loading.value = true;
    const response = await api.get('/patients', {
      params: { search: search.value || undefined },
    });
    patients.value = response.data.patients;
  } catch (error) {
    console.error('Failed to fetch patients:', error);
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  editingPatient.value = null;
  showFormModal.value = true;
}

function openEditModal(patient: Patient) {
  editingPatient.value = patient;
  showFormModal.value = true;
}

function handlePatientSaved() {
  fetchPatients();
}

function viewPatient(patient: Patient) {
  router.push({ name: 'patient-details', params: { id: patient.id } });
}

onMounted(fetchPatients);
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('patients.title') }}</h1>
      <button
        @click="openCreateModal"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        {{ t('patients.newPatient') }}
      </button>
    </div>

    <div class="mt-6">
      <input
        v-model="search"
        type="text"
        :placeholder="t('patients.searchPatients')"
        class="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
      />
    </div>

    <div class="mt-6 bg-white rounded-lg border border-gray-200">
      <div v-if="loading" class="p-8 text-center text-gray-500">
        {{ t('common.loading') }}
      </div>

      <div v-else-if="patients.length === 0" class="p-8 text-center text-gray-500">
        {{ t('patients.noPatients') }}
      </div>

      <table v-else class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ t('patients.name') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ t('patients.phone') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ t('patients.email') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ t('patients.tags') }}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {{ t('common.actions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="patient in patients" :key="patient.id" class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
              <button
                @click="viewPatient(patient)"
                class="text-primary hover:text-primary/80 font-medium"
              >
                {{ patient.name }}
              </button>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500">
              {{ patient.phone }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-gray-500">
              {{ patient.email || '-' }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="tag in patient.tags?.slice(0, 2)"
                  :key="tag"
                  class="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {{ tag }}
                </span>
                <span
                  v-if="patient.tags?.length > 2"
                  class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  +{{ patient.tags.length - 2 }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <button
                  @click="viewPatient(patient)"
                  class="text-sm text-primary hover:text-primary/80"
                >
                  {{ t('common.view') }}
                </button>
                <span class="text-gray-300">|</span>
                <button
                  @click="openEditModal(patient)"
                  class="text-sm text-gray-600 hover:text-gray-800"
                >
                  {{ t('common.edit') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Patient Form Modal -->
    <PatientFormModal
      :open="showFormModal"
      :patient="editingPatient"
      @close="showFormModal = false"
      @saved="handlePatientSaved"
    />
  </div>
</template>

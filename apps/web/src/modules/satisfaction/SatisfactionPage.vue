<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import NPSDashboard from '@/components/satisfaction/NPSDashboard.vue';
import SurveyFormModal from '@/components/satisfaction/SurveyFormModal.vue';
import AlertsList from '@/components/satisfaction/AlertsList.vue';

interface Question {
  id: string;
  type: string;
  question: string;
  description: string | null;
  options: string[] | null;
  isRequired: boolean;
  order: number;
}

interface Survey {
  id: string;
  name: string;
  type: string;
  description: string | null;
  thankYouMessage: string | null;
  isActive: boolean;
  autoSend: boolean;
  triggerAfterDays: number | null;
  questions: Question[];
  createdAt: string;
}

interface SurveyResponse {
  id: string;
  patientId: string;
  patientName: string;
  surveyId: string;
  surveyName: string;
  npsScore: number | null;
  completedAt: string | null;
  answers: {
    questionId: string;
    question: string;
    value: string;
    numericValue: number | null;
  }[];
}

const { t, d } = useI18n();

type TabType = 'dashboard' | 'surveys' | 'responses' | 'alerts';
const activeTab = ref<TabType>('dashboard');

// Data
const surveys = ref<Survey[]>([]);
const responses = ref<SurveyResponse[]>([]);
const loadingSurveys = ref(false);
const loadingResponses = ref(false);

// Component refs
const dashboardRef = ref<InstanceType<typeof NPSDashboard> | null>(null);
const alertsRef = ref<InstanceType<typeof AlertsList> | null>(null);

// Modals
const showSurveyModal = ref(false);
const selectedSurvey = ref<Survey | null>(null);
const showResponseModal = ref(false);
const selectedResponse = ref<SurveyResponse | null>(null);
const showSendModal = ref(false);
const sendSurveyId = ref<string>('');

// Send form
const sendForm = ref({
  patientIds: [] as string[],
});
const patients = ref<{ id: string; name: string }[]>([]);
const searchPatient = ref('');
const loadingPatients = ref(false);

async function fetchSurveys() {
  loadingSurveys.value = true;
  try {
    const response = await api.get('/surveys/surveys');
    surveys.value = response.data.surveys;
  } catch (error) {
    console.error('Failed to fetch surveys:', error);
  } finally {
    loadingSurveys.value = false;
  }
}

async function fetchResponses() {
  loadingResponses.value = true;
  try {
    const response = await api.get('/surveys/responses', {
      params: { completed: 'true' },
    });
    responses.value = response.data.responses;
  } catch (error) {
    console.error('Failed to fetch responses:', error);
  } finally {
    loadingResponses.value = false;
  }
}

async function searchPatients() {
  if (!searchPatient.value || searchPatient.value.length < 2) {
    patients.value = [];
    return;
  }

  loadingPatients.value = true;
  try {
    const response = await api.get('/patients', {
      params: { search: searchPatient.value, limit: 10 },
    });
    patients.value = response.data.patients;
  } catch (error) {
    console.error('Failed to search patients:', error);
  } finally {
    loadingPatients.value = false;
  }
}

function openCreateSurvey() {
  selectedSurvey.value = null;
  showSurveyModal.value = true;
}

function openEditSurvey(survey: Survey) {
  selectedSurvey.value = survey;
  showSurveyModal.value = true;
}

function openSendSurvey(surveyId: string) {
  sendSurveyId.value = surveyId;
  sendForm.value.patientIds = [];
  searchPatient.value = '';
  patients.value = [];
  showSendModal.value = true;
}

function openResponseDetails(response: SurveyResponse) {
  selectedResponse.value = response;
  showResponseModal.value = true;
}

function addPatientToSend(patient: { id: string; name: string }) {
  if (!sendForm.value.patientIds.includes(patient.id)) {
    sendForm.value.patientIds.push(patient.id);
  }
  searchPatient.value = '';
  patients.value = [];
}

function removePatientFromSend(patientId: string) {
  sendForm.value.patientIds = sendForm.value.patientIds.filter((id) => id !== patientId);
}

async function sendSurvey() {
  if (sendForm.value.patientIds.length === 0) return;

  try {
    const response = await api.post(`/surveys/surveys/${sendSurveyId.value}/send`, {
      patientIds: sendForm.value.patientIds,
    });

    alert(t('satisfaction.surveySentSuccess', { count: response.data.surveyLinks.length }));
    showSendModal.value = false;
  } catch (error) {
    console.error('Failed to send survey:', error);
    alert(t('satisfaction.surveySentError'));
  }
}

async function deleteSurvey(id: string) {
  if (!confirm(t('satisfaction.confirmDelete'))) return;

  try {
    await api.delete(`/surveys/surveys/${id}`);
    await fetchSurveys();
  } catch (error) {
    console.error('Failed to delete survey:', error);
  }
}

async function toggleSurveyActive(survey: Survey) {
  try {
    await api.put(`/surveys/surveys/${survey.id}`, {
      isActive: !survey.isActive,
    });
    await fetchSurveys();
  } catch (error) {
    console.error('Failed to toggle survey:', error);
  }
}

function handleSurveySaved() {
  showSurveyModal.value = false;
  fetchSurveys();
}

function getSurveyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INITIAL: t('satisfaction.types.initial'),
    NPS: t('satisfaction.types.nps'),
    PERIODIC: t('satisfaction.types.periodic'),
    POST_TREATMENT: t('satisfaction.types.postTreatment'),
  };
  return labels[type] || type;
}

function getNPSClass(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score >= 9) return 'text-green-600';
  if (score >= 7) return 'text-yellow-600';
  return 'text-red-600';
}

function getNPSLabel(score: number | null): string {
  if (score === null) return '-';
  if (score >= 9) return t('satisfaction.promoter');
  if (score >= 7) return t('satisfaction.passive');
  return t('satisfaction.detractor');
}

onMounted(() => {
  fetchSurveys();
  fetchResponses();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('satisfaction.title') }}</h1>
        <p class="text-gray-600">{{ t('satisfaction.subtitle') }}</p>
      </div>
      <button
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        @click="openCreateSurvey"
      >
        {{ t('satisfaction.createSurvey') }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex gap-6">
        <button
          v-for="tab in (['dashboard', 'surveys', 'responses', 'alerts'] as TabType[])"
          :key="tab"
          :class="[
            'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
          @click="activeTab = tab"
        >
          {{ t(`satisfaction.tabs.${tab}`) }}
        </button>
      </nav>
    </div>

    <!-- Dashboard Tab -->
    <div v-if="activeTab === 'dashboard'">
      <NPSDashboard ref="dashboardRef" />
    </div>

    <!-- Surveys Tab -->
    <div v-else-if="activeTab === 'surveys'">
      <div v-if="loadingSurveys" class="animate-pulse space-y-4">
        <div class="h-20 bg-gray-200 rounded-lg"></div>
        <div class="h-20 bg-gray-200 rounded-lg"></div>
      </div>

      <div v-else-if="surveys.length === 0" class="text-center py-12 text-gray-500">
        {{ t('satisfaction.noSurveys') }}
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="survey in surveys"
          :key="survey.id"
          class="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3">
                <h3 class="font-semibold text-gray-900">{{ survey.name }}</h3>
                <span
                  :class="[
                    'px-2 py-0.5 text-xs rounded-full',
                    survey.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  ]"
                >
                  {{ survey.isActive ? t('common.active') : t('common.inactive') }}
                </span>
                <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                  {{ getSurveyTypeLabel(survey.type) }}
                </span>
              </div>
              <p v-if="survey.description" class="text-sm text-gray-600 mt-1">
                {{ survey.description }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{{ t('satisfaction.questionsCount', { count: survey.questions.length }) }}</span>
                <span v-if="survey.autoSend">
                  {{ t('satisfaction.autoSendAfter', { days: survey.triggerAfterDays }) }}
                </span>
                <span>{{ t('common.createdAt') }}: {{ d(new Date(survey.createdAt), 'short') }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                :title="t('satisfaction.sendSurvey')"
                @click="openSendSurvey(survey.id)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
              <button
                class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                :title="survey.isActive ? t('common.deactivate') : t('common.activate')"
                @click="toggleSurveyActive(survey)"
              >
                <svg v-if="survey.isActive" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                :title="t('common.edit')"
                @click="openEditSurvey(survey)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                :title="t('common.delete')"
                @click="deleteSurvey(survey.id)"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Responses Tab -->
    <div v-else-if="activeTab === 'responses'">
      <div v-if="loadingResponses" class="animate-pulse space-y-4">
        <div class="h-16 bg-gray-200 rounded-lg"></div>
        <div class="h-16 bg-gray-200 rounded-lg"></div>
      </div>

      <div v-else-if="responses.length === 0" class="text-center py-12 text-gray-500">
        {{ t('satisfaction.noResponses') }}
      </div>

      <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('satisfaction.patient') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('satisfaction.survey') }}
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {{ t('satisfaction.npsScore') }}
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {{ t('satisfaction.category') }}
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {{ t('satisfaction.completedAt') }}
              </th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {{ t('common.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="response in responses"
              :key="response.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 font-medium text-gray-900">
                {{ response.patientName }}
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ response.surveyName }}
              </td>
              <td class="px-6 py-4 text-center">
                <span :class="['text-2xl font-bold', getNPSClass(response.npsScore)]">
                  {{ response.npsScore ?? '-' }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  :class="[
                    'px-2 py-1 text-xs rounded-full',
                    response.npsScore !== null && response.npsScore >= 9 ? 'bg-green-100 text-green-700' :
                    response.npsScore !== null && response.npsScore >= 7 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  ]"
                >
                  {{ getNPSLabel(response.npsScore) }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-600">
                {{ response.completedAt ? d(new Date(response.completedAt), 'short') : '-' }}
              </td>
              <td class="px-6 py-4 text-center">
                <button
                  class="text-blue-600 hover:text-blue-800"
                  @click="openResponseDetails(response)"
                >
                  {{ t('common.viewDetails') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Alerts Tab -->
    <div v-else-if="activeTab === 'alerts'">
      <AlertsList ref="alertsRef" />
    </div>

    <!-- Survey Form Modal -->
    <SurveyFormModal
      v-if="showSurveyModal"
      :survey="selectedSurvey"
      @close="showSurveyModal = false"
      @saved="handleSurveySaved"
    />

    <!-- Send Survey Modal -->
    <Teleport to="body">
      <div
        v-if="showSendModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            {{ t('satisfaction.sendSurvey') }}
          </h3>

          <div class="space-y-4">
            <!-- Patient Search -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('satisfaction.selectPatients') }}
              </label>
              <input
                v-model="searchPatient"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('satisfaction.searchPatients')"
                @input="searchPatients"
              />

              <!-- Search Results -->
              <div v-if="patients.length > 0" class="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                <button
                  v-for="patient in patients"
                  :key="patient.id"
                  class="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                  @click="addPatientToSend(patient)"
                >
                  {{ patient.name }}
                </button>
              </div>
            </div>

            <!-- Selected Patients -->
            <div v-if="sendForm.patientIds.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('satisfaction.selectedPatients') }}
              </label>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="patientId in sendForm.patientIds"
                  :key="patientId"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {{ patientId }}
                  <button
                    class="hover:text-blue-900"
                    @click="removePatientFromSend(patientId)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              @click="showSendModal = false"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              :disabled="sendForm.patientIds.length === 0"
              @click="sendSurvey"
            >
              {{ t('satisfaction.send') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Response Details Modal -->
    <Teleport to="body">
      <div
        v-if="showResponseModal && selectedResponse"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ t('satisfaction.responseDetails') }}
            </h3>
            <button
              class="text-gray-500 hover:text-gray-700"
              @click="showResponseModal = false"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="font-medium text-gray-900">{{ selectedResponse.patientName }}</p>
                <p class="text-sm text-gray-600">{{ selectedResponse.surveyName }}</p>
              </div>
              <div class="text-center">
                <span :class="['text-3xl font-bold', getNPSClass(selectedResponse.npsScore)]">
                  {{ selectedResponse.npsScore ?? '-' }}
                </span>
                <p :class="['text-sm', getNPSClass(selectedResponse.npsScore)]">
                  {{ getNPSLabel(selectedResponse.npsScore) }}
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <h4 class="font-medium text-gray-900">{{ t('satisfaction.answers') }}</h4>
              <div
                v-for="answer in selectedResponse.answers"
                :key="answer.questionId"
                class="p-3 border border-gray-200 rounded-lg"
              >
                <p class="text-sm font-medium text-gray-700">{{ answer.question }}</p>
                <p class="mt-1 text-gray-900">{{ answer.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

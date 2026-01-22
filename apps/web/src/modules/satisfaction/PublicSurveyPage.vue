<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import axios from 'axios';

interface Question {
  id: string;
  type: 'NPS' | 'STAR_RATING' | 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | 'YES_NO';
  question: string;
  description: string | null;
  options: string[] | null;
  isRequired: boolean;
  order: number;
}

interface Survey {
  id: string;
  name: string;
  description: string | null;
  questions: Question[];
}

const route = useRoute();
const { t } = useI18n();

const token = computed(() => route.params.token as string);

const loading = ref(true);
const submitting = ref(false);
const survey = ref<Survey | null>(null);
const patientName = ref('');
const error = ref<string | null>(null);
const submitted = ref(false);
const thankYouMessage = ref<string | null>(null);

// Answers
const answers = ref<Record<string, { value: string; numericValue?: number }>>({});

// API base URL - use the same as the main app
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchSurvey() {
  loading.value = true;
  error.value = null;

  try {
    const response = await axios.get(`${apiBaseUrl}/api/surveys/public/${token.value}`);

    if (response.data.success) {
      survey.value = response.data.survey;
      patientName.value = response.data.patientName;

      // Initialize answers
      for (const question of response.data.survey.questions) {
        answers.value[question.id] = { value: '' };
      }
    }
  } catch (err: any) {
    if (err.response?.status === 404) {
      error.value = t('publicSurvey.notFound');
    } else if (err.response?.status === 410) {
      error.value = t('publicSurvey.expired');
    } else if (err.response?.status === 409) {
      error.value = t('publicSurvey.alreadyCompleted');
      thankYouMessage.value = err.response?.data?.thankYouMessage;
      submitted.value = true;
    } else {
      error.value = t('publicSurvey.loadError');
    }
  } finally {
    loading.value = false;
  }
}

async function submitSurvey() {
  if (!survey.value) return;

  // Validate required questions
  for (const question of survey.value.questions) {
    if (question.isRequired && !answers.value[question.id]?.value) {
      alert(t('publicSurvey.requiredQuestion', { question: question.question }));
      return;
    }
  }

  submitting.value = true;

  try {
    const formattedAnswers = Object.entries(answers.value).map(([questionId, answer]) => ({
      questionId,
      value: answer.value,
      numericValue: answer.numericValue,
    }));

    const response = await axios.post(`${apiBaseUrl}/api/surveys/public/${token.value}`, {
      answers: formattedAnswers,
    });

    if (response.data.success) {
      submitted.value = true;
      thankYouMessage.value = response.data.thankYouMessage;
    }
  } catch (err: any) {
    if (err.response?.status === 409) {
      error.value = t('publicSurvey.alreadyCompleted');
      submitted.value = true;
    } else if (err.response?.status === 410) {
      error.value = t('publicSurvey.expired');
    } else {
      alert(t('publicSurvey.submitError'));
    }
  } finally {
    submitting.value = false;
  }
}

function setNPSValue(questionId: string, value: number) {
  answers.value[questionId] = {
    value: value.toString(),
    numericValue: value,
  };
}

function setStarRating(questionId: string, value: number) {
  answers.value[questionId] = {
    value: value.toString(),
    numericValue: value,
  };
}

function setYesNo(questionId: string, value: boolean) {
  answers.value[questionId] = {
    value: value ? 'yes' : 'no',
    numericValue: value ? 1 : 0,
  };
}

onMounted(fetchSurvey);
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20">
        <div class="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p class="mt-4 text-gray-600">{{ t('publicSurvey.loading') }}</p>
      </div>

      <!-- Error -->
      <div v-else-if="error && !submitted" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 class="text-xl font-semibold text-gray-900 mb-2">{{ t('publicSurvey.errorTitle') }}</h1>
        <p class="text-gray-600">{{ error }}</p>
      </div>

      <!-- Success / Thank You -->
      <div v-else-if="submitted" class="bg-white rounded-lg shadow-lg p-8 text-center">
        <svg class="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 class="text-xl font-semibold text-gray-900 mb-2">{{ t('publicSurvey.thankYou') }}</h1>
        <p class="text-gray-600">
          {{ thankYouMessage || t('publicSurvey.defaultThankYou') }}
        </p>
      </div>

      <!-- Survey Form -->
      <div v-else-if="survey" class="bg-white rounded-lg shadow-lg overflow-hidden">
        <!-- Header -->
        <div class="bg-primary text-white p-6">
          <h1 class="text-2xl font-bold">{{ survey.name }}</h1>
          <p v-if="survey.description" class="mt-2 text-primary-100">{{ survey.description }}</p>
          <p class="mt-2 text-sm opacity-80">{{ t('publicSurvey.greeting', { name: patientName }) }}</p>
        </div>

        <!-- Questions -->
        <div class="p-6 space-y-8">
          <div
            v-for="question in survey.questions"
            :key="question.id"
            class="space-y-3"
          >
            <div class="flex items-start gap-2">
              <h3 class="font-medium text-gray-900">{{ question.question }}</h3>
              <span v-if="question.isRequired" class="text-red-500">*</span>
            </div>
            <p v-if="question.description" class="text-sm text-gray-500">{{ question.description }}</p>

            <!-- NPS Question -->
            <div v-if="question.type === 'NPS'" class="space-y-2">
              <div class="flex items-center justify-between text-xs text-gray-500">
                <span>{{ t('publicSurvey.notLikely') }}</span>
                <span>{{ t('publicSurvey.veryLikely') }}</span>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="n in 11"
                  :key="n - 1"
                  :class="[
                    'flex-1 h-12 rounded font-semibold transition-colors',
                    answers[question.id]?.numericValue === n - 1
                      ? n - 1 <= 6
                        ? 'bg-red-500 text-white'
                        : n - 1 <= 8
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                  @click="setNPSValue(question.id, n - 1)"
                >
                  {{ n - 1 }}
                </button>
              </div>
            </div>

            <!-- Star Rating -->
            <div v-else-if="question.type === 'STAR_RATING'" class="flex gap-2">
              <button
                v-for="n in 5"
                :key="n"
                class="text-3xl transition-colors"
                @click="setStarRating(question.id, n)"
              >
                <span :class="(answers[question.id]?.numericValue ?? 0) >= n ? 'text-yellow-400' : 'text-gray-300'">
                  &#9733;
                </span>
              </button>
            </div>

            <!-- Multiple Choice -->
            <div v-else-if="question.type === 'MULTIPLE_CHOICE' && question.options" class="space-y-2">
              <label
                v-for="option in question.options"
                :key="option"
                class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                :class="{ 'border-primary bg-primary/5': answers[question.id]?.value === option }"
              >
                <input
                  type="radio"
                  :name="question.id"
                  :value="option"
                  v-model="answers[question.id].value"
                  class="w-4 h-4 text-primary"
                />
                <span class="text-gray-900">{{ option }}</span>
              </label>
            </div>

            <!-- Yes/No -->
            <div v-else-if="question.type === 'YES_NO'" class="flex gap-4">
              <button
                :class="[
                  'flex-1 py-3 rounded-lg font-medium transition-colors',
                  answers[question.id]?.value === 'yes'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                @click="setYesNo(question.id, true)"
              >
                {{ t('publicSurvey.yes') }}
              </button>
              <button
                :class="[
                  'flex-1 py-3 rounded-lg font-medium transition-colors',
                  answers[question.id]?.value === 'no'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
                @click="setYesNo(question.id, false)"
              >
                {{ t('publicSurvey.no') }}
              </button>
            </div>

            <!-- Open Text -->
            <div v-else-if="question.type === 'OPEN_TEXT'">
              <textarea
                v-model="answers[question.id].value"
                rows="4"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('publicSurvey.typeAnswer')"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="p-6 bg-gray-50 border-t border-gray-200">
          <button
            class="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
            :disabled="submitting"
            @click="submitSurvey"
          >
            {{ submitting ? t('publicSurvey.submitting') : t('publicSurvey.submit') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

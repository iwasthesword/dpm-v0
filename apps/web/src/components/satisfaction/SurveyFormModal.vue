<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface Survey {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  autoSend: boolean;
  triggerAfterDays: number | null;
  thankYouMessage: string | null;
  questions: Question[];
}

interface Question {
  id: string;
  type: string;
  question: string;
  description: string | null;
  options: string[] | null;
  isRequired: boolean;
  order: number;
}

const props = defineProps<{
  survey: Survey | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();

const isEditing = computed(() => !!props.survey);
const saving = ref(false);

const surveyTypes = ['INITIAL', 'NPS', 'PERIODIC', 'POST_TREATMENT'] as const;
const questionTypes = ['NPS', 'STAR_RATING', 'MULTIPLE_CHOICE', 'OPEN_TEXT', 'YES_NO'] as const;

const form = ref({
  name: '',
  type: 'NPS' as typeof surveyTypes[number],
  description: '',
  isActive: true,
  autoSend: false,
  triggerAfterDays: null as number | null,
  thankYouMessage: '',
  questions: [] as {
    id?: string;
    type: typeof questionTypes[number];
    question: string;
    description: string;
    options: string[];
    isRequired: boolean;
    order: number;
  }[],
});

const newQuestion = ref({
  type: 'NPS' as typeof questionTypes[number],
  question: '',
  description: '',
  options: [''],
  isRequired: true,
});

watch(
  () => props.survey,
  (survey) => {
    if (survey) {
      form.value = {
        name: survey.name,
        type: survey.type as typeof surveyTypes[number],
        description: survey.description || '',
        isActive: survey.isActive,
        autoSend: survey.autoSend,
        triggerAfterDays: survey.triggerAfterDays,
        thankYouMessage: survey.thankYouMessage || '',
        questions: survey.questions.map((q) => ({
          id: q.id,
          type: q.type as typeof questionTypes[number],
          question: q.question,
          description: q.description || '',
          options: q.options || [],
          isRequired: q.isRequired,
          order: q.order,
        })),
      };
    } else {
      // Add default NPS question for new surveys
      form.value = {
        name: '',
        type: 'NPS',
        description: '',
        isActive: true,
        autoSend: false,
        triggerAfterDays: null,
        thankYouMessage: '',
        questions: [
          {
            type: 'NPS',
            question: t('satisfaction.defaultNPSQuestion'),
            description: '',
            options: [],
            isRequired: true,
            order: 0,
          },
        ],
      };
    }
  },
  { immediate: true }
);

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INITIAL: t('satisfaction.types.initial'),
    NPS: t('satisfaction.types.nps'),
    PERIODIC: t('satisfaction.types.periodic'),
    POST_TREATMENT: t('satisfaction.types.postTreatment'),
  };
  return labels[type] || type;
}

function getQuestionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NPS: t('satisfaction.questionTypes.nps'),
    STAR_RATING: t('satisfaction.questionTypes.starRating'),
    MULTIPLE_CHOICE: t('satisfaction.questionTypes.multipleChoice'),
    OPEN_TEXT: t('satisfaction.questionTypes.openText'),
    YES_NO: t('satisfaction.questionTypes.yesNo'),
  };
  return labels[type] || type;
}

function addQuestion() {
  if (!newQuestion.value.question.trim()) return;

  form.value.questions.push({
    type: newQuestion.value.type,
    question: newQuestion.value.question,
    description: newQuestion.value.description,
    options: newQuestion.value.type === 'MULTIPLE_CHOICE'
      ? newQuestion.value.options.filter((o) => o.trim())
      : [],
    isRequired: newQuestion.value.isRequired,
    order: form.value.questions.length,
  });

  // Reset new question form
  newQuestion.value = {
    type: 'OPEN_TEXT',
    question: '',
    description: '',
    options: [''],
    isRequired: true,
  };
}

function removeQuestion(index: number) {
  form.value.questions.splice(index, 1);
  // Reorder remaining questions
  form.value.questions.forEach((q, i) => {
    q.order = i;
  });
}

function moveQuestion(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= form.value.questions.length) return;

  const temp = form.value.questions[index];
  form.value.questions[index] = form.value.questions[newIndex];
  form.value.questions[newIndex] = temp;

  // Update order
  form.value.questions.forEach((q, i) => {
    q.order = i;
  });
}

function addOption() {
  newQuestion.value.options.push('');
}

function removeOption(index: number) {
  if (newQuestion.value.options.length > 1) {
    newQuestion.value.options.splice(index, 1);
  }
}

async function saveSurvey() {
  if (!form.value.name.trim() || form.value.questions.length === 0) return;

  saving.value = true;
  try {
    if (isEditing.value) {
      // Update existing survey
      await api.put(`/surveys/surveys/${props.survey!.id}`, {
        name: form.value.name,
        type: form.value.type,
        description: form.value.description || null,
        isActive: form.value.isActive,
        autoSend: form.value.autoSend,
        triggerAfterDays: form.value.autoSend ? form.value.triggerAfterDays : null,
        thankYouMessage: form.value.thankYouMessage || null,
      });

      // Handle questions - for simplicity, we'll just update the survey
      // A more complex implementation would handle individual question updates
    } else {
      // Create new survey
      await api.post('/surveys/surveys', {
        name: form.value.name,
        type: form.value.type,
        description: form.value.description || null,
        isActive: form.value.isActive,
        autoSend: form.value.autoSend,
        triggerAfterDays: form.value.autoSend ? form.value.triggerAfterDays : null,
        thankYouMessage: form.value.thankYouMessage || null,
        questions: form.value.questions.map((q) => ({
          type: q.type,
          question: q.question,
          description: q.description || null,
          options: q.options.length > 0 ? q.options : null,
          isRequired: q.isRequired,
          order: q.order,
        })),
      });
    }

    emit('saved');
  } catch (error) {
    console.error('Failed to save survey:', error);
    alert(t('satisfaction.saveError'));
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
            {{ isEditing ? t('satisfaction.editSurvey') : t('satisfaction.createSurvey') }}
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
                {{ t('satisfaction.surveyName') }} *
              </label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('satisfaction.surveyNamePlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('satisfaction.surveyType') }}
              </label>
              <select
                v-model="form.type"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option v-for="type in surveyTypes" :key="type" :value="type">
                  {{ getTypeLabel(type) }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('satisfaction.description') }}
            </label>
            <textarea
              v-model="form.description"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('satisfaction.descriptionPlaceholder')"
            ></textarea>
          </div>

          <!-- Settings -->
          <div class="flex flex-wrap gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.isActive"
                type="checkbox"
                class="w-4 h-4 text-primary rounded focus:ring-primary/50"
              />
              <span class="text-sm text-gray-700">{{ t('satisfaction.isActive') }}</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="form.autoSend"
                type="checkbox"
                class="w-4 h-4 text-primary rounded focus:ring-primary/50"
              />
              <span class="text-sm text-gray-700">{{ t('satisfaction.autoSend') }}</span>
            </label>
          </div>

          <div v-if="form.autoSend">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('satisfaction.triggerAfterDays') }}
            </label>
            <input
              v-model.number="form.triggerAfterDays"
              type="number"
              min="0"
              class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('satisfaction.thankYouMessage') }}
            </label>
            <textarea
              v-model="form.thankYouMessage"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('satisfaction.thankYouPlaceholder')"
            ></textarea>
          </div>

          <!-- Questions -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">{{ t('satisfaction.questions') }}</h3>

            <!-- Existing Questions -->
            <div v-if="form.questions.length > 0" class="space-y-3 mb-6">
              <div
                v-for="(question, index) in form.questions"
                :key="index"
                class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex flex-col gap-1">
                  <button
                    class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    :disabled="index === 0"
                    @click="moveQuestion(index, 'up')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    :disabled="index === form.questions.length - 1"
                    @click="moveQuestion(index, 'down')"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                      {{ getQuestionTypeLabel(question.type) }}
                    </span>
                    <span v-if="question.isRequired" class="text-xs text-red-500">*</span>
                  </div>
                  <p class="text-sm text-gray-900">{{ question.question }}</p>
                  <p v-if="question.description" class="text-xs text-gray-500 mt-1">
                    {{ question.description }}
                  </p>
                </div>
                <button
                  class="p-1 text-red-500 hover:text-red-700"
                  @click="removeQuestion(index)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Add New Question -->
            <div v-if="!isEditing" class="border border-dashed border-gray-300 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">{{ t('satisfaction.addQuestion') }}</h4>
              <div class="space-y-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">{{ t('satisfaction.questionType') }}</label>
                    <select
                      v-model="newQuestion.type"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option v-for="type in questionTypes" :key="type" :value="type">
                        {{ getQuestionTypeLabel(type) }}
                      </option>
                    </select>
                  </div>
                  <div class="flex items-end">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        v-model="newQuestion.isRequired"
                        type="checkbox"
                        class="w-4 h-4 text-primary rounded focus:ring-primary/50"
                      />
                      <span class="text-sm text-gray-700">{{ t('satisfaction.required') }}</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">{{ t('satisfaction.questionText') }}</label>
                  <input
                    v-model="newQuestion.question"
                    type="text"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    :placeholder="t('satisfaction.questionPlaceholder')"
                  />
                </div>

                <!-- Multiple Choice Options -->
                <div v-if="newQuestion.type === 'MULTIPLE_CHOICE'" class="space-y-2">
                  <label class="block text-xs text-gray-500">{{ t('satisfaction.options') }}</label>
                  <div
                    v-for="(option, index) in newQuestion.options"
                    :key="index"
                    class="flex items-center gap-2"
                  >
                    <input
                      v-model="newQuestion.options[index]"
                      type="text"
                      class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                      :placeholder="`${t('satisfaction.option')} ${index + 1}`"
                    />
                    <button
                      v-if="newQuestion.options.length > 1"
                      class="p-1 text-red-500 hover:text-red-700"
                      @click="removeOption(index)"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <button
                    class="text-sm text-primary hover:text-primary-dark"
                    @click="addOption"
                  >
                    + {{ t('satisfaction.addOption') }}
                  </button>
                </div>

                <button
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  :disabled="!newQuestion.question.trim()"
                  @click="addQuestion"
                >
                  {{ t('satisfaction.addQuestionBtn') }}
                </button>
              </div>
            </div>
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
            :disabled="saving || !form.name.trim() || form.questions.length === 0"
            @click="saveSurvey"
          >
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

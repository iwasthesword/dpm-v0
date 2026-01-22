<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

const props = defineProps<{
  patientId: string;
}>();

const { t, d } = useI18n();

interface ClinicalNote {
  id: string;
  content: string;
  isFinal: boolean;
  finalizedAt: string | null;
  createdAt: string;
  professional: { id: string; name: string };
  appointment?: { id: string; startTime: string };
}

interface NoteTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
}

const notes = ref<ClinicalNote[]>([]);
const templates = ref<NoteTemplate[]>([]);
const loading = ref(true);
const showAddForm = ref(false);
const newNoteContent = ref('');
const saving = ref(false);
const editingNoteId = ref<string | null>(null);
const editContent = ref('');
const selectedTemplateId = ref<string>('');
const showTemplateSelector = ref(false);

const templateCategories = computed(() => {
  const categories = new Set(templates.value.map(t => t.category));
  return Array.from(categories);
});

const templatesByCategory = computed(() => {
  const result: Record<string, NoteTemplate[]> = {};
  for (const template of templates.value) {
    if (!result[template.category]) {
      result[template.category] = [];
    }
    result[template.category].push(template);
  }
  return result;
});

function getCategoryLabel(category: string): string {
  return t(`ehr.noteTemplates.categories.${category}`);
}

async function fetchNotes() {
  loading.value = true;
  try {
    const response = await api.get(`/ehr/patients/${props.patientId}/notes`);
    notes.value = response.data.notes;
  } catch (error) {
    console.error('Failed to fetch notes:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchTemplates() {
  try {
    const response = await api.get('/ehr/clinical-note-templates');
    templates.value = response.data.templates;
  } catch (error) {
    console.error('Failed to fetch templates:', error);
  }
}

function applyTemplate(templateId: string) {
  const template = templates.value.find(t => t.id === templateId);
  if (template) {
    newNoteContent.value = template.content;
    selectedTemplateId.value = templateId;
    showTemplateSelector.value = false;
  }
}

function applyTemplateToEdit(templateId: string) {
  const template = templates.value.find(t => t.id === templateId);
  if (template) {
    editContent.value = template.content;
    showTemplateSelector.value = false;
  }
}

async function createNote() {
  if (!newNoteContent.value.trim()) return;

  saving.value = true;
  try {
    await api.post(`/ehr/patients/${props.patientId}/notes`, {
      content: newNoteContent.value,
    });
    newNoteContent.value = '';
    showAddForm.value = false;
    await fetchNotes();
  } catch (error) {
    console.error('Failed to create note:', error);
  } finally {
    saving.value = false;
  }
}

function startEditing(note: ClinicalNote) {
  if (note.isFinal) return;
  editingNoteId.value = note.id;
  editContent.value = note.content;
}

async function saveEdit() {
  if (!editingNoteId.value || !editContent.value.trim()) return;

  saving.value = true;
  try {
    await api.put(`/ehr/patients/${props.patientId}/notes/${editingNoteId.value}`, {
      content: editContent.value,
    });
    editingNoteId.value = null;
    editContent.value = '';
    await fetchNotes();
  } catch (error) {
    console.error('Failed to update note:', error);
  } finally {
    saving.value = false;
  }
}

async function finalizeNote(noteId: string) {
  saving.value = true;
  try {
    const note = notes.value.find(n => n.id === noteId);
    if (!note) return;

    await api.put(`/ehr/patients/${props.patientId}/notes/${noteId}`, {
      content: note.content,
      isFinal: true,
    });
    await fetchNotes();
  } catch (error) {
    console.error('Failed to finalize note:', error);
  } finally {
    saving.value = false;
  }
}

function cancelEdit() {
  editingNoteId.value = null;
  editContent.value = '';
}

onMounted(() => {
  fetchNotes();
  fetchTemplates();
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ t('treatments.clinicalNotes') }}</h3>
      <button
        v-if="!showAddForm"
        class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        @click="showAddForm = true"
      >
        {{ t('treatments.addNote') }}
      </button>
    </div>

    <!-- Add Note Form -->
    <div v-if="showAddForm" class="mb-4 p-4 bg-gray-50 rounded-lg">
      <!-- Template Selector -->
      <div class="mb-3">
        <div class="flex items-center gap-2 mb-2">
          <label class="text-sm font-medium text-gray-700">{{ t('ehr.noteTemplates.selectTemplate') }}</label>
          <span class="text-xs text-gray-500">({{ t('common.optional') }})</span>
        </div>
        <div class="relative">
          <button
            type="button"
            class="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            @click="showTemplateSelector = !showTemplateSelector"
          >
            <span v-if="selectedTemplateId" class="text-gray-900">
              {{ templates.find(t => t.id === selectedTemplateId)?.name }}
            </span>
            <span v-else class="text-gray-400">{{ t('ehr.noteTemplates.chooseTemplate') }}</span>
          </button>

          <!-- Template Dropdown -->
          <div
            v-if="showTemplateSelector"
            class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            <div
              v-for="category in templateCategories"
              :key="category"
              class="border-b border-gray-100 last:border-b-0"
            >
              <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                {{ getCategoryLabel(category) }}
              </div>
              <button
                v-for="template in templatesByCategory[category]"
                :key="template.id"
                type="button"
                class="w-full px-3 py-2 text-left text-sm hover:bg-primary/5 focus:bg-primary/5"
                @click="applyTemplate(template.id)"
              >
                {{ template.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <textarea
        v-model="newNoteContent"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-sm"
        rows="8"
        :placeholder="t('treatments.noteContent')"
      />
      <div class="mt-3 flex justify-between">
        <button
          v-if="selectedTemplateId"
          type="button"
          class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          @click="selectedTemplateId = ''; newNoteContent = ''"
        >
          {{ t('ehr.noteTemplates.clearTemplate') }}
        </button>
        <div v-else></div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            @click="showAddForm = false; newNoteContent = ''; selectedTemplateId = ''"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            :disabled="!newNoteContent.trim() || saving"
            @click="createNote"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="notes.length === 0" class="text-center py-8 text-gray-500">
      {{ t('treatments.noNotes') }}
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="note in notes"
        :key="note.id"
        class="p-4 border border-gray-200 rounded-lg"
        :class="{ 'bg-gray-50': note.isFinal }"
      >
        <!-- Editing mode -->
        <template v-if="editingNoteId === note.id">
          <textarea
            v-model="editContent"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows="4"
          />
          <div class="mt-3 flex justify-end gap-2">
            <button
              class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              @click="cancelEdit"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              :disabled="!editContent.trim() || saving"
              @click="saveEdit"
            >
              {{ t('common.save') }}
            </button>
          </div>
        </template>

        <!-- View mode -->
        <template v-else>
          <div class="flex items-start justify-between mb-2">
            <div>
              <p class="text-sm font-medium text-gray-900">{{ note.professional.name }}</p>
              <p class="text-xs text-gray-500">
                {{ d(new Date(note.createdAt), 'long') }}
                <span v-if="note.isFinal" class="ml-2 text-green-600">
                  ({{ t('treatments.finalizeNote') }}: {{ d(new Date(note.finalizedAt!), 'short') }})
                </span>
              </p>
            </div>
            <div v-if="!note.isFinal" class="flex gap-2">
              <button
                class="text-xs text-gray-500 hover:text-gray-700"
                @click="startEditing(note)"
              >
                {{ t('common.edit') }}
              </button>
              <button
                class="text-xs text-primary hover:text-primary/80"
                @click="finalizeNote(note.id)"
              >
                {{ t('treatments.finalizeNote') }}
              </button>
            </div>
          </div>
          <p class="text-gray-700 whitespace-pre-wrap">{{ note.content }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

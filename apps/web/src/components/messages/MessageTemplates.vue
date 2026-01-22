<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const { t } = useI18n();

interface Template {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject?: string;
  content: string;
  isActive: boolean;
}

interface Variable {
  name: string;
  description: string;
}

const templates = ref<Template[]>([]);
const variables = ref<Variable[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');

const showTemplateModal = ref(false);
const showPreviewModal = ref(false);
const editingTemplate = ref<Template | null>(null);
const previewContent = ref({ subject: '', content: '', channel: '' });

const form = ref({
  name: '',
  type: 'APPOINTMENT_REMINDER',
  channel: 'WHATSAPP_TEXT',
  subject: '',
  content: '',
});

const reminderTypes = [
  { value: 'APPOINTMENT_REMINDER', label: t('messages.reminderTypes.APPOINTMENT_REMINDER') },
  { value: 'BIRTHDAY', label: t('messages.reminderTypes.BIRTHDAY') },
  { value: 'RETURN_REMINDER', label: t('messages.reminderTypes.RETURN_REMINDER') },
  { value: 'MAINTENANCE', label: t('messages.reminderTypes.MAINTENANCE') },
];

const channels = [
  { value: 'WHATSAPP_TEXT', label: t('messages.channels.WHATSAPP_TEXT') },
  { value: 'SMS', label: t('messages.channels.SMS') },
  { value: 'EMAIL', label: t('messages.channels.EMAIL') },
];

const showSubject = computed(() => form.value.channel === 'EMAIL');

async function fetchTemplates() {
  loading.value = true;
  try {
    const response = await api.get('/messages/templates');
    templates.value = response.data.templates;
  } catch (e) {
    console.error('Failed to fetch templates:', e);
  } finally {
    loading.value = false;
  }
}

async function fetchVariables() {
  try {
    const response = await api.get('/messages/variables');
    variables.value = response.data.variables;
  } catch (e) {
    console.error('Failed to fetch variables:', e);
  }
}

function openNewTemplate() {
  editingTemplate.value = null;
  form.value = {
    name: '',
    type: 'APPOINTMENT_REMINDER',
    channel: 'WHATSAPP_TEXT',
    subject: '',
    content: '',
  };
  error.value = '';
  showTemplateModal.value = true;
}

function openEditTemplate(template: Template) {
  editingTemplate.value = template;
  form.value = {
    name: template.name,
    type: template.type,
    channel: template.channel,
    subject: template.subject || '',
    content: template.content,
  };
  error.value = '';
  showTemplateModal.value = true;
}

async function saveTemplate() {
  saving.value = true;
  error.value = '';

  try {
    if (editingTemplate.value) {
      await api.put(`/messages/templates/${editingTemplate.value.id}`, form.value);
    } else {
      await api.post('/messages/templates', form.value);
    }
    showTemplateModal.value = false;
    fetchTemplates();
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save template';
  } finally {
    saving.value = false;
  }
}

async function deleteTemplate(id: string) {
  if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

  try {
    await api.delete(`/messages/templates/${id}`);
    fetchTemplates();
  } catch (e) {
    console.error('Failed to delete template:', e);
  }
}

async function previewTemplate(template: Template) {
  try {
    const response = await api.post(`/messages/templates/${template.id}/preview`, {});
    previewContent.value = response.data.preview;
    showPreviewModal.value = true;
  } catch (e) {
    console.error('Failed to preview template:', e);
  }
}

function copyVariable(variable: string) {
  navigator.clipboard.writeText(variable);
}

function getTypeLabel(type: string): string {
  return t(`messages.reminderTypes.${type}`);
}

function getChannelLabel(channel: string): string {
  return t(`messages.channels.${channel}`);
}

function getChannelIcon(channel: string): string {
  switch (channel) {
    case 'WHATSAPP_TEXT':
    case 'WHATSAPP_AUDIO':
      return '💬';
    case 'SMS':
      return '📱';
    case 'EMAIL':
      return '📧';
    default:
      return '📨';
  }
}

onMounted(() => {
  fetchTemplates();
  fetchVariables();
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">{{ t('messages.templates') }}</h2>
        <p class="text-sm text-gray-500">Gerencie os modelos de mensagem para lembretes automáticos</p>
      </div>
      <button
        @click="openNewTemplate"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        {{ t('messages.newTemplate') }}
      </button>
    </div>

    <!-- Variables reference -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 class="font-medium text-blue-900 mb-2">{{ t('messages.variables') }}</h3>
      <p class="text-sm text-blue-700 mb-3">{{ t('messages.variablesHelp') }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="variable in variables"
          :key="variable.name"
          @click="copyVariable(variable.name)"
          class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200 transition-colors"
          :title="variable.description"
        >
          {{ variable.name }}
        </button>
      </div>
    </div>

    <!-- Templates list -->
    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="templates.length === 0" class="text-center py-8 text-gray-500">
      {{ t('messages.noTemplates') }}
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="template in templates"
        :key="template.id"
        class="bg-white border border-gray-200 rounded-lg p-4"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <span class="text-2xl">{{ getChannelIcon(template.channel) }}</span>
            <div>
              <h3 class="font-medium text-gray-900">{{ template.name }}</h3>
              <div class="flex gap-2 mt-1">
                <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {{ getTypeLabel(template.type) }}
                </span>
                <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                  {{ getChannelLabel(template.channel) }}
                </span>
                <span
                  v-if="!template.isActive"
                  class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded"
                >
                  Inativo
                </span>
              </div>
              <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ template.content }}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="previewTemplate(template)"
              class="text-sm text-gray-500 hover:text-gray-700"
            >
              {{ t('messages.preview') }}
            </button>
            <button
              @click="openEditTemplate(template)"
              class="text-sm text-primary hover:underline"
            >
              {{ t('common.edit') }}
            </button>
            <button
              @click="deleteTemplate(template.id)"
              class="text-sm text-destructive hover:underline"
            >
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Modal -->
    <Modal
      :open="showTemplateModal"
      :title="editingTemplate ? t('messages.editTemplate') : t('messages.newTemplate')"
      size="lg"
      @close="showTemplateModal = false"
    >
      <form @submit.prevent="saveTemplate" class="space-y-4">
        <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('messages.templateName') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('messages.templateType') }} <span class="text-destructive">*</span>
            </label>
            <select
              v-model="form.type"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="type in reminderTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('messages.channel') }} <span class="text-destructive">*</span>
            </label>
            <select
              v-model="form.channel"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="ch in channels" :key="ch.value" :value="ch.value">
                {{ ch.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="showSubject">
          <label class="block text-sm font-medium text-gray-700">{{ t('messages.subject') }}</label>
          <input
            v-model="form.subject"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('messages.content') }} <span class="text-destructive">*</span>
          </label>
          <textarea
            v-model="form.content"
            rows="6"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            placeholder="Olá {{patientFirstName}}, este é um lembrete da sua consulta..."
          />
          <p class="text-xs text-gray-500 mt-1">
            Use as variáveis disponíveis para personalizar a mensagem
          </p>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showTemplateModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="saveTemplate"
            :disabled="saving || !form.name || !form.content"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Preview Modal -->
    <Modal
      :open="showPreviewModal"
      :title="t('messages.preview')"
      @close="showPreviewModal = false"
    >
      <div class="space-y-4">
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <span>{{ getChannelIcon(previewContent.channel) }}</span>
          <span>{{ getChannelLabel(previewContent.channel) }}</span>
        </div>

        <div v-if="previewContent.subject" class="bg-gray-50 rounded-lg p-3">
          <p class="text-xs text-gray-500 mb-1">Assunto:</p>
          <p class="font-medium">{{ previewContent.subject }}</p>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <p class="whitespace-pre-wrap">{{ previewContent.content }}</p>
        </div>
      </div>

      <template #footer>
        <button
          @click="showPreviewModal = false"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          {{ t('common.close') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

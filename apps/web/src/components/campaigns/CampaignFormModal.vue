<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  channel: string;
  subject: string | null;
  content: string;
  audioUrl: string | null;
  scheduledFor: string | null;
  segmentId: string | null;
}

interface Segment {
  id: string;
  name: string;
  patientCount: number | null;
}

const props = defineProps<{
  campaign: Campaign | null;
  segments: Segment[];
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();

const isEditing = computed(() => !!props.campaign);
const saving = ref(false);

const campaignTypes = [
  'COMMEMORATIVE',
  'BIRTHDAY',
  'REACTIVATION',
  'TREATMENT_FOLLOWUP',
  'PROMOTIONAL',
  'CUSTOM',
] as const;

const channels = [
  'WHATSAPP_TEXT',
  'WHATSAPP_AUDIO',
  'SMS',
  'EMAIL',
] as const;

const form = ref({
  name: '',
  description: '',
  type: 'PROMOTIONAL' as typeof campaignTypes[number],
  channel: 'WHATSAPP_TEXT' as typeof channels[number],
  segmentId: '' as string,
  subject: '',
  content: '',
  audioUrl: '',
  scheduledFor: '' as string,
});

watch(
  () => props.campaign,
  (campaign) => {
    if (campaign) {
      form.value = {
        name: campaign.name,
        description: campaign.description || '',
        type: campaign.type as typeof campaignTypes[number],
        channel: campaign.channel as typeof channels[number],
        segmentId: campaign.segmentId || '',
        subject: campaign.subject || '',
        content: campaign.content,
        audioUrl: campaign.audioUrl || '',
        scheduledFor: campaign.scheduledFor
          ? new Date(campaign.scheduledFor).toISOString().slice(0, 16)
          : '',
      };
    }
  },
  { immediate: true }
);

const selectedSegment = computed(() => {
  if (!form.value.segmentId) return null;
  return props.segments.find((s) => s.id === form.value.segmentId);
});

const showSubject = computed(() => form.value.channel === 'EMAIL');
const showAudioUrl = computed(() => form.value.channel === 'WHATSAPP_AUDIO');

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COMMEMORATIVE: t('campaigns.types.commemorative'),
    BIRTHDAY: t('campaigns.types.birthday'),
    REACTIVATION: t('campaigns.types.reactivation'),
    TREATMENT_FOLLOWUP: t('campaigns.types.treatmentFollowup'),
    PROMOTIONAL: t('campaigns.types.promotional'),
    CUSTOM: t('campaigns.types.custom'),
  };
  return labels[type] || type;
}

function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    WHATSAPP_TEXT: 'WhatsApp (Text)',
    WHATSAPP_AUDIO: 'WhatsApp (Audio)',
    SMS: 'SMS',
    EMAIL: 'Email',
  };
  return labels[channel] || channel;
}

async function saveCampaign() {
  if (!form.value.name.trim() || !form.value.content.trim()) return;

  saving.value = true;
  try {
    const data = {
      name: form.value.name,
      description: form.value.description || null,
      type: form.value.type,
      channel: form.value.channel,
      segmentId: form.value.segmentId || null,
      subject: form.value.subject || null,
      content: form.value.content,
      audioUrl: form.value.audioUrl || null,
      scheduledFor: form.value.scheduledFor || null,
    };

    if (isEditing.value) {
      await api.put(`/campaigns/campaigns/${props.campaign!.id}`, data);
    } else {
      await api.post('/campaigns/campaigns', data);
    }

    emit('saved');
  } catch (error: any) {
    console.error('Failed to save campaign:', error);
    alert(error.response?.data?.error || t('campaigns.saveError'));
  } finally {
    saving.value = false;
  }
}

// Message variables help
const messageVariables = [
  { var: '{{nome}}', desc: t('campaigns.variables.name') },
  { var: '{{primeiro_nome}}', desc: t('campaigns.variables.firstName') },
  { var: '{{clinica}}', desc: t('campaigns.variables.clinic') },
];

function insertVariable(variable: string) {
  form.value.content += variable;
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ isEditing ? t('campaigns.editCampaign') : t('campaigns.createCampaign') }}
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
                {{ t('campaigns.campaignName') }} *
              </label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                :placeholder="t('campaigns.campaignNamePlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('campaigns.campaignType') }}
              </label>
              <select
                v-model="form.type"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option v-for="type in campaignTypes" :key="type" :value="type">
                  {{ getTypeLabel(type) }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('campaigns.description') }}
            </label>
            <input
              v-model="form.description"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('campaigns.descriptionPlaceholder')"
            />
          </div>

          <!-- Target Segment -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('campaigns.targetSegment') }}
            </label>
            <select
              v-model="form.segmentId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">{{ t('campaigns.selectSegment') }}</option>
              <option v-for="segment in segments" :key="segment.id" :value="segment.id">
                {{ segment.name }} ({{ segment.patientCount ?? 0 }} {{ t('campaigns.patients') }})
              </option>
            </select>
            <p v-if="selectedSegment" class="mt-1 text-sm text-gray-500">
              {{ t('campaigns.targetCount') }}: {{ selectedSegment.patientCount ?? 0 }} {{ t('campaigns.patients') }}
            </p>
          </div>

          <!-- Channel -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('campaigns.channel') }}
              </label>
              <select
                v-model="form.channel"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option v-for="channel in channels" :key="channel" :value="channel">
                  {{ getChannelLabel(channel) }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('campaigns.scheduleFor') }}
              </label>
              <input
                v-model="form.scheduledFor"
                type="datetime-local"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p class="mt-1 text-xs text-gray-500">{{ t('campaigns.scheduleHint') }}</p>
            </div>
          </div>

          <!-- Email Subject -->
          <div v-if="showSubject">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('campaigns.emailSubject') }}
            </label>
            <input
              v-model="form.subject"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('campaigns.emailSubjectPlaceholder')"
            />
          </div>

          <!-- Audio URL -->
          <div v-if="showAudioUrl">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('campaigns.audioUrl') }}
            </label>
            <input
              v-model="form.audioUrl"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('campaigns.audioUrlPlaceholder')"
            />
          </div>

          <!-- Message Content -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('campaigns.messageContent') }} *
            </label>
            <div class="flex flex-wrap gap-2 mb-2">
              <button
                v-for="v in messageVariables"
                :key="v.var"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                :title="v.desc"
                @click="insertVariable(v.var)"
              >
                {{ v.var }}
              </button>
            </div>
            <textarea
              v-model="form.content"
              rows="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              :placeholder="t('campaigns.messageContentPlaceholder')"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">
              {{ t('campaigns.variablesHint') }}
            </p>
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
            :disabled="saving || !form.name.trim() || !form.content.trim()"
            @click="saveCampaign"
          >
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

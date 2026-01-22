<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import SegmentBuilder from '@/components/campaigns/SegmentBuilder.vue';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal.vue';

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: Record<string, any>;
  patientCount: number | null;
  isActive: boolean;
  createdAt: string;
}

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
  segmentId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  segment?: { id: string; name: string } | null;
}

const { t, d } = useI18n();

type TabType = 'campaigns' | 'segments';
const activeTab = ref<TabType>('campaigns');

// Data
const campaigns = ref<Campaign[]>([]);
const segments = ref<Segment[]>([]);
const loadingCampaigns = ref(false);
const loadingSegments = ref(false);

// Filters
const statusFilter = ref<'all' | 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'>('all');

// Modals
const showCampaignModal = ref(false);
const selectedCampaign = ref<Campaign | null>(null);
const showSegmentModal = ref(false);
const selectedSegment = ref<Segment | null>(null);

async function fetchCampaigns() {
  loadingCampaigns.value = true;
  try {
    const params: any = {};
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value;
    }

    const response = await api.get('/campaigns/campaigns', { params });
    campaigns.value = response.data.campaigns;
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
  } finally {
    loadingCampaigns.value = false;
  }
}

async function fetchSegments() {
  loadingSegments.value = true;
  try {
    const response = await api.get('/campaigns/segments');
    segments.value = response.data.segments;
  } catch (error) {
    console.error('Failed to fetch segments:', error);
  } finally {
    loadingSegments.value = false;
  }
}

function openCreateCampaign() {
  selectedCampaign.value = null;
  showCampaignModal.value = true;
}

function openEditCampaign(campaign: Campaign) {
  selectedCampaign.value = campaign;
  showCampaignModal.value = true;
}

function openCreateSegment() {
  selectedSegment.value = null;
  showSegmentModal.value = true;
}

function openEditSegment(segment: Segment) {
  selectedSegment.value = segment;
  showSegmentModal.value = true;
}

async function deleteCampaign(id: string) {
  if (!confirm(t('campaigns.confirmDelete'))) return;

  try {
    await api.delete(`/campaigns/campaigns/${id}`);
    await fetchCampaigns();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.deleteError'));
  }
}

async function deleteSegment(id: string) {
  if (!confirm(t('campaigns.confirmDeleteSegment'))) return;

  try {
    await api.delete(`/campaigns/segments/${id}`);
    await fetchSegments();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.deleteError'));
  }
}

async function startCampaign(id: string) {
  if (!confirm(t('campaigns.confirmStart'))) return;

  try {
    await api.post(`/campaigns/campaigns/${id}/start`);
    await fetchCampaigns();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.startError'));
  }
}

async function pauseCampaign(id: string) {
  try {
    await api.post(`/campaigns/campaigns/${id}/pause`);
    await fetchCampaigns();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.pauseError'));
  }
}

async function resumeCampaign(id: string) {
  try {
    await api.post(`/campaigns/campaigns/${id}/resume`);
    await fetchCampaigns();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.resumeError'));
  }
}

async function cancelCampaign(id: string) {
  if (!confirm(t('campaigns.confirmCancel'))) return;

  try {
    await api.post(`/campaigns/campaigns/${id}/cancel`);
    await fetchCampaigns();
  } catch (error: any) {
    alert(error.response?.data?.error || t('campaigns.cancelError'));
  }
}

function handleCampaignSaved() {
  showCampaignModal.value = false;
  fetchCampaigns();
}

function handleSegmentSaved() {
  showSegmentModal.value = false;
  fetchSegments();
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    RUNNING: 'bg-green-100 text-green-700',
    PAUSED: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: t('campaigns.statuses.draft'),
    SCHEDULED: t('campaigns.statuses.scheduled'),
    RUNNING: t('campaigns.statuses.running'),
    PAUSED: t('campaigns.statuses.paused'),
    COMPLETED: t('campaigns.statuses.completed'),
    CANCELLED: t('campaigns.statuses.cancelled'),
  };
  return labels[status] || status;
}

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
    WHATSAPP_TEXT: 'WhatsApp',
    WHATSAPP_AUDIO: 'WhatsApp Audio',
    SMS: 'SMS',
    EMAIL: 'Email',
  };
  return labels[channel] || channel;
}

function getDeliveryRate(campaign: Campaign): number {
  if (campaign.targetCount === 0) return 0;
  return (campaign.deliveredCount / campaign.targetCount) * 100;
}

onMounted(() => {
  fetchCampaigns();
  fetchSegments();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('campaigns.title') }}</h1>
        <p class="text-gray-600">{{ t('campaigns.subtitle') }}</p>
      </div>
      <div class="flex gap-3">
        <button
          class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          @click="openCreateSegment"
        >
          {{ t('campaigns.createSegment') }}
        </button>
        <button
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          @click="openCreateCampaign"
        >
          {{ t('campaigns.createCampaign') }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex gap-6">
        <button
          v-for="tab in (['campaigns', 'segments'] as TabType[])"
          :key="tab"
          :class="[
            'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
            activeTab === tab
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
          @click="activeTab = tab"
        >
          {{ t(`campaigns.tabs.${tab}`) }}
        </button>
      </nav>
    </div>

    <!-- Campaigns Tab -->
    <div v-if="activeTab === 'campaigns'">
      <!-- Status Filter -->
      <div class="flex gap-2 mb-4">
        <button
          v-for="status in ['all', 'DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const"
          :key="status"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            statusFilter === status
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          ]"
          @click="statusFilter = status; fetchCampaigns()"
        >
          {{ status === 'all' ? t('common.all') : getStatusLabel(status) }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loadingCampaigns" class="animate-pulse space-y-4">
        <div class="h-24 bg-gray-200 rounded-lg"></div>
        <div class="h-24 bg-gray-200 rounded-lg"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="campaigns.length === 0" class="text-center py-12 text-gray-500">
        {{ t('campaigns.noCampaigns') }}
      </div>

      <!-- Campaign List -->
      <div v-else class="space-y-4">
        <div
          v-for="campaign in campaigns"
          :key="campaign.id"
          class="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="font-semibold text-gray-900">{{ campaign.name }}</h3>
                <span :class="['px-2 py-0.5 text-xs rounded-full', getStatusClass(campaign.status)]">
                  {{ getStatusLabel(campaign.status) }}
                </span>
                <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {{ getTypeLabel(campaign.type) }}
                </span>
                <span class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                  {{ getChannelLabel(campaign.channel) }}
                </span>
              </div>
              <p v-if="campaign.description" class="text-sm text-gray-600 mb-2">
                {{ campaign.description }}
              </p>
              <div class="flex items-center gap-6 text-sm text-gray-500">
                <span v-if="campaign.segment">
                  {{ t('campaigns.segment') }}: {{ campaign.segment.name }}
                </span>
                <span>{{ t('campaigns.target') }}: {{ campaign.targetCount }}</span>
                <span v-if="campaign.scheduledFor">
                  {{ t('campaigns.scheduledFor') }}: {{ d(new Date(campaign.scheduledFor), 'short') }}
                </span>
              </div>

              <!-- Progress Bar (for running/completed campaigns) -->
              <div v-if="campaign.status === 'RUNNING' || campaign.status === 'COMPLETED'" class="mt-3">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{{ t('campaigns.progress') }}</span>
                  <span>{{ campaign.sentCount }} / {{ campaign.targetCount }} ({{ getDeliveryRate(campaign).toFixed(0) }}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all"
                    :style="{ width: `${getDeliveryRate(campaign)}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <template v-if="campaign.status === 'DRAFT'">
                <button
                  class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  @click="startCampaign(campaign.id)"
                >
                  {{ t('campaigns.start') }}
                </button>
                <button
                  class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  @click="openEditCampaign(campaign)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  @click="deleteCampaign(campaign.id)"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </template>
              <template v-else-if="campaign.status === 'RUNNING'">
                <button
                  class="px-3 py-1.5 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                  @click="pauseCampaign(campaign.id)"
                >
                  {{ t('campaigns.pause') }}
                </button>
                <button
                  class="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  @click="cancelCampaign(campaign.id)"
                >
                  {{ t('campaigns.cancel') }}
                </button>
              </template>
              <template v-else-if="campaign.status === 'PAUSED'">
                <button
                  class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  @click="resumeCampaign(campaign.id)"
                >
                  {{ t('campaigns.resume') }}
                </button>
                <button
                  class="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  @click="cancelCampaign(campaign.id)"
                >
                  {{ t('campaigns.cancel') }}
                </button>
              </template>
              <template v-else-if="campaign.status === 'SCHEDULED'">
                <button
                  class="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  @click="startCampaign(campaign.id)"
                >
                  {{ t('campaigns.startNow') }}
                </button>
                <button
                  class="px-3 py-1.5 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  @click="cancelCampaign(campaign.id)"
                >
                  {{ t('campaigns.cancel') }}
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Segments Tab -->
    <div v-else-if="activeTab === 'segments'">
      <!-- Loading -->
      <div v-if="loadingSegments" class="animate-pulse space-y-4">
        <div class="h-20 bg-gray-200 rounded-lg"></div>
        <div class="h-20 bg-gray-200 rounded-lg"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="segments.length === 0" class="text-center py-12 text-gray-500">
        {{ t('campaigns.noSegments') }}
      </div>

      <!-- Segment List -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="segment in segments"
          :key="segment.id"
          class="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-start justify-between mb-2">
            <div>
              <h3 class="font-semibold text-gray-900">{{ segment.name }}</h3>
              <p v-if="segment.description" class="text-sm text-gray-600">
                {{ segment.description }}
              </p>
            </div>
            <div class="flex gap-1">
              <button
                class="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                @click="openEditSegment(segment)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                @click="deleteSegment(segment.id)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-primary">
              {{ segment.patientCount ?? 0 }}
            </span>
            <span class="text-sm text-gray-500">{{ t('campaigns.patients') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Campaign Form Modal -->
    <CampaignFormModal
      v-if="showCampaignModal"
      :campaign="selectedCampaign"
      :segments="segments"
      @close="showCampaignModal = false"
      @saved="handleCampaignSaved"
    />

    <!-- Segment Builder Modal -->
    <SegmentBuilder
      v-if="showSegmentModal"
      :segment="selectedSegment"
      @close="showSegmentModal = false"
      @saved="handleSegmentSaved"
    />
  </div>
</template>

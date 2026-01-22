<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const { t, d } = useI18n();

interface TicketMessage {
  id: string;
  content: string;
  isStaff: boolean;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  responseCount: number;
  lastResponseAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  messages: TicketMessage[];
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: number | null;
}

const tickets = ref<Ticket[]>([]);
const selectedTicket = ref<Ticket | null>(null);
const stats = ref<Stats | null>(null);
const loading = ref(false);
const statusFilter = ref<string>('');

// Modal state
const showNewTicketModal = ref(false);
const showTicketModal = ref(false);
const saving = ref(false);
const sendingMessage = ref(false);

// New ticket form
const newTicketForm = ref({
  subject: '',
  description: '',
  category: 'FAQ',
  priority: 'MEDIUM',
});

// New message
const newMessage = ref('');

const categories = [
  { value: 'GETTING_STARTED', label: t('help.categories.GETTING_STARTED') },
  { value: 'PATIENTS', label: t('help.categories.PATIENTS') },
  { value: 'SCHEDULING', label: t('help.categories.SCHEDULING') },
  { value: 'FINANCIAL', label: t('help.categories.FINANCIAL') },
  { value: 'CLINICAL', label: t('help.categories.CLINICAL') },
  { value: 'SETTINGS', label: t('help.categories.SETTINGS') },
  { value: 'FAQ', label: t('help.categories.FAQ') },
];

const priorities = [
  { value: 'LOW', label: t('support.priority.LOW') },
  { value: 'MEDIUM', label: t('support.priority.MEDIUM') },
  { value: 'HIGH', label: t('support.priority.HIGH') },
  { value: 'URGENT', label: t('support.priority.URGENT') },
];

const statuses = [
  { value: '', label: t('common.all') },
  { value: 'OPEN', label: t('support.status.OPEN') },
  { value: 'IN_PROGRESS', label: t('support.status.IN_PROGRESS') },
  { value: 'WAITING_RESPONSE', label: t('support.status.WAITING_RESPONSE') },
  { value: 'RESOLVED', label: t('support.status.RESOLVED') },
  { value: 'CLOSED', label: t('support.status.CLOSED') },
];

const filteredTickets = computed(() => {
  if (!statusFilter.value) return tickets.value;
  return tickets.value.filter((t) => t.status === statusFilter.value);
});

async function fetchTickets() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.append('mine', 'true');
    if (statusFilter.value) params.append('status', statusFilter.value);

    const response = await api.get(`/support/tickets?${params}`);
    tickets.value = response.data.tickets;
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchStats() {
  try {
    const response = await api.get('/support/tickets/stats');
    stats.value = response.data.stats;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
}

function openNewTicket() {
  newTicketForm.value = {
    subject: '',
    description: '',
    category: 'FAQ',
    priority: 'MEDIUM',
  };
  showNewTicketModal.value = true;
}

async function createTicket() {
  saving.value = true;
  try {
    await api.post('/support/tickets', newTicketForm.value);
    showNewTicketModal.value = false;
    fetchTickets();
    fetchStats();
  } catch (error) {
    console.error('Failed to create ticket:', error);
  } finally {
    saving.value = false;
  }
}

async function viewTicket(ticket: Ticket) {
  try {
    const response = await api.get(`/support/tickets/${ticket.id}`);
    selectedTicket.value = response.data.ticket;
    showTicketModal.value = true;
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
  }
}

async function sendMessage() {
  if (!selectedTicket.value || !newMessage.value.trim()) return;

  sendingMessage.value = true;
  try {
    const response = await api.post(`/support/tickets/${selectedTicket.value.id}/messages`, {
      content: newMessage.value,
    });
    selectedTicket.value = response.data.ticket;
    newMessage.value = '';
    fetchTickets();
  } catch (error) {
    console.error('Failed to send message:', error);
  } finally {
    sendingMessage.value = false;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    case 'WAITING_RESPONSE':
      return 'bg-purple-100 text-purple-800';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'LOW':
      return 'text-gray-600';
    case 'MEDIUM':
      return 'text-yellow-600';
    case 'HIGH':
      return 'text-orange-600';
    case 'URGENT':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

onMounted(() => {
  fetchTickets();
  fetchStats();
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('support.title') }}</h1>
        <p class="text-gray-500">{{ t('support.subtitle') }}</p>
      </div>
      <button
        @click="openNewTicket"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        {{ t('support.newTicket') }}
      </button>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-sm text-gray-500">{{ t('support.stats.total') }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="bg-white rounded-lg border border-blue-200 p-4">
        <p class="text-sm text-blue-600">{{ t('support.stats.open') }}</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats.open }}</p>
      </div>
      <div class="bg-white rounded-lg border border-yellow-200 p-4">
        <p class="text-sm text-yellow-600">{{ t('support.stats.inProgress') }}</p>
        <p class="text-2xl font-bold text-yellow-600">{{ stats.inProgress }}</p>
      </div>
      <div class="bg-white rounded-lg border border-green-200 p-4">
        <p class="text-sm text-green-600">{{ t('support.stats.resolved') }}</p>
        <p class="text-2xl font-bold text-green-600">{{ stats.resolved }}</p>
      </div>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <select
        v-model="statusFilter"
        @change="fetchTickets"
        class="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option v-for="status in statuses" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <!-- Tickets List -->
    <div v-if="loading" class="text-center py-8 text-gray-500">{{ t('common.loading') }}</div>
    <div v-else-if="filteredTickets.length === 0" class="text-center py-8 text-gray-500">
      {{ t('support.noTickets') }}
    </div>
    <div v-else class="space-y-4">
      <div
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        @click="viewTicket(ticket)"
        class="bg-white rounded-lg border border-gray-200 p-4 hover:border-primary cursor-pointer transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-gray-900">{{ ticket.subject }}</h3>
              <span
                :class="[
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  getStatusColor(ticket.status),
                ]"
              >
                {{ t(`support.status.${ticket.status}`) }}
              </span>
            </div>
            <p class="text-sm text-gray-500 line-clamp-1">{{ ticket.description }}</p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{{ t(`help.categories.${ticket.category}`) }}</span>
              <span :class="getPriorityColor(ticket.priority)">
                {{ t(`support.priority.${ticket.priority}`) }}
              </span>
              <span>{{ d(new Date(ticket.createdAt), 'short') }}</span>
              <span v-if="ticket.responseCount > 0">
                {{ ticket.responseCount }} {{ t('support.messages') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Ticket Modal -->
    <Modal :open="showNewTicketModal" :title="t('support.newTicket')" @close="showNewTicketModal = false">
      <form @submit.prevent="createTicket" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('support.subject') }} *</label>
          <input
            v-model="newTicketForm.subject"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('support.category') }}</label>
            <select
              v-model="newTicketForm.category"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('support.priorityLabel') }}</label>
            <select
              v-model="newTicketForm.priority"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="p in priorities" :key="p.value" :value="p.value">
                {{ p.label }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('support.description') }} *</label>
          <textarea
            v-model="newTicketForm.description"
            rows="4"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showNewTicketModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="createTicket"
            :disabled="saving || !newTicketForm.subject || !newTicketForm.description"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? t('common.loading') : t('support.createTicket') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- View Ticket Modal -->
    <Modal
      :open="showTicketModal"
      :title="selectedTicket?.subject || ''"
      @close="showTicketModal = false"
      size="lg"
    >
      <div v-if="selectedTicket" class="space-y-4">
        <!-- Ticket Info -->
        <div class="bg-gray-50 rounded-lg p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span
              :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusColor(selectedTicket.status)]"
            >
              {{ t(`support.status.${selectedTicket.status}`) }}
            </span>
            <span class="text-sm text-gray-500">
              {{ d(new Date(selectedTicket.createdAt), 'long') }}
            </span>
          </div>
          <p class="text-gray-700">{{ selectedTicket.description }}</p>
          <div class="flex gap-4 text-xs text-gray-500">
            <span>{{ t(`help.categories.${selectedTicket.category}`) }}</span>
            <span :class="getPriorityColor(selectedTicket.priority)">
              {{ t(`support.priority.${selectedTicket.priority}`) }}
            </span>
          </div>
        </div>

        <!-- Messages -->
        <div class="space-y-3 max-h-64 overflow-y-auto">
          <div
            v-for="message in selectedTicket.messages"
            :key="message.id"
            :class="[
              'p-3 rounded-lg',
              message.isStaff ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4',
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-medium" :class="message.isStaff ? 'text-blue-700' : 'text-gray-700'">
                {{ message.isStaff ? t('support.supportTeam') : message.user?.name }}
              </span>
              <span class="text-xs text-gray-500">
                {{ d(new Date(message.createdAt), 'short') }}
              </span>
            </div>
            <p class="text-sm text-gray-600">{{ message.content }}</p>
          </div>
        </div>

        <!-- New Message -->
        <div v-if="!['RESOLVED', 'CLOSED'].includes(selectedTicket.status)" class="space-y-2">
          <textarea
            v-model="newMessage"
            rows="2"
            :placeholder="t('support.writeMessage')"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          ></textarea>
          <button
            @click="sendMessage"
            :disabled="sendingMessage || !newMessage.trim()"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ sendingMessage ? t('common.loading') : t('support.sendMessage') }}
          </button>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <button
            @click="showTicketModal = false"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const { t, d } = useI18n();

interface ComplianceDocument {
  id: string;
  name: string;
  description?: string;
  category: string;
  documentNumber?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  issueDate?: string;
  expirationDate?: string;
  status: string;
  professionalId?: string;
  professional?: { id: string; name: string };
  notes?: string;
  uploadedAt: string;
}

interface Dashboard {
  total: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  pendingRenewal: number;
  byCategory: { category: string; count: number }[];
}

const documents = ref<ComplianceDocument[]>([]);
const dashboard = ref<Dashboard | null>(null);
const loading = ref(false);
const loadingDashboard = ref(false);

// Filters
const categoryFilter = ref<string>('');
const statusFilter = ref<string>('');

// Modal state
const showUploadModal = ref(false);
const showViewModal = ref(false);
const selectedDocument = ref<ComplianceDocument | null>(null);
const uploading = ref(false);

// Upload form
const uploadForm = ref({
  name: '',
  description: '',
  category: 'LICENSE',
  documentNumber: '',
  issueDate: '',
  expirationDate: '',
  professionalId: '',
  notes: '',
  file: null as File | null,
});

const professionals = ref<{ id: string; name: string }[]>([]);

const categories = [
  { value: 'LICENSE', label: t('compliance.categories.LICENSE') },
  { value: 'CERTIFICATE', label: t('compliance.categories.CERTIFICATE') },
  { value: 'INSURANCE', label: t('compliance.categories.INSURANCE') },
  { value: 'EQUIPMENT', label: t('compliance.categories.EQUIPMENT') },
  { value: 'FACILITY', label: t('compliance.categories.FACILITY') },
  { value: 'CONTRACT', label: t('compliance.categories.CONTRACT') },
  { value: 'OTHER', label: t('compliance.categories.OTHER') },
];

const statuses = [
  { value: '', label: t('common.all') },
  { value: 'VALID', label: t('compliance.status.VALID') },
  { value: 'EXPIRING_SOON', label: t('compliance.status.EXPIRING_SOON') },
  { value: 'EXPIRED', label: t('compliance.status.EXPIRED') },
  { value: 'PENDING_RENEWAL', label: t('compliance.status.PENDING_RENEWAL') },
];

const filteredDocuments = computed(() => {
  let result = documents.value;
  if (categoryFilter.value) {
    result = result.filter((d) => d.category === categoryFilter.value);
  }
  if (statusFilter.value) {
    result = result.filter((d) => d.status === statusFilter.value);
  }
  return result;
});

async function fetchDashboard() {
  loadingDashboard.value = true;
  try {
    const response = await api.get('/compliance/dashboard');
    dashboard.value = response.data.dashboard;
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
  } finally {
    loadingDashboard.value = false;
  }
}

async function fetchDocuments() {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (categoryFilter.value) params.append('category', categoryFilter.value);
    if (statusFilter.value) params.append('status', statusFilter.value);
    const response = await api.get(`/compliance/documents?${params}`);
    documents.value = response.data.documents;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchProfessionals() {
  try {
    const response = await api.get('/staff');
    professionals.value = response.data.staff.map((s: any) => ({ id: s.id, name: s.name }));
  } catch (error) {
    console.error('Failed to fetch professionals:', error);
  }
}

function openUploadModal() {
  uploadForm.value = {
    name: '',
    description: '',
    category: 'LICENSE',
    documentNumber: '',
    issueDate: '',
    expirationDate: '',
    professionalId: '',
    notes: '',
    file: null,
  };
  showUploadModal.value = true;
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadForm.value.file = target.files[0];
  }
}

async function uploadDocument() {
  if (!uploadForm.value.file || !uploadForm.value.name) return;

  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', uploadForm.value.file);
    formData.append('name', uploadForm.value.name);
    if (uploadForm.value.description) formData.append('description', uploadForm.value.description);
    formData.append('category', uploadForm.value.category);
    if (uploadForm.value.documentNumber)
      formData.append('documentNumber', uploadForm.value.documentNumber);
    if (uploadForm.value.issueDate) formData.append('issueDate', uploadForm.value.issueDate);
    if (uploadForm.value.expirationDate)
      formData.append('expirationDate', uploadForm.value.expirationDate);
    if (uploadForm.value.professionalId)
      formData.append('professionalId', uploadForm.value.professionalId);
    if (uploadForm.value.notes) formData.append('notes', uploadForm.value.notes);

    await api.post('/compliance/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    showUploadModal.value = false;
    fetchDocuments();
    fetchDashboard();
  } catch (error) {
    console.error('Failed to upload document:', error);
  } finally {
    uploading.value = false;
  }
}

function viewDocument(doc: ComplianceDocument) {
  selectedDocument.value = doc;
  showViewModal.value = true;
}

async function downloadDocument(doc: ComplianceDocument) {
  window.open(doc.fileUrl, '_blank');
}

async function deleteDocument(doc: ComplianceDocument) {
  if (!confirm(t('compliance.confirmDelete'))) return;

  try {
    await api.delete(`/compliance/documents/${doc.id}`);
    fetchDocuments();
    fetchDashboard();
    if (showViewModal.value) {
      showViewModal.value = false;
    }
  } catch (error) {
    console.error('Failed to delete document:', error);
  }
}

async function markRenewalStarted(doc: ComplianceDocument) {
  try {
    await api.post(`/compliance/documents/${doc.id}/renew`);
    fetchDocuments();
    fetchDashboard();
  } catch (error) {
    console.error('Failed to mark renewal:', error);
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'VALID':
      return 'bg-green-100 text-green-800';
    case 'EXPIRING_SOON':
      return 'bg-yellow-100 text-yellow-800';
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'PENDING_RENEWAL':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

onMounted(() => {
  fetchDashboard();
  fetchDocuments();
  fetchProfessionals();
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('compliance.title') }}</h1>
      <button
        @click="openUploadModal"
        class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        {{ t('compliance.uploadDocument') }}
      </button>
    </div>

    <!-- Dashboard Cards -->
    <div v-if="dashboard" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <p class="text-sm text-gray-500">{{ t('compliance.dashboard.total') }}</p>
        <p class="text-2xl font-bold text-gray-900">{{ dashboard.total }}</p>
      </div>
      <div class="bg-white rounded-lg border border-green-200 p-4">
        <p class="text-sm text-green-600">{{ t('compliance.dashboard.valid') }}</p>
        <p class="text-2xl font-bold text-green-600">{{ dashboard.valid }}</p>
      </div>
      <div class="bg-white rounded-lg border border-yellow-200 p-4">
        <p class="text-sm text-yellow-600">{{ t('compliance.dashboard.expiringSoon') }}</p>
        <p class="text-2xl font-bold text-yellow-600">{{ dashboard.expiringSoon }}</p>
      </div>
      <div class="bg-white rounded-lg border border-red-200 p-4">
        <p class="text-sm text-red-600">{{ t('compliance.dashboard.expired') }}</p>
        <p class="text-2xl font-bold text-red-600">{{ dashboard.expired }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <select
        v-model="categoryFilter"
        @change="fetchDocuments"
        class="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{{ t('compliance.allCategories') }}</option>
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">
          {{ cat.label }}
        </option>
      </select>

      <select
        v-model="statusFilter"
        @change="fetchDocuments"
        class="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option v-for="status in statuses" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <!-- Documents List -->
    <div v-if="loading" class="text-center py-8 text-gray-500">{{ t('common.loading') }}</div>
    <div v-else-if="filteredDocuments.length === 0" class="text-center py-8 text-gray-500">
      {{ t('compliance.noDocuments') }}
    </div>
    <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {{ t('compliance.document') }}
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              {{ t('compliance.category') }}
            </th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              {{ t('compliance.expirationDate') }}
            </th>
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="doc in filteredDocuments" :key="doc.id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{{ doc.name }}</p>
              <p v-if="doc.documentNumber" class="text-xs text-gray-500">
                {{ doc.documentNumber }}
              </p>
              <p v-if="doc.professional" class="text-xs text-gray-500">
                {{ doc.professional.name }}
              </p>
            </td>
            <td class="px-4 py-3 text-gray-600">
              {{ t(`compliance.categories.${doc.category}`) }}
            </td>
            <td class="px-4 py-3 text-center text-gray-600">
              {{ doc.expirationDate ? d(new Date(doc.expirationDate), 'short') : '-' }}
            </td>
            <td class="px-4 py-3 text-center">
              <span
                :class="['px-2 py-1 text-xs font-medium rounded-full', getStatusColor(doc.status)]"
              >
                {{ t(`compliance.status.${doc.status}`) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="viewDocument(doc)"
                  class="text-sm text-primary hover:underline"
                >
                  {{ t('common.view') }}
                </button>
                <button
                  @click="downloadDocument(doc)"
                  class="text-sm text-gray-600 hover:underline"
                >
                  {{ t('common.download') }}
                </button>
                <button
                  v-if="doc.status === 'EXPIRING_SOON' || doc.status === 'EXPIRED'"
                  @click="markRenewalStarted(doc)"
                  class="text-sm text-blue-600 hover:underline"
                >
                  {{ t('compliance.startRenewal') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Upload Modal -->
    <Modal
      :open="showUploadModal"
      :title="t('compliance.uploadDocument')"
      @close="showUploadModal = false"
    >
      <form @submit.prevent="uploadDocument" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700"
            >{{ t('compliance.file') }} *</label
          >
          <input
            type="file"
            @change="handleFileChange"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700"
            >{{ t('compliance.name') }} *</label
          >
          <input
            v-model="uploadForm.name"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{
            t('compliance.description')
          }}</label>
          <textarea
            v-model="uploadForm.description"
            rows="2"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >{{ t('compliance.category') }} *</label
            >
            <select
              v-model="uploadForm.category"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="cat in categories" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{
              t('compliance.documentNumber')
            }}</label>
            <input
              v-model="uploadForm.documentNumber"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{
              t('compliance.issueDate')
            }}</label>
            <input
              v-model="uploadForm.issueDate"
              type="date"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{
              t('compliance.expirationDate')
            }}</label>
            <input
              v-model="uploadForm.expirationDate"
              type="date"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{
            t('compliance.professional')
          }}</label>
          <select
            v-model="uploadForm.professionalId"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">{{ t('compliance.clinicDocument') }}</option>
            <option v-for="p in professionals" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{
            t('compliance.notes')
          }}</label>
          <textarea
            v-model="uploadForm.notes"
            rows="2"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          ></textarea>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showUploadModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="uploadDocument"
            :disabled="uploading || !uploadForm.file || !uploadForm.name"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ uploading ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- View Document Modal -->
    <Modal
      :open="showViewModal"
      :title="selectedDocument?.name || ''"
      @close="showViewModal = false"
    >
      <div v-if="selectedDocument" class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4 space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.category') }}</span>
            <span class="text-sm font-medium">{{
              t(`compliance.categories.${selectedDocument.category}`)
            }}</span>
          </div>
          <div v-if="selectedDocument.documentNumber" class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.documentNumber') }}</span>
            <span class="text-sm font-medium">{{ selectedDocument.documentNumber }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Status</span>
            <span
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                getStatusColor(selectedDocument.status),
              ]"
            >
              {{ t(`compliance.status.${selectedDocument.status}`) }}
            </span>
          </div>
          <div v-if="selectedDocument.issueDate" class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.issueDate') }}</span>
            <span class="text-sm font-medium">{{
              d(new Date(selectedDocument.issueDate), 'short')
            }}</span>
          </div>
          <div v-if="selectedDocument.expirationDate" class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.expirationDate') }}</span>
            <span class="text-sm font-medium">{{
              d(new Date(selectedDocument.expirationDate), 'short')
            }}</span>
          </div>
          <div v-if="selectedDocument.professional" class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.professional') }}</span>
            <span class="text-sm font-medium">{{ selectedDocument.professional.name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">{{ t('compliance.fileSize') }}</span>
            <span class="text-sm font-medium">{{
              formatFileSize(selectedDocument.fileSize)
            }}</span>
          </div>
        </div>

        <div v-if="selectedDocument.description" class="space-y-1">
          <p class="text-sm text-gray-500">{{ t('compliance.description') }}</p>
          <p class="text-sm text-gray-900">{{ selectedDocument.description }}</p>
        </div>

        <div v-if="selectedDocument.notes" class="space-y-1">
          <p class="text-sm text-gray-500">{{ t('compliance.notes') }}</p>
          <p class="text-sm text-gray-900">{{ selectedDocument.notes }}</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <button
            @click="deleteDocument(selectedDocument!)"
            class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            {{ t('common.delete') }}
          </button>
          <div class="flex gap-2">
            <button
              @click="downloadDocument(selectedDocument!)"
              class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {{ t('common.download') }}
            </button>
            <button
              @click="showViewModal = false"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

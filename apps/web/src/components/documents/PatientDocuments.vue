<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const props = defineProps<{
  patientId: string;
  patientName: string;
}>();

const { t, d } = useI18n();

interface DocumentTemplate {
  id: string;
  type: string;
  name: string;
  content: string;
  isDefault: boolean;
}

interface PatientDocument {
  id: string;
  type: string;
  title: string;
  content: Record<string, any>;
  medications?: Medication[];
  pdfUrl?: string;
  signedAt?: string;
  signerName?: string;
  createdAt: string;
  template: { name: string; type: string };
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const documents = ref<PatientDocument[]>([]);
const templates = ref<DocumentTemplate[]>([]);
const loading = ref(true);
const showGenerateModal = ref(false);
const showPreviewModal = ref(false);
const generating = ref(false);
const selectedDocument = ref<PatientDocument | null>(null);

// Generate document form
const generateForm = ref({
  templateId: '',
  title: '',
  customContent: '',
  medications: [] as Medication[],
});

const selectedTemplate = computed(() => {
  return templates.value.find(t => t.id === generateForm.value.templateId);
});

const documentTypes = [
  { value: 'PRESCRIPTION', label: t('documents.prescription') },
  { value: 'CERTIFICATE', label: t('documents.certificate') },
  { value: 'REFERRAL', label: t('documents.referral') },
  { value: 'CONSENT', label: t('documents.consent') },
  { value: 'REPORT', label: t('documents.report') },
  { value: 'OTHER', label: t('documents.other') },
];

function getTypeLabel(type: string): string {
  const item = documentTypes.find(dt => dt.value === type);
  return item?.label || type;
}

async function fetchDocuments() {
  loading.value = true;
  try {
    const response = await api.get(`/documents/patients/${props.patientId}`);
    documents.value = response.data.documents;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchTemplates() {
  try {
    const response = await api.get('/documents/templates');
    templates.value = response.data.templates;
  } catch (error) {
    console.error('Failed to fetch templates:', error);
  }
}

function openGenerateModal() {
  generateForm.value = {
    templateId: '',
    title: '',
    customContent: '',
    medications: [],
  };
  showGenerateModal.value = true;
}

function addMedication() {
  generateForm.value.medications.push({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  });
}

function removeMedication(index: number) {
  generateForm.value.medications.splice(index, 1);
}

async function generateDocument() {
  if (!generateForm.value.templateId) return;

  generating.value = true;
  try {
    const template = selectedTemplate.value;

    await api.post(`/documents/patients/${props.patientId}`, {
      templateId: generateForm.value.templateId,
      title: generateForm.value.title || template?.name,
      content: {
        customContent: generateForm.value.customContent,
        patientName: props.patientName,
        generatedAt: new Date().toISOString(),
      },
      medications: generateForm.value.medications.length > 0
        ? generateForm.value.medications
        : undefined,
    });

    showGenerateModal.value = false;
    await fetchDocuments();
  } catch (error) {
    console.error('Failed to generate document:', error);
  } finally {
    generating.value = false;
  }
}

function openPreview(doc: PatientDocument) {
  selectedDocument.value = doc;
  showPreviewModal.value = true;
}

function printDocument() {
  // Open print dialog for the preview
  window.print();
}

const generatingPdf = ref(false);

async function downloadPdf() {
  if (!selectedDocument.value) return;

  generatingPdf.value = true;

  try {
    // Get the preview content element
    const element = document.getElementById('document-preview-content');
    if (!element) {
      throw new Error('Preview content not found');
    }

    // Create canvas from the HTML element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    // Add image to first page
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download the PDF with explicit blob handling
    const filename = `${selectedDocument.value.type.toLowerCase()}_${props.patientName.replace(/\s+/g, '_')}.pdf`;
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.type = 'application/pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    alert('Erro ao gerar PDF');
  } finally {
    generatingPdf.value = false;
  }
}

async function deleteDocument(id: string) {
  if (!confirm('Tem certeza que deseja excluir este documento?')) return;

  try {
    await api.delete(`/documents/${id}`);
    await fetchDocuments();
    showPreviewModal.value = false;
  } catch (error: any) {
    alert(error.response?.data?.error || 'Erro ao excluir documento');
  }
}

onMounted(() => {
  fetchDocuments();
  fetchTemplates();
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ t('documents.title') }}</h3>
      <button
        class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        @click="openGenerateModal"
      >
        {{ t('documents.newDocument') }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="documents.length === 0" class="text-center py-8 text-gray-500">
      {{ t('documents.noDocuments') }}
    </div>

    <!-- Documents List -->
    <div v-else class="space-y-3">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary cursor-pointer transition-colors"
        @click="openPreview(doc)"
      >
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p class="font-medium text-gray-900">{{ doc.title }}</p>
            <p class="text-sm text-gray-500">
              {{ getTypeLabel(doc.type) }} - {{ d(new Date(doc.createdAt), 'short') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="doc.signedAt"
            class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700"
          >
            {{ t('documents.signed') }}
          </span>
          <span
            v-else
            class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700"
          >
            {{ t('documents.unsigned') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Generate Document Modal -->
    <Modal
      :open="showGenerateModal"
      :title="t('documents.newDocument')"
      size="lg"
      @close="showGenerateModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('documents.selectTemplate') }} <span class="text-destructive">*</span>
          </label>
          <select
            v-model="generateForm.templateId"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="">{{ t('documents.selectTemplate') }}...</option>
            <optgroup
              v-for="type in documentTypes"
              :key="type.value"
              :label="type.label"
            >
              <option
                v-for="template in templates.filter(t => t.type === type.value)"
                :key="template.id"
                :value="template.id"
              >
                {{ template.name }} {{ template.isDefault ? '(Padrão)' : '' }}
              </option>
            </optgroup>
          </select>
        </div>

        <div v-if="selectedTemplate">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('documents.documentTitle') }}
            </label>
            <input
              v-model="generateForm.title"
              type="text"
              :placeholder="selectedTemplate.name"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <!-- Prescription specific: Medications -->
          <div v-if="selectedTemplate.type === 'PRESCRIPTION'" class="mt-4">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700">
                {{ t('documents.medications') }}
              </label>
              <button
                type="button"
                class="text-sm text-primary hover:underline"
                @click="addMedication"
              >
                {{ t('documents.addMedication') }}
              </button>
            </div>

            <div v-if="generateForm.medications.length === 0" class="text-sm text-gray-500 py-2">
              {{ t('documents.addMedication') }} para incluir na receita
            </div>

            <div
              v-for="(med, index) in generateForm.medications"
              :key="index"
              class="p-3 bg-gray-50 rounded-lg mb-3"
            >
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium">Medicamento {{ index + 1 }}</span>
                <button
                  type="button"
                  class="text-destructive text-sm hover:underline"
                  @click="removeMedication(index)"
                >
                  Remover
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <input
                    v-model="med.name"
                    type="text"
                    placeholder="Nome do medicamento"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="med.dosage"
                    type="text"
                    placeholder="Dosagem (ex: 500mg)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="med.frequency"
                    type="text"
                    placeholder="Frequência (ex: 8/8h)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <input
                    v-model="med.duration"
                    type="text"
                    placeholder="Duração (ex: 7 dias)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div class="col-span-2">
                  <input
                    v-model="med.instructions"
                    type="text"
                    placeholder="Instruções adicionais"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Custom content for other types -->
          <div v-else class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('documents.templateContent') }}
            </label>
            <textarea
              v-model="generateForm.customContent"
              rows="6"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Conteúdo adicional do documento..."
            />
          </div>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
          @click="showGenerateModal = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          :disabled="!generateForm.templateId || generating"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          @click="generateDocument"
        >
          {{ generating ? t('common.loading') : t('documents.generate') }}
        </button>
      </template>
    </Modal>

    <!-- Preview Modal -->
    <Modal
      :open="showPreviewModal"
      :title="selectedDocument?.title || ''"
      size="lg"
      @close="showPreviewModal = false"
    >
      <div v-if="selectedDocument" class="space-y-4">
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>{{ getTypeLabel(selectedDocument.type) }}</span>
          <span>{{ d(new Date(selectedDocument.createdAt), 'long') }}</span>
        </div>

        <!-- Document Content Preview -->
        <div id="document-preview-content" class="border border-gray-200 rounded-lg p-6 bg-white min-h-[300px]">
          <div class="text-center mb-6">
            <h2 class="text-xl font-bold">{{ selectedDocument.title }}</h2>
            <p class="text-gray-500">{{ props.patientName }}</p>
          </div>

          <!-- Prescription medications -->
          <div v-if="selectedDocument.type === 'PRESCRIPTION' && selectedDocument.medications?.length">
            <div
              v-for="(med, index) in selectedDocument.medications"
              :key="index"
              class="mb-4 p-3 bg-gray-50 rounded"
            >
              <p class="font-medium">{{ index + 1 }}. {{ med.name }} - {{ med.dosage }}</p>
              <p class="text-sm text-gray-600">
                Tomar {{ med.frequency }} por {{ med.duration }}
              </p>
              <p v-if="med.instructions" class="text-sm text-gray-500 mt-1">
                {{ med.instructions }}
              </p>
            </div>
          </div>

          <!-- Custom content -->
          <div v-else-if="(selectedDocument.content as any)?.customContent" class="whitespace-pre-wrap">
            {{ (selectedDocument.content as any).customContent }}
          </div>

          <!-- Signature section -->
          <div v-if="selectedDocument.signedAt" class="mt-8 pt-4 border-t border-gray-200">
            <p class="text-sm text-gray-500">
              {{ t('documents.signedAt') }}: {{ d(new Date(selectedDocument.signedAt), 'long') }}
            </p>
            <p class="text-sm text-gray-500">
              {{ t('documents.signerName') }}: {{ selectedDocument.signerName }}
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <button
            v-if="!selectedDocument?.signedAt"
            class="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
            @click="deleteDocument(selectedDocument!.id)"
          >
            {{ t('common.delete') }}
          </button>
          <div class="flex gap-2">
            <button
              :disabled="generatingPdf"
              class="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-50"
              @click="downloadPdf"
            >
              {{ generatingPdf ? t('common.loading') : t('documents.download') }}
            </button>
            <button
              class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              @click="printDocument"
            >
              {{ t('documents.print') }}
            </button>
            <button
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
              @click="showPreviewModal = false"
            >
              {{ t('common.close') }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

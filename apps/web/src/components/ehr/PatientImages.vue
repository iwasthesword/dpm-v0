<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const props = defineProps<{
  patientId: string;
}>();

const { t, d } = useI18n();

interface PatientImage {
  id: string;
  type: string;
  category?: string;
  url: string;
  tooth?: string;
  notes?: string;
  takenAt: string;
  createdAt: string;
}

const images = ref<PatientImage[]>([]);
const loading = ref(true);
const uploading = ref(false);
const selectedType = ref('');
const showUploadModal = ref(false);
const showImageModal = ref(false);
const selectedImage = ref<PatientImage | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Upload form data
const uploadData = ref({
  type: 'PHOTO',
  tooth: '',
  notes: '',
});

const imageTypes = [
  { value: 'PHOTO', label: t('patients.imageTypes.photo') },
  { value: 'XRAY', label: t('patients.imageTypes.xray') },
  { value: 'PANORAMIC', label: t('patients.imageTypes.panoramic') },
  { value: 'CT', label: t('patients.imageTypes.ct') },
  { value: 'DOCUMENT', label: t('patients.imageTypes.document') },
  { value: 'OTHER', label: t('patients.imageTypes.other') },
];

const filteredImages = computed(() => {
  if (!selectedType.value) return images.value;
  return images.value.filter(img => img.type === selectedType.value);
});

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    PHOTO: t('patients.imageTypes.photo'),
    XRAY: t('patients.imageTypes.xray'),
    PANORAMIC: t('patients.imageTypes.panoramic'),
    CT: t('patients.imageTypes.ct'),
    DOCUMENT: t('patients.imageTypes.document'),
    OTHER: t('patients.imageTypes.other'),
  };
  return typeMap[type] || type;
}

async function fetchImages() {
  loading.value = true;
  try {
    const response = await api.get(`/images/patients/${props.patientId}/images`);
    images.value = response.data.images;
  } catch (error) {
    console.error('Failed to fetch images:', error);
  } finally {
    loading.value = false;
  }
}

function openUploadModal() {
  uploadData.value = {
    type: 'PHOTO',
    tooth: '',
    notes: '',
  };
  showUploadModal.value = true;
}

function triggerFileSelect() {
  fileInput.value?.click();
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];
  await uploadImage(file);
  input.value = ''; // Reset input
}

async function uploadImage(file: File) {
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadData.value.type);
    if (uploadData.value.tooth) formData.append('tooth', uploadData.value.tooth);
    if (uploadData.value.notes) formData.append('notes', uploadData.value.notes);

    await api.post(`/images/patients/${props.patientId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    showUploadModal.value = false;
    await fetchImages();
  } catch (error) {
    console.error('Failed to upload image:', error);
  } finally {
    uploading.value = false;
  }
}

function openImage(image: PatientImage) {
  selectedImage.value = image;
  showImageModal.value = true;
}

async function deleteImage(imageId: string) {
  if (!confirm(t('patients.confirmDeleteImage'))) return;

  try {
    await api.delete(`/images/patients/${props.patientId}/images/${imageId}`);
    showImageModal.value = false;
    await fetchImages();
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}

onMounted(fetchImages);
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ t('patients.images') }}</h3>
      <div class="flex items-center gap-3">
        <select
          v-model="selectedType"
          class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
        >
          <option value="">{{ t('common.all') }}</option>
          <option v-for="type in imageTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
        <button
          class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
          @click="openUploadModal"
        >
          {{ t('patients.uploadImage') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="filteredImages.length === 0" class="text-center py-8 text-gray-500">
      {{ t('patients.noImages') }}
    </div>

    <!-- Image Grid -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="image in filteredImages"
        :key="image.id"
        class="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-primary transition-colors"
        @click="openImage(image)"
      >
        <div class="aspect-square bg-gray-100">
          <img
            v-if="!image.type.includes('DOCUMENT')"
            :src="image.url"
            :alt="image.notes || 'Patient image'"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center text-gray-400"
          >
            <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div class="p-2 bg-white">
          <p class="text-xs font-medium text-gray-900 truncate">
            {{ getTypeLabel(image.type) }}
            <span v-if="image.tooth" class="text-gray-500">- {{ t('treatments.tooth') }} {{ image.tooth }}</span>
          </p>
          <p class="text-xs text-gray-500">{{ d(new Date(image.createdAt), 'short') }}</p>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <Modal :open="showUploadModal" :title="t('patients.uploadImage')" @close="showUploadModal = false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('patients.selectImageType') }}
          </label>
          <select
            v-model="uploadData.type"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option v-for="type in imageTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('treatments.tooth') }} ({{ t('common.optional') }})
          </label>
          <input
            v-model="uploadData.tooth"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="21"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('common.notes') }} ({{ t('common.optional') }})
          </label>
          <textarea
            v-model="uploadData.notes"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <!-- File Upload Area -->
        <div
          class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          @click="triggerFileSelect"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*,.pdf"
            class="hidden"
            @change="handleFileSelect"
          />
          <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="mt-2 text-sm text-gray-600">{{ t('patients.dragDropImage') }}</p>
          <p class="text-xs text-gray-400">JPG, PNG, PDF</p>
        </div>

        <div v-if="uploading" class="text-center text-primary">
          {{ t('common.loading') }}
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
          @click="showUploadModal = false"
        >
          {{ t('common.cancel') }}
        </button>
      </template>
    </Modal>

    <!-- Image View Modal -->
    <Modal
      :open="showImageModal"
      :title="selectedImage ? getTypeLabel(selectedImage.type) : ''"
      size="lg"
      @close="showImageModal = false"
    >
      <div v-if="selectedImage" class="space-y-4">
        <div class="bg-gray-100 rounded-lg overflow-hidden">
          <img
            v-if="!selectedImage.type.includes('DOCUMENT')"
            :src="selectedImage.url"
            :alt="selectedImage.notes || 'Patient image'"
            class="w-full max-h-96 object-contain"
          />
          <div
            v-else
            class="p-8 text-center"
          >
            <a
              :href="selectedImage.url"
              target="_blank"
              class="text-primary hover:underline"
            >
              {{ t('common.view') }} {{ t('patients.imageTypes.document') }}
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">{{ t('patients.selectImageType') }}:</span>
            <span class="ml-2 text-gray-900">{{ getTypeLabel(selectedImage.type) }}</span>
          </div>
          <div v-if="selectedImage.tooth">
            <span class="text-gray-500">{{ t('treatments.tooth') }}:</span>
            <span class="ml-2 text-gray-900">{{ selectedImage.tooth }}</span>
          </div>
          <div>
            <span class="text-gray-500">{{ t('common.date') }}:</span>
            <span class="ml-2 text-gray-900">{{ d(new Date(selectedImage.createdAt), 'long') }}</span>
          </div>
        </div>

        <div v-if="selectedImage.notes">
          <span class="text-sm text-gray-500">{{ t('common.notes') }}:</span>
          <p class="mt-1 text-gray-900">{{ selectedImage.notes }}</p>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 text-red-600 hover:text-red-700"
          @click="deleteImage(selectedImage!.id)"
        >
          {{ t('patients.deleteImage') }}
        </button>
        <button
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
          @click="showImageModal = false"
        >
          {{ t('common.close') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

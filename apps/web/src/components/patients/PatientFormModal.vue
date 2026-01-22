<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Modal from '@/components/ui/Modal.vue';
import api from '@/api/client';

interface Patient {
  id?: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  phoneSecondary?: string;
  email?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  tags?: string[];
  notes?: string;
  source?: string;
}

const props = defineProps<{
  open: boolean;
  patient?: Patient | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [patient: Patient];
}>();

const { t } = useI18n();

const isEditing = computed(() => !!props.patient?.id);
const title = computed(() => isEditing.value ? t('patients.editPatient') : t('patients.createPatient'));

const form = ref<Patient>({
  name: '',
  phone: '',
  cpf: '',
  email: '',
  birthDate: '',
  gender: undefined,
  phoneSecondary: '',
  notes: '',
  source: '',
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
  tags: [],
});

const loading = ref(false);
const error = ref('');
const activeTab = ref<'personal' | 'address' | 'additional'>('personal');
const newTag = ref('');

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    if (props.patient) {
      form.value = {
        ...props.patient,
        birthDate: props.patient.birthDate ? props.patient.birthDate.split('T')[0] : '',
        address: props.patient.address || {
          street: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: '',
        },
        tags: props.patient.tags || [],
      };
    } else {
      resetForm();
    }
    error.value = '';
    activeTab.value = 'personal';
  }
});

function resetForm() {
  form.value = {
    name: '',
    phone: '',
    cpf: '',
    email: '',
    birthDate: '',
    gender: undefined,
    phoneSecondary: '',
    notes: '',
    source: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
    tags: [],
  };
}

function addTag() {
  if (newTag.value.trim() && !form.value.tags?.includes(newTag.value.trim())) {
    form.value.tags = [...(form.value.tags || []), newTag.value.trim()];
    newTag.value = '';
  }
}

function removeTag(tag: string) {
  form.value.tags = form.value.tags?.filter(t => t !== tag) || [];
}

async function handleSubmit() {
  error.value = '';
  loading.value = true;

  try {
    const payload: any = {
      name: form.value.name,
      phone: form.value.phone,
    };

    // Only include optional fields if they have values
    if (form.value.cpf) payload.cpf = form.value.cpf;
    if (form.value.email) payload.email = form.value.email;
    if (form.value.birthDate) payload.birthDate = new Date(form.value.birthDate).toISOString();
    if (form.value.gender) payload.gender = form.value.gender;
    if (form.value.phoneSecondary) payload.phoneSecondary = form.value.phoneSecondary;
    if (form.value.notes) payload.notes = form.value.notes;
    if (form.value.source) payload.source = form.value.source;
    if (form.value.tags?.length) payload.tags = form.value.tags;

    // Include address if any field is filled
    const address = form.value.address;
    if (address && Object.values(address).some(v => v)) {
      payload.address = address;
    }

    let response;
    if (isEditing.value) {
      response = await api.put(`/patients/${props.patient!.id}`, payload);
    } else {
      response = await api.post('/patients', payload);
    }

    emit('saved', response.data.patient);
    emit('close');
  } catch (e: any) {
    error.value = e.response?.data?.error || t('common.error');
  } finally {
    loading.value = false;
  }
}

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];
</script>

<template>
  <Modal :open="open" :title="title" size="lg" @close="emit('close')">
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Error message -->
      <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
        {{ error }}
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            type="button"
            @click="activeTab = 'personal'"
            :class="[
              activeTab === 'personal'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.personalInfo') }}
          </button>
          <button
            type="button"
            @click="activeTab = 'address'"
            :class="[
              activeTab === 'address'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.address') }}
          </button>
          <button
            type="button"
            @click="activeTab = 'additional'"
            :class="[
              activeTab === 'additional'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ t('patients.additionalInfo') }}
          </button>
        </nav>
      </div>

      <!-- Personal Info Tab -->
      <div v-show="activeTab === 'personal'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.name') }} <span class="text-destructive">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.phone') }} <span class="text-destructive">*</span>
            </label>
            <input
              v-model="form.phone"
              type="tel"
              required
              placeholder="11999999999"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.secondaryPhone') }}
            </label>
            <input
              v-model="form.phoneSecondary"
              type="tel"
              placeholder="11999999999"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.email') }}
            </label>
            <input
              v-model="form.email"
              type="email"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.cpf') }}
            </label>
            <input
              v-model="form.cpf"
              type="text"
              placeholder="000.000.000-00"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.birthDate') }}
            </label>
            <input
              v-model="form.birthDate"
              type="date"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.gender') }}
            </label>
            <select
              v-model="form.gender"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option :value="undefined">-</option>
              <option value="MALE">{{ t('patients.male') }}</option>
              <option value="FEMALE">{{ t('patients.female') }}</option>
              <option value="OTHER">{{ t('patients.other') }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Address Tab -->
      <div v-show="activeTab === 'address'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.zipCode') }}
            </label>
            <input
              v-model="form.address!.zipCode"
              type="text"
              placeholder="00000-000"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div></div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.street') }}
            </label>
            <input
              v-model="form.address!.street"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.number') }}
            </label>
            <input
              v-model="form.address!.number"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.complement') }}
            </label>
            <input
              v-model="form.address!.complement"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.neighborhood') }}
            </label>
            <input
              v-model="form.address!.neighborhood"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.city') }}
            </label>
            <input
              v-model="form.address!.city"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('patients.state') }}
            </label>
            <select
              v-model="form.address!.state"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">-</option>
              <option v-for="state in brazilianStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Additional Info Tab -->
      <div v-show="activeTab === 'additional'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('patients.source') }}
          </label>
          <select
            v-model="form.source"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">-</option>
            <option value="indication">{{ t('patients.sourceOptions.indication') }}</option>
            <option value="social">{{ t('patients.sourceOptions.social') }}</option>
            <option value="search">{{ t('patients.sourceOptions.search') }}</option>
            <option value="walkin">{{ t('patients.sourceOptions.walkin') }}</option>
            <option value="other">{{ t('patients.sourceOptions.other') }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('patients.tags') }}
          </label>
          <div class="mt-1 flex gap-2">
            <input
              v-model="newTag"
              type="text"
              class="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              @keydown.enter.prevent="addTag"
            />
            <button
              type="button"
              @click="addTag"
              class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              +
            </button>
          </div>
          <div v-if="form.tags?.length" class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
            >
              {{ tag }}
              <button
                type="button"
                @click="removeTag(tag)"
                class="text-primary/60 hover:text-primary"
              >
                &times;
              </button>
            </span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('common.notes') }}
          </label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          ></textarea>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="loading"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? t('common.loading') : t('common.save') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

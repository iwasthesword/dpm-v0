<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const props = defineProps<{
  open: boolean;
  professionalId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();

interface Professional {
  id: string;
  name: string;
  cro: string;
  croState: string;
  specialty?: string;
  phone?: string;
  email?: string;
  color: string;
  bio?: string;
  workingHours?: Record<string, any>;
  commissionType: 'PERCENTAGE' | 'FIXED' | 'PER_PROCEDURE';
  commissionValue?: string;
  commissionTable?: Record<string, number>;
  bankInfo?: {
    bank?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
  };
  hireDate?: string;
  isActive: boolean;
}

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const activeSection = ref<'general' | 'commission' | 'bank'>('general');

const form = ref<Partial<Professional>>({
  name: '',
  cro: '',
  croState: 'SP',
  specialty: '',
  phone: '',
  email: '',
  color: '#3B82F6',
  bio: '',
  commissionType: 'PERCENTAGE',
  commissionValue: '',
  bankInfo: {},
  hireDate: '',
});

const colors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const commissionTypes = [
  { value: 'PERCENTAGE', label: t('settings.commissionTypes.PERCENTAGE') },
  { value: 'FIXED', label: t('settings.commissionTypes.FIXED') },
  { value: 'PER_PROCEDURE', label: t('settings.commissionTypes.PER_PROCEDURE') },
];

const commissionLabel = computed(() => {
  if (form.value.commissionType === 'PERCENTAGE') {
    return 'Porcentagem (%)';
  } else if (form.value.commissionType === 'FIXED') {
    return 'Valor Fixo (R$)';
  }
  return 'Valor Padrão por Procedimento (R$)';
});

async function fetchProfessional() {
  if (!props.professionalId) return;

  loading.value = true;
  error.value = '';

  try {
    const response = await api.get(`/staff/professionals/${props.professionalId}`);
    const prof = response.data.professional;

    form.value = {
      name: prof.name,
      cro: prof.cro,
      croState: prof.croState,
      specialty: prof.specialty || '',
      phone: prof.phone || '',
      email: prof.email || '',
      color: prof.color,
      bio: prof.bio || '',
      commissionType: prof.commissionType,
      commissionValue: prof.commissionValue?.toString() || '',
      bankInfo: prof.bankInfo || {},
      hireDate: prof.hireDate ? prof.hireDate.split('T')[0] : '',
      isActive: prof.isActive,
    };
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to load professional';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';

  try {
    const data = {
      ...form.value,
      commissionValue: form.value.commissionValue ? parseFloat(form.value.commissionValue) : null,
    };

    await api.put(`/staff/professionals/${props.professionalId}`, data);
    emit('saved');
    emit('close');
  } catch (e: any) {
    error.value = e.response?.data?.error || 'Failed to save professional';
  } finally {
    saving.value = false;
  }
}

watch(() => props.open, (open) => {
  if (open && props.professionalId) {
    activeSection.value = 'general';
    fetchProfessional();
  }
});
</script>

<template>
  <Modal
    :open="open"
    :title="t('settings.editProfessional')"
    size="lg"
    @close="emit('close')"
  >
    <div v-if="loading" class="py-8 text-center text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else class="space-y-4">
      <div v-if="error" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
        {{ error }}
      </div>

      <!-- Section Tabs -->
      <div class="flex gap-2 border-b border-gray-200 pb-2">
        <button
          v-for="section in [
            { id: 'general', label: 'Geral' },
            { id: 'commission', label: t('settings.commission') },
            { id: 'bank', label: t('settings.bankInfo') },
          ]"
          :key="section.id"
          @click="activeSection = section.id as any"
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            activeSection === section.id
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:bg-gray-100',
          ]"
        >
          {{ section.label }}
        </button>
      </div>

      <!-- General Section -->
      <div v-if="activeSection === 'general'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings.professionalName') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('settings.cro') }} <span class="text-destructive">*</span>
            </label>
            <input
              v-model="form.cro"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('settings.croState') }} <span class="text-destructive">*</span>
            </label>
            <select
              v-model="form.croState"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="state in brazilianStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.specialty') }}</label>
            <input
              v-model="form.specialty"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.phone') }}</label>
            <input
              v-model="form.phone"
              type="tel"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
            <input
              v-model="form.email"
              type="email"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.hireDate') }}</label>
            <input
              v-model="form.hireDate"
              type="date"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.bio') }}</label>
          <textarea
            v-model="form.bio"
            rows="2"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.roomColor') }}</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              @click="form.color = color"
              :class="[
                'w-8 h-8 rounded-full transition-transform',
                form.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110',
              ]"
              :style="{ backgroundColor: color }"
            ></button>
          </div>
        </div>
      </div>

      <!-- Commission Section -->
      <div v-if="activeSection === 'commission'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.commissionType') }}</label>
          <select
            v-model="form.commissionType"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="type in commissionTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ commissionLabel }}</label>
          <div class="mt-1 relative">
            <span v-if="form.commissionType !== 'PERCENTAGE'" class="absolute left-3 top-2 text-gray-500">R$</span>
            <input
              v-model="form.commissionValue"
              type="number"
              step="0.01"
              min="0"
              :max="form.commissionType === 'PERCENTAGE' ? 100 : undefined"
              :class="[
                'block w-full py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                form.commissionType !== 'PERCENTAGE' ? 'pl-10 pr-3' : 'px-3',
              ]"
            />
            <span v-if="form.commissionType === 'PERCENTAGE'" class="absolute right-3 top-2 text-gray-500">%</span>
          </div>
        </div>

        <div class="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p v-if="form.commissionType === 'PERCENTAGE'">
            O profissional receberá <strong>{{ form.commissionValue || 0 }}%</strong> do valor de cada procedimento realizado.
          </p>
          <p v-else-if="form.commissionType === 'FIXED'">
            O profissional receberá <strong>R$ {{ form.commissionValue || '0,00' }}</strong> por consulta realizada.
          </p>
          <p v-else>
            O profissional receberá um valor específico por cada tipo de procedimento. O valor padrão é <strong>R$ {{ form.commissionValue || '0,00' }}</strong>.
          </p>
        </div>
      </div>

      <!-- Bank Section -->
      <div v-if="activeSection === 'bank'" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.bank') }}</label>
            <input
              v-model="form.bankInfo!.bank"
              type="text"
              placeholder="Ex: Banco do Brasil"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.agency') }}</label>
            <input
              v-model="form.bankInfo!.agency"
              type="text"
              placeholder="Ex: 1234-5"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.account') }}</label>
          <input
            v-model="form.bankInfo!.account"
            type="text"
            placeholder="Ex: 12345-6"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.pixKey') }}</label>
          <input
            v-model="form.bankInfo!.pixKey"
            type="text"
            placeholder="CPF, E-mail, Telefone ou Chave aleatória"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
    </div>

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
          @click="save"
          :disabled="saving || !form.name || !form.cro"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ saving ? t('common.loading') : t('common.save') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

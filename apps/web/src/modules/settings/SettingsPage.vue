<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';
import ProfessionalEditModal from '@/components/staff/ProfessionalEditModal.vue';
import MessageTemplates from '@/components/messages/MessageTemplates.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const activeTab = ref('profile');

interface Clinic {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  subdomain: string;
  timezone: string;
  logo?: string;
  address?: Record<string, string>;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  color: string;
  isActive: boolean;
}

interface Professional {
  id: string;
  name: string;
  cro: string;
  croState: string;
  specialty?: string;
  color: string;
}

interface Procedure {
  id: string;
  code?: string;
  name: string;
  description?: string;
  duration: number;
  price: string;
  category?: string;
  isActive: boolean;
}

const tabs = computed(() => [
  { id: 'profile', name: t('settings.profile') },
  { id: 'clinic', name: t('settings.clinic') },
  { id: 'rooms', name: t('settings.rooms') },
  { id: 'professionals', name: t('settings.professionals') },
  { id: 'procedures', name: t('settings.procedures') },
  { id: 'messages', name: t('messages.templates') },
  { id: 'security', name: t('settings.security') },
]);

// Clinic state
const clinic = ref<Clinic | null>(null);
const clinicForm = ref({
  name: '',
  tradeName: '',
  phone: '',
  email: '',
});
const loadingClinic = ref(false);
const savingClinic = ref(false);
const clinicError = ref('');

// Rooms state
const rooms = ref<Room[]>([]);
const loadingRooms = ref(false);
const showRoomModal = ref(false);
const newRoom = ref({
  name: '',
  description: '',
  color: '#3B82F6',
});
const savingRoom = ref(false);
const roomError = ref('');

// Professionals state
const professionals = ref<Professional[]>([]);
const loadingProfessionals = ref(false);
const showProfessionalModal = ref(false);
const newProfessional = ref({
  name: '',
  cro: '',
  croState: 'SP',
  specialty: '',
  color: '#3B82F6',
});
const savingProfessional = ref(false);
const professionalError = ref('');
const showEditProfessionalModal = ref(false);
const selectedProfessionalId = ref<string | null>(null);

function openEditProfessional(id: string) {
  selectedProfessionalId.value = id;
  showEditProfessionalModal.value = true;
}

function onProfessionalSaved() {
  fetchProfessionals();
}

// Procedures state
const procedures = ref<Procedure[]>([]);
const loadingProcedures = ref(false);
const showProcedureModal = ref(false);
const newProcedure = ref({
  code: '',
  name: '',
  description: '',
  duration: 30,
  price: '',
  category: '',
});
const savingProcedure = ref(false);
const procedureError = ref('');

// Profile state
const profileForm = ref({
  name: '',
});
const savingProfile = ref(false);

// Security state
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
const savingPassword = ref(false);
const passwordError = ref('');

const roomColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

async function fetchClinic() {
  loadingClinic.value = true;
  try {
    const response = await api.get('/clinics');
    clinic.value = response.data.clinic;
    clinicForm.value = {
      name: clinic.value?.name || '',
      tradeName: clinic.value?.tradeName || '',
      phone: clinic.value?.phone || '',
      email: clinic.value?.email || '',
    };
  } catch (error) {
    console.error('Failed to fetch clinic:', error);
  } finally {
    loadingClinic.value = false;
  }
}

async function saveClinic() {
  clinicError.value = '';
  savingClinic.value = true;
  try {
    await api.put('/clinics', clinicForm.value);
    await fetchClinic();
  } catch (e: any) {
    clinicError.value = e.response?.data?.error || t('common.error');
  } finally {
    savingClinic.value = false;
  }
}

async function fetchRooms() {
  loadingRooms.value = true;
  try {
    const response = await api.get('/clinics/rooms');
    rooms.value = response.data.rooms;
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
  } finally {
    loadingRooms.value = false;
  }
}

function openRoomModal() {
  newRoom.value = { name: '', description: '', color: '#3B82F6' };
  roomError.value = '';
  showRoomModal.value = true;
}

async function createRoom() {
  roomError.value = '';
  savingRoom.value = true;
  try {
    await api.post('/clinics/rooms', newRoom.value);
    showRoomModal.value = false;
    await fetchRooms();
  } catch (e: any) {
    roomError.value = e.response?.data?.error || t('common.error');
  } finally {
    savingRoom.value = false;
  }
}

async function fetchProfessionals() {
  loadingProfessionals.value = true;
  try {
    const response = await api.get('/clinics/professionals');
    professionals.value = response.data.professionals;
  } catch (error) {
    console.error('Failed to fetch professionals:', error);
  } finally {
    loadingProfessionals.value = false;
  }
}

function openProfessionalModal() {
  newProfessional.value = { name: '', cro: '', croState: 'SP', specialty: '', color: '#3B82F6' };
  professionalError.value = '';
  showProfessionalModal.value = true;
}

async function createProfessional() {
  professionalError.value = '';
  savingProfessional.value = true;
  try {
    await api.post('/clinics/professionals', newProfessional.value);
    showProfessionalModal.value = false;
    await fetchProfessionals();
  } catch (e: any) {
    professionalError.value = e.response?.data?.error || t('common.error');
  } finally {
    savingProfessional.value = false;
  }
}

async function fetchProcedures() {
  loadingProcedures.value = true;
  try {
    const response = await api.get('/clinics/procedures');
    procedures.value = response.data.procedures;
  } catch (error) {
    console.error('Failed to fetch procedures:', error);
  } finally {
    loadingProcedures.value = false;
  }
}

function openProcedureModal() {
  newProcedure.value = { code: '', name: '', description: '', duration: 30, price: '', category: '' };
  procedureError.value = '';
  showProcedureModal.value = true;
}

async function createProcedure() {
  procedureError.value = '';
  savingProcedure.value = true;
  try {
    await api.post('/clinics/procedures', {
      ...newProcedure.value,
      price: parseFloat(newProcedure.value.price),
    });
    showProcedureModal.value = false;
    await fetchProcedures();
  } catch (e: any) {
    procedureError.value = e.response?.data?.error || t('common.error');
  } finally {
    savingProcedure.value = false;
  }
}

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

async function saveProfile() {
  savingProfile.value = true;
  try {
    // Profile update would go here
    await new Promise(resolve => setTimeout(resolve, 500));
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  passwordError.value = '';

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = t('auth.passwordsDoNotMatch');
    return;
  }

  savingPassword.value = true;
  try {
    // Password change would go here
    await new Promise(resolve => setTimeout(resolve, 500));
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (e: any) {
    passwordError.value = e.response?.data?.error || t('common.error');
  } finally {
    savingPassword.value = false;
  }
}

onMounted(() => {
  profileForm.value.name = authStore.user?.name || '';
  fetchClinic();
  fetchRooms();
  fetchProfessionals();
  fetchProcedures();
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900">{{ t('settings.title') }}</h1>

    <div class="mt-6">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
            ]"
          >
            {{ tab.name }}
          </button>
        </nav>
      </div>

      <div class="mt-6">
        <!-- Profile Tab -->
        <div v-if="activeTab === 'profile'" class="max-w-2xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.profileInfo') }}</h2>
            <form class="mt-6 space-y-6" @submit.prevent="saveProfile">
              <div>
                <label class="block text-sm font-medium text-gray-700">{{ t('common.name') }}</label>
                <input
                  v-model="profileForm.name"
                  type="text"
                  class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">{{ t('common.email') }}</label>
                <input
                  type="email"
                  :value="authStore.user?.email"
                  disabled
                  class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <button
                type="submit"
                :disabled="savingProfile"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {{ savingProfile ? t('common.loading') : t('settings.saveChanges') }}
              </button>
            </form>
          </div>
        </div>

        <!-- Clinic Tab -->
        <div v-if="activeTab === 'clinic'" class="max-w-2xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.clinicSettings') }}</h2>
            <p class="mt-2 text-gray-500">{{ t('settings.clinicDescription') }}</p>

            <div v-if="clinicError" class="mt-4 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {{ clinicError }}
            </div>

            <form v-if="!loadingClinic" class="mt-6 space-y-6" @submit.prevent="saveClinic">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700">{{ t('settings.clinicName') }}</label>
                  <input
                    v-model="clinicForm.name"
                    type="text"
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700">Nome Fantasia</label>
                  <input
                    v-model="clinicForm.tradeName"
                    type="text"
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">{{ t('settings.clinicPhone') }}</label>
                  <input
                    v-model="clinicForm.phone"
                    type="tel"
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">{{ t('settings.clinicEmail') }}</label>
                  <input
                    v-model="clinicForm.email"
                    type="email"
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">{{ t('settings.clinicCnpj') }}</label>
                  <input
                    :value="clinic?.cnpj"
                    type="text"
                    disabled
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Subdomínio</label>
                  <input
                    :value="clinic?.subdomain"
                    type="text"
                    disabled
                    class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                :disabled="savingClinic"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {{ savingClinic ? t('common.loading') : t('settings.saveChanges') }}
              </button>
            </form>
            <div v-else class="mt-6 text-center text-gray-500">{{ t('common.loading') }}</div>
          </div>
        </div>

        <!-- Rooms Tab -->
        <div v-if="activeTab === 'rooms'" class="max-w-4xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.roomsManagement') }}</h2>
                <p class="mt-1 text-sm text-gray-500">{{ t('settings.rooms') }}</p>
              </div>
              <button
                @click="openRoomModal"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {{ t('settings.addRoom') }}
              </button>
            </div>

            <div v-if="loadingRooms" class="mt-6 text-center text-gray-500">
              {{ t('common.loading') }}
            </div>
            <div v-else-if="rooms.length === 0" class="mt-6 text-center text-gray-500 py-8">
              {{ t('settings.noRooms') }}
            </div>
            <div v-else class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="room in rooms"
                :key="room.id"
                class="border border-gray-200 rounded-lg p-4 flex items-start gap-3"
              >
                <div
                  class="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  :style="{ backgroundColor: room.color }"
                ></div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900">{{ room.name }}</h3>
                  <p v-if="room.description" class="text-sm text-gray-500 mt-1">{{ room.description }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Professionals Tab -->
        <div v-if="activeTab === 'professionals'" class="max-w-4xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.professionalsManagement') }}</h2>
                <p class="mt-1 text-sm text-gray-500">{{ t('settings.professionals') }}</p>
              </div>
              <button
                @click="openProfessionalModal"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {{ t('settings.addProfessional') }}
              </button>
            </div>

            <div v-if="loadingProfessionals" class="mt-6 text-center text-gray-500">
              {{ t('common.loading') }}
            </div>
            <div v-else-if="professionals.length === 0" class="mt-6 text-center text-gray-500 py-8">
              {{ t('settings.noProfessionals') }}
            </div>
            <div v-else class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="prof in professionals"
                :key="prof.id"
                class="border border-gray-200 rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                @click="openEditProfessional(prof.id)"
              >
                <div
                  class="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                  :style="{ backgroundColor: prof.color }"
                ></div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-medium text-gray-900">{{ prof.name }}</h3>
                  <p class="text-sm text-gray-500 mt-1">CRO {{ prof.croState }} {{ prof.cro }}</p>
                  <p v-if="prof.specialty" class="text-sm text-gray-400">{{ prof.specialty }}</p>
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Procedures Tab -->
        <div v-if="activeTab === 'procedures'" class="max-w-4xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.proceduresManagement') }}</h2>
                <p class="mt-1 text-sm text-gray-500">{{ t('settings.procedures') }}</p>
              </div>
              <button
                @click="openProcedureModal"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {{ t('settings.addProcedure') }}
              </button>
            </div>

            <div v-if="loadingProcedures" class="mt-6 text-center text-gray-500">
              {{ t('common.loading') }}
            </div>
            <div v-else-if="procedures.length === 0" class="mt-6 text-center text-gray-500 py-8">
              {{ t('settings.noProcedures') }}
            </div>
            <div v-else class="mt-6">
              <table class="w-full">
                <thead class="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('common.name') }}</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('settings.procedureCode') }}</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('settings.duration') }}</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('settings.price') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="proc in procedures" :key="proc.id" class="hover:bg-gray-50">
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900">{{ proc.name }}</p>
                      <p v-if="proc.description" class="text-sm text-gray-500">{{ proc.description }}</p>
                    </td>
                    <td class="px-4 py-3 text-gray-600">{{ proc.code || '-' }}</td>
                    <td class="px-4 py-3 text-right text-gray-600">{{ proc.duration }} min</td>
                    <td class="px-4 py-3 text-right font-medium text-gray-900">R$ {{ parseFloat(proc.price).toFixed(2) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Messages Tab -->
        <div v-if="activeTab === 'messages'" class="max-w-4xl">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <MessageTemplates />
          </div>
        </div>

        <!-- Security Tab -->
        <div v-if="activeTab === 'security'" class="max-w-2xl space-y-6">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.changePassword') }}</h2>

            <div v-if="passwordError" class="mt-4 bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {{ passwordError }}
            </div>

            <form class="mt-6 space-y-6" @submit.prevent="changePassword">
              <div>
                <label class="block text-sm font-medium text-gray-700">{{ t('auth.currentPassword') }}</label>
                <input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  autocomplete="current-password"
                  class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">{{ t('auth.newPassword') }}</label>
                <input
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                  class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">{{ t('settings.confirmNewPassword') }}</label>
                <input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                :disabled="savingPassword"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {{ savingPassword ? t('common.loading') : t('settings.changePassword') }}
              </button>
            </form>
          </div>

          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <h2 class="text-lg font-semibold text-gray-900">{{ t('settings.twoFactorAuth') }}</h2>
            <p class="mt-2 text-gray-500">{{ t('settings.addExtraSecurity') }}</p>
            <div class="mt-6">
              <button
                v-if="!authStore.user?.twoFactorEnabled"
                class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {{ t('auth.enable2FA') }}
              </button>
              <button
                v-else
                class="px-4 py-2 border border-destructive text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
              >
                {{ t('auth.disable2FA') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Room Modal -->
    <Modal :open="showRoomModal" :title="t('settings.addRoom')" size="sm" @close="showRoomModal = false">
      <form @submit.prevent="createRoom" class="space-y-4">
        <div v-if="roomError" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ roomError }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings.roomName') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="newRoom.name"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.roomDescription') }}</label>
          <input
            v-model="newRoom.description"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.roomColor') }}</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="color in roomColors"
              :key="color"
              type="button"
              @click="newRoom.color = color"
              :class="[
                'w-8 h-8 rounded-full transition-transform',
                newRoom.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110',
              ]"
              :style="{ backgroundColor: color }"
            ></button>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="showRoomModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="createRoom"
            :disabled="savingRoom || !newRoom.name"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ savingRoom ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- New Professional Modal -->
    <Modal :open="showProfessionalModal" :title="t('settings.addProfessional')" size="sm" @close="showProfessionalModal = false">
      <form @submit.prevent="createProfessional" class="space-y-4">
        <div v-if="professionalError" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ professionalError }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings.professionalName') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="newProfessional.name"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('settings.cro') }} <span class="text-destructive">*</span>
            </label>
            <input
              v-model="newProfessional.cro"
              type="text"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ t('settings.croState') }} <span class="text-destructive">*</span>
            </label>
            <select
              v-model="newProfessional.croState"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="state in brazilianStates" :key="state" :value="state">
                {{ state }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.specialty') }}</label>
          <input
            v-model="newProfessional.specialty"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.roomColor') }}</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="color in roomColors"
              :key="color"
              type="button"
              @click="newProfessional.color = color"
              :class="[
                'w-8 h-8 rounded-full transition-transform',
                newProfessional.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110',
              ]"
              :style="{ backgroundColor: color }"
            ></button>
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="showProfessionalModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="createProfessional"
            :disabled="savingProfessional || !newProfessional.name || !newProfessional.cro"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ savingProfessional ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- New Procedure Modal -->
    <Modal :open="showProcedureModal" :title="t('settings.addProcedure')" size="sm" @close="showProcedureModal = false">
      <form @submit.prevent="createProcedure" class="space-y-4">
        <div v-if="procedureError" class="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
          {{ procedureError }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('common.name') }} <span class="text-destructive">*</span>
          </label>
          <input
            v-model="newProcedure.name"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.procedureCode') }}</label>
            <input
              v-model="newProcedure.code"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('settings.duration') }} (min)</label>
            <input
              v-model.number="newProcedure.duration"
              type="number"
              min="5"
              step="5"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">
            {{ t('settings.price') }} (R$) <span class="text-destructive">*</span>
          </label>
          <input
            v-model="newProcedure.price"
            type="number"
            step="0.01"
            min="0"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('settings.procedureDescription') }}</label>
          <textarea
            v-model="newProcedure.description"
            rows="2"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="showProcedureModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            @click="createProcedure"
            :disabled="savingProcedure || !newProcedure.name || !newProcedure.price"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ savingProcedure ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Edit Professional Modal -->
    <ProfessionalEditModal
      :open="showEditProfessionalModal"
      :professional-id="selectedProfessionalId"
      @close="showEditProfessionalModal = false"
      @saved="onProfessionalSaved"
    />
  </div>
</template>

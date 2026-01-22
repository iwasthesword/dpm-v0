<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import AppointmentFormModal from '@/components/appointments/AppointmentFormModal.vue';
import Modal from '@/components/ui/Modal.vue';
import ScheduleFinancialBar, { type FinancialSummary } from '@/components/schedule/ScheduleFinancialBar.vue';

const { t, d } = useI18n();

interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  roomId?: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  patient: { id: string; name: string; phone: string };
  professional: { id: string; name: string; color: string };
  procedure?: { id: string; name: string; duration: number; price: number };
  room?: { id: string; name: string; color: string };
}

const currentDate = ref(new Date());
const appointments = ref<Appointment[]>([]);
const loading = ref(true);

// Financial overlay state
const showFinancials = ref(false);
const financialSummary = ref<FinancialSummary | null>(null);
const financialLoading = ref(false);

// Modal state
const showFormModal = ref(false);
const showDetailsModal = ref(false);
const selectedAppointment = ref<Appointment | null>(null);
const selectedDate = ref<Date | null>(null);
const selectedTime = ref<string>('09:00');

const weekDays = computed(() => {
  const start = startOfWeek(currentDate.value, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
});

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function fetchAppointments() {
  loading.value = true;
  try {
    const start = weekDays.value[0];
    const end = weekDays.value[6];
    const response = await api.get('/appointments', {
      params: {
        startDate: formatDate(start),
        endDate: formatDate(end),
      },
    });
    appointments.value = response.data.appointments;
  } catch (error) {
    console.error('Failed to fetch appointments:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchFinancialSummary() {
  if (!showFinancials.value) return;

  financialLoading.value = true;
  try {
    const start = weekDays.value[0];
    const end = weekDays.value[6];
    const response = await api.get('/appointments/financial-summary', {
      params: {
        startDate: formatDate(start),
        endDate: formatDate(end),
      },
    });
    financialSummary.value = response.data.summary;
  } catch (error) {
    console.error('Failed to fetch financial summary:', error);
    financialSummary.value = null;
  } finally {
    financialLoading.value = false;
  }
}

function toggleFinancials() {
  showFinancials.value = !showFinancials.value;
  if (showFinancials.value) {
    fetchFinancialSummary();
  }
}

function getDailyRevenue(day: Date): number {
  if (!financialSummary.value) return 0;
  const dateKey = formatDate(day);
  const dayRevenue = financialSummary.value.dailyRevenue.find(d => d.date === dateKey);
  return dayRevenue?.amount || 0;
}

// Fixed: Use Intl.NumberFormat instead of vue-i18n n() to avoid issues with undefined values
function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(Number(value))) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function getAppointmentPrice(apt: Appointment): number {
  return apt.procedure?.price || 0;
}

function isPremiumAppointment(apt: Appointment): boolean {
  if (!financialSummary.value || !apt.procedure) return false;
  return apt.procedure.price > financialSummary.value.averageTicket * 1.5;
}

function previousWeek() {
  currentDate.value = addDays(currentDate.value, -7);
}

function nextWeek() {
  currentDate.value = addDays(currentDate.value, 7);
}

function goToToday() {
  currentDate.value = new Date();
}

function getAppointmentsForSlot(day: Date, hour: number): Appointment[] {
  return appointments.value.filter((apt) => {
    const aptStart = new Date(apt.startTime);
    return isSameDay(aptStart, day) && aptStart.getHours() === hour;
  });
}

function openCreateModal(day?: Date, hour?: number) {
  selectedAppointment.value = null;
  selectedDate.value = day || new Date();
  selectedTime.value = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00';
  showFormModal.value = true;
}

function openAppointmentDetails(appointment: Appointment) {
  selectedAppointment.value = appointment;
  showDetailsModal.value = true;
}

function editAppointment() {
  showDetailsModal.value = false;
  showFormModal.value = true;
}

async function updateAppointmentStatus(status: string) {
  if (!selectedAppointment.value) return;

  try {
    await api.post(`/appointments/${selectedAppointment.value.id}/status`, { status });
    await fetchAppointments();
    showDetailsModal.value = false;
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}

function handleAppointmentSaved() {
  fetchAppointments();
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    SCHEDULED: 'bg-blue-500',
    CONFIRMED: 'bg-green-500',
    WAITING: 'bg-yellow-500',
    IN_PROGRESS: 'bg-purple-500',
    COMPLETED: 'bg-gray-400',
    NO_SHOW: 'bg-red-400',
    CANCELLED: 'bg-red-300 line-through',
  };
  return classes[status] || 'bg-gray-400';
}

function getStatusLabel(status: string) {
  const statusMap: Record<string, string> = {
    SCHEDULED: t('schedule.status.scheduled'),
    CONFIRMED: t('schedule.status.confirmed'),
    WAITING: t('schedule.status.waiting'),
    IN_PROGRESS: t('schedule.status.inProgress'),
    COMPLETED: t('schedule.status.completed'),
    NO_SHOW: t('schedule.status.noShow'),
    CANCELLED: t('schedule.status.cancelled'),
  };
  return statusMap[status] || status;
}

function getTypeLabel(type: string) {
  const typeMap: Record<string, string> = {
    EVALUATION: t('schedule.types.evaluation'),
    TREATMENT: t('schedule.types.treatment'),
    RETURN: t('schedule.types.return'),
    EMERGENCY: t('schedule.types.emergency'),
    MAINTENANCE: t('schedule.types.maintenance'),
  };
  return typeMap[type] || type;
}

// Refetch when week changes
watch(weekDays, () => {
  fetchAppointments();
  if (showFinancials.value) {
    fetchFinancialSummary();
  }
});

onMounted(fetchAppointments);
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">
        {{ t('schedule.title') }}
      </h1>
      <div class="flex items-center gap-3">
        <button
          @click="toggleFinancials"
          class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          :class="showFinancials
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'"
        >
          <span class="text-lg">$</span>
          <span>{{ showFinancials ? t('schedule.smart.hideFinancials') : t('schedule.smart.showFinancials') }}</span>
        </button>
        <button
          @click="openCreateModal()"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          {{ t('schedule.newAppointment') }}
        </button>
      </div>
    </div>

    <!-- Financial Summary Bar -->
    <ScheduleFinancialBar
      v-if="showFinancials"
      :summary="financialSummary"
      :loading="financialLoading"
      class="mt-4"
    />

    <div class="mt-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          @click="previousWeek"
          class="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
        >
          {{ t('schedule.previousWeek') }}
        </button>
        <button
          @click="goToToday"
          class="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
        >
          {{ t('schedule.today') }}
        </button>
        <button
          @click="nextWeek"
          class="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
        >
          {{ t('schedule.nextWeek') }}
        </button>
      </div>
      <h2 class="text-lg font-medium text-gray-900">
        {{ d(weekDays[0], 'short') }} - {{ d(weekDays[6], 'long') }}
      </h2>
    </div>

    <div class="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="grid grid-cols-8 border-b border-gray-200">
        <div class="p-3 text-center text-sm font-medium text-gray-500">{{ t('common.time') }}</div>
        <div
          v-for="day in weekDays"
          :key="day.toISOString()"
          class="p-3 text-center border-l border-gray-200"
          :class="{ 'bg-primary/5': isSameDay(day, new Date()) }"
        >
          <p class="text-sm font-medium text-gray-500">{{ d(day, 'weekday') }}</p>
          <p class="text-lg font-semibold text-gray-900">{{ day.getDate() }}</p>
          <p v-if="showFinancials && getDailyRevenue(day) > 0" class="text-xs text-green-600 font-medium mt-1">
            {{ formatCurrency(getDailyRevenue(day)) }}
          </p>
        </div>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-500">
        {{ t('schedule.loadingSchedule') }}
      </div>

      <div v-else class="overflow-y-auto" style="max-height: calc(100vh - 300px);">
        <div
          v-for="hour in hours"
          :key="hour"
          class="grid grid-cols-8 border-b border-gray-100"
        >
          <div class="p-2 text-center text-sm text-gray-500 bg-gray-50">
            {{ hour }}:00
          </div>
          <div
            v-for="day in weekDays"
            :key="`${day.toISOString()}-${hour}`"
            class="min-h-[60px] border-l border-gray-100 p-1 hover:bg-gray-50 cursor-pointer relative"
            :class="{ 'bg-primary/5': isSameDay(day, new Date()) }"
            @click="openCreateModal(day, hour)"
          >
            <!-- Appointments -->
            <div
              v-for="apt in getAppointmentsForSlot(day, hour)"
              :key="apt.id"
              class="text-xs p-1 rounded mb-1 text-white cursor-pointer"
              :class="getStatusClass(apt.status)"
              :style="{ backgroundColor: apt.professional?.color || undefined }"
              @click.stop="openAppointmentDetails(apt)"
            >
              <div class="flex items-center justify-between gap-1">
                <span class="font-medium truncate">{{ apt.patient.name }}</span>
                <span v-if="showFinancials && getAppointmentPrice(apt) > 0" class="text-[10px] opacity-90 whitespace-nowrap">
                  {{ formatCurrency(getAppointmentPrice(apt)) }}
                </span>
              </div>
              <div class="flex items-center gap-1 opacity-80">
                <span class="truncate">{{ getTypeLabel(apt.type) }}</span>
                <span v-if="showFinancials && isPremiumAppointment(apt)" title="Premium">*</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Appointment Form Modal -->
    <AppointmentFormModal
      :open="showFormModal"
      :appointment="selectedAppointment"
      :default-date="selectedDate || undefined"
      :default-time="selectedTime"
      @close="showFormModal = false"
      @saved="handleAppointmentSaved"
    />

    <!-- Appointment Details Modal -->
    <Modal :open="showDetailsModal" :title="t('schedule.appointmentDetails')" size="md" @close="showDetailsModal = false">
      <div v-if="selectedAppointment" class="space-y-4">
        <!-- Status Badge -->
        <div class="flex items-center justify-between">
          <span
            class="px-3 py-1 rounded-full text-sm font-medium text-white"
            :class="getStatusClass(selectedAppointment.status)"
          >
            {{ getStatusLabel(selectedAppointment.status) }}
          </span>
          <span class="text-sm text-gray-500">
            {{ getTypeLabel(selectedAppointment.type) }}
          </span>
        </div>

        <!-- Patient Info -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="text-sm font-medium text-gray-500">{{ t('schedule.appointment.patient') }}</h3>
          <p class="mt-1 text-lg font-semibold text-gray-900">{{ selectedAppointment.patient.name }}</p>
          <p class="text-sm text-gray-500">{{ selectedAppointment.patient.phone }}</p>
        </div>

        <!-- Date/Time -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-medium text-gray-500">{{ t('schedule.appointment.date') }}</h3>
            <p class="mt-1 text-gray-900">{{ d(new Date(selectedAppointment.startTime), 'long') }}</p>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-500">{{ t('common.time') }}</h3>
            <p class="mt-1 text-gray-900">
              {{ d(new Date(selectedAppointment.startTime), 'time') }} -
              {{ d(new Date(selectedAppointment.endTime), 'time') }}
            </p>
          </div>
        </div>

        <!-- Professional & Room -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-medium text-gray-500">{{ t('schedule.appointment.professional') }}</h3>
            <p class="mt-1 text-gray-900">{{ selectedAppointment.professional.name }}</p>
          </div>
          <div v-if="selectedAppointment.room">
            <h3 class="text-sm font-medium text-gray-500">{{ t('schedule.appointment.room') }}</h3>
            <p class="mt-1 text-gray-900">{{ selectedAppointment.room.name }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="selectedAppointment.notes">
          <h3 class="text-sm font-medium text-gray-500">{{ t('schedule.appointment.notes') }}</h3>
          <p class="mt-1 text-gray-900">{{ selectedAppointment.notes }}</p>
        </div>

        <!-- Status Actions -->
        <div v-if="selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED'" class="border-t border-gray-200 pt-4">
          <h3 class="text-sm font-medium text-gray-500 mb-3">{{ t('schedule.changeStatus') }}</h3>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="selectedAppointment.status === 'SCHEDULED'"
              @click="updateAppointmentStatus('CONFIRMED')"
              class="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
            >
              {{ t('schedule.markAsConfirmed') }}
            </button>
            <button
              v-if="selectedAppointment.status === 'CONFIRMED'"
              @click="updateAppointmentStatus('WAITING')"
              class="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600"
            >
              {{ t('schedule.markAsWaiting') }}
            </button>
            <button
              v-if="selectedAppointment.status === 'WAITING'"
              @click="updateAppointmentStatus('IN_PROGRESS')"
              class="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600"
            >
              {{ t('schedule.markAsInProgress') }}
            </button>
            <button
              v-if="selectedAppointment.status === 'IN_PROGRESS'"
              @click="updateAppointmentStatus('COMPLETED')"
              class="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
            >
              {{ t('schedule.markAsCompleted') }}
            </button>
            <button
              v-if="['SCHEDULED', 'CONFIRMED'].includes(selectedAppointment.status)"
              @click="updateAppointmentStatus('NO_SHOW')"
              class="px-3 py-1.5 bg-red-400 text-white text-sm rounded-lg hover:bg-red-500"
            >
              {{ t('schedule.markAsNoShow') }}
            </button>
            <button
              v-if="['SCHEDULED', 'CONFIRMED'].includes(selectedAppointment.status)"
              @click="updateAppointmentStatus('CANCELLED')"
              class="px-3 py-1.5 border border-red-400 text-red-600 text-sm rounded-lg hover:bg-red-50"
            >
              {{ t('schedule.markAsCancelled') }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between">
          <button
            v-if="selectedAppointment && !['COMPLETED', 'CANCELLED'].includes(selectedAppointment.status)"
            @click="editAppointment"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.edit') }}
          </button>
          <div v-else></div>
          <button
            @click="showDetailsModal = false"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

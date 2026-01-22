<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface PaymentDetail {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
}

interface PatientReceivable {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  totalOwed: number;
  oldestDue: string;
  agingBucket: 'current' | '30' | '60' | '90+';
  payments: PaymentDetail[];
}

interface AccountsReceivable {
  totalReceivable: number;
  patientsCount: number;
  aging: {
    current: { amount: number; count: number };
    thirtyDays: { amount: number; count: number };
    sixtyDays: { amount: number; count: number };
    ninetyPlus: { amount: number; count: number };
  };
  patients: PatientReceivable[];
}

const { t, n, d } = useI18n();

const data = ref<AccountsReceivable | null>(null);
const loading = ref(true);
const selectedFilter = ref<'all' | 'current' | '30' | '60' | '90+'>('all');
const expandedPatientId = ref<string | null>(null);

const filteredPatients = computed(() => {
  if (!data.value) return [];
  if (selectedFilter.value === 'all') return data.value.patients;
  return data.value.patients.filter((p) => p.agingBucket === selectedFilter.value);
});

async function fetchData() {
  loading.value = true;
  try {
    const response = await api.get('/financial/accounts-receivable');
    data.value = response.data.receivables;
  } catch (error) {
    console.error('Failed to fetch accounts receivable:', error);
  } finally {
    loading.value = false;
  }
}

function getAgingBadgeClass(bucket: string): string {
  switch (bucket) {
    case 'current':
      return 'bg-green-100 text-green-800';
    case '30':
      return 'bg-yellow-100 text-yellow-800';
    case '60':
      return 'bg-orange-100 text-orange-800';
    case '90+':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getAgingLabel(bucket: string): string {
  switch (bucket) {
    case 'current':
      return t('financial.aging.current');
    case '30':
      return t('financial.aging.thirtyDays');
    case '60':
      return t('financial.aging.sixtyDays');
    case '90+':
      return t('financial.aging.ninetyPlus');
    default:
      return bucket;
  }
}

function toggleExpand(patientId: string) {
  expandedPatientId.value = expandedPatientId.value === patientId ? null : patientId;
}

function contactPatient(patient: PatientReceivable) {
  // Open WhatsApp or phone dialer
  if (patient.phone) {
    const phone = patient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}`, '_blank');
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: t('financial.paymentStatus.pending'),
    PARTIALLY_PAID: t('financial.paymentStatus.partiallyPaid'),
    OVERDUE: t('financial.paymentStatus.overdue'),
  };
  return labels[status] || status;
}

onMounted(fetchData);

defineExpose({ refresh: fetchData });
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="grid grid-cols-4 gap-4">
        <div class="h-24 bg-gray-200 rounded-lg"></div>
        <div class="h-24 bg-gray-200 rounded-lg"></div>
        <div class="h-24 bg-gray-200 rounded-lg"></div>
        <div class="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>

    <template v-else-if="data">
      <!-- Header with Total -->
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('financial.accountsReceivable') }}</h2>
        <div class="text-right">
          <p class="text-sm text-gray-500">{{ t('financial.totalReceivable') }}</p>
          <p class="text-2xl font-bold text-gray-900">{{ n(data.totalReceivable, 'currency') }}</p>
        </div>
      </div>

      <!-- Aging Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Current (0-30 days) -->
        <button
          :class="[
            'p-4 rounded-lg border-2 text-left transition-colors',
            selectedFilter === 'current' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'
          ]"
          @click="selectedFilter = selectedFilter === 'current' ? 'all' : 'current'"
        >
          <p class="text-sm font-medium text-green-700">{{ t('financial.aging.current') }}</p>
          <p class="text-xl font-bold text-gray-900 mt-1">{{ n(data.aging.current.amount, 'currency') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ data.aging.current.count }} {{ t('financial.patients') }}</p>
        </button>

        <!-- 31-60 days -->
        <button
          :class="[
            'p-4 rounded-lg border-2 text-left transition-colors',
            selectedFilter === '30' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-yellow-300'
          ]"
          @click="selectedFilter = selectedFilter === '30' ? 'all' : '30'"
        >
          <p class="text-sm font-medium text-yellow-700">{{ t('financial.aging.thirtyDays') }}</p>
          <p class="text-xl font-bold text-gray-900 mt-1">{{ n(data.aging.thirtyDays.amount, 'currency') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ data.aging.thirtyDays.count }} {{ t('financial.patients') }}</p>
        </button>

        <!-- 61-90 days -->
        <button
          :class="[
            'p-4 rounded-lg border-2 text-left transition-colors',
            selectedFilter === '60' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white hover:border-orange-300'
          ]"
          @click="selectedFilter = selectedFilter === '60' ? 'all' : '60'"
        >
          <p class="text-sm font-medium text-orange-700">{{ t('financial.aging.sixtyDays') }}</p>
          <p class="text-xl font-bold text-gray-900 mt-1">{{ n(data.aging.sixtyDays.amount, 'currency') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ data.aging.sixtyDays.count }} {{ t('financial.patients') }}</p>
        </button>

        <!-- 90+ days -->
        <button
          :class="[
            'p-4 rounded-lg border-2 text-left transition-colors',
            selectedFilter === '90+' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'
          ]"
          @click="selectedFilter = selectedFilter === '90+' ? 'all' : '90+'"
        >
          <p class="text-sm font-medium text-red-700">{{ t('financial.aging.ninetyPlus') }}</p>
          <p class="text-xl font-bold text-gray-900 mt-1">{{ n(data.aging.ninetyPlus.amount, 'currency') }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ data.aging.ninetyPlus.count }} {{ t('financial.patients') }}</p>
        </button>
      </div>

      <!-- Patients List -->
      <div class="bg-white rounded-lg border border-gray-200">
        <div v-if="filteredPatients.length === 0" class="p-8 text-center text-gray-500">
          {{ t('financial.noReceivables') }}
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div
            v-for="patient in filteredPatients"
            :key="patient.id"
            class="hover:bg-gray-50"
          >
            <!-- Patient Row -->
            <div
              class="p-4 cursor-pointer flex items-center justify-between"
              @click="toggleExpand(patient.id)"
            >
              <div class="flex items-center gap-4">
                <div>
                  <p class="font-medium text-gray-900">{{ patient.name }}</p>
                  <p class="text-sm text-gray-500">{{ patient.phone }}</p>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p class="font-semibold text-gray-900">{{ n(patient.totalOwed, 'currency') }}</p>
                  <p class="text-xs text-gray-500">
                    {{ t('financial.oldestDue') }}: {{ d(new Date(patient.oldestDue), 'short') }}
                  </p>
                </div>
                <span :class="['px-2 py-1 text-xs rounded-full', getAgingBadgeClass(patient.agingBucket)]">
                  {{ getAgingLabel(patient.agingBucket) }}
                </span>
                <button
                  class="p-2 text-primary hover:bg-primary/10 rounded-lg"
                  title="WhatsApp"
                  @click.stop="contactPatient(patient)"
                >
                  W
                </button>
                <span class="text-gray-400">{{ expandedPatientId === patient.id ? '-' : '+' }}</span>
              </div>
            </div>

            <!-- Expanded Payment Details -->
            <div v-if="expandedPatientId === patient.id" class="px-4 pb-4 bg-gray-50">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-gray-500">
                    <th class="py-2">{{ t('financial.description') }}</th>
                    <th class="py-2">{{ t('financial.dueDate') }}</th>
                    <th class="py-2 text-right">{{ t('financial.amount') }}</th>
                    <th class="py-2 text-right">{{ t('financial.paid') }}</th>
                    <th class="py-2 text-right">{{ t('financial.balance') }}</th>
                    <th class="py-2">{{ t('common.status') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  <tr v-for="payment in patient.payments" :key="payment.id">
                    <td class="py-2 text-gray-900">{{ payment.description }}</td>
                    <td class="py-2 text-gray-600">{{ d(new Date(payment.dueDate), 'short') }}</td>
                    <td class="py-2 text-right text-gray-900">{{ n(payment.amount, 'currency') }}</td>
                    <td class="py-2 text-right text-green-600">{{ n(payment.paidAmount, 'currency') }}</td>
                    <td class="py-2 text-right font-medium text-red-600">
                      {{ n(payment.amount - payment.paidAmount, 'currency') }}
                    </td>
                    <td class="py-2">
                      <span class="text-xs text-gray-600">{{ getStatusLabel(payment.status) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';
import NetProfitDashboard from '@/components/financial/NetProfitDashboard.vue';
import AccountsReceivableTab from '@/components/financial/AccountsReceivableTab.vue';
import CommissionsTab from '@/components/financial/CommissionsTab.vue';
import ReportsTab from '@/components/financial/ReportsTab.vue';

const { t, n, d } = useI18n();

interface Payment {
  id: string;
  patientId: string;
  description: string;
  amount: string;
  paidAmount: string;
  dueDate: string;
  paidAt?: string;
  method?: string;
  status: string;
  installments: number;
  currentInstallment?: number;
  patient: { id: string; name: string; phone: string };
  treatmentPlan?: { id: string; name: string };
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  amount: string;
  method?: string;
  date: string;
  payment?: { description: string; patient?: { name: string } };
}

interface Summary {
  income: number;
  expenses: number;
  balance: number;
  pending: { amount: number; count: number };
  overdue: { amount: number; count: number };
}

type TabType = 'dashboard' | 'receivables' | 'commissions' | 'reports' | 'payments' | 'transactions';
const activeTab = ref<TabType>('dashboard');

// Date range for filtering
const dateRangeStart = ref<string>('');
const dateRangeEnd = ref<string>('');

// Component refs
const dashboardRef = ref<InstanceType<typeof NetProfitDashboard> | null>(null);
const receivablesRef = ref<InstanceType<typeof AccountsReceivableTab> | null>(null);
const commissionsRef = ref<InstanceType<typeof CommissionsTab> | null>(null);
const reportsRef = ref<InstanceType<typeof ReportsTab> | null>(null);

// Summary
const summary = ref<Summary | null>(null);
const loadingSummary = ref(false);

// Payments
const payments = ref<Payment[]>([]);
const loadingPayments = ref(false);
const paymentFilter = ref<'all' | 'PENDING' | 'PAID' | 'OVERDUE'>('all');

// Transactions
const transactions = ref<Transaction[]>([]);
const loadingTransactions = ref(false);
const transactionFilter = ref<'all' | 'INCOME' | 'EXPENSE'>('all');

// Modals
const showPaymentModal = ref(false);
const showRecordPaymentModal = ref(false);
const showTransactionModal = ref(false);
const selectedPayment = ref<Payment | null>(null);

// Forms
const paymentForm = ref({
  patientId: '',
  description: '',
  amount: '',
  dueDate: new Date().toISOString().split('T')[0],
  installments: 1,
});

const recordPaymentForm = ref({
  amount: '',
  method: 'PIX',
  notes: '',
});

const transactionForm = ref({
  type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
  category: 'other',
  description: '',
  amount: '',
  method: 'PIX',
  date: new Date().toISOString().split('T')[0],
});

const saving = ref(false);
const patients = ref<{ id: string; name: string }[]>([]);

const paymentMethods = [
  { value: 'CASH', label: t('financial.paymentMethod.CASH') },
  { value: 'CREDIT_CARD', label: t('financial.paymentMethod.CREDIT_CARD') },
  { value: 'DEBIT_CARD', label: t('financial.paymentMethod.DEBIT_CARD') },
  { value: 'PIX', label: t('financial.paymentMethod.PIX') },
  { value: 'BANK_TRANSFER', label: t('financial.paymentMethod.BANK_TRANSFER') },
  { value: 'CHECK', label: t('financial.paymentMethod.CHECK') },
  { value: 'INSURANCE', label: t('financial.paymentMethod.INSURANCE') },
];

const categories = [
  { value: 'treatment', label: t('financial.categories.treatment') },
  { value: 'consultation', label: t('financial.categories.consultation') },
  { value: 'rent', label: t('financial.categories.rent') },
  { value: 'salary', label: t('financial.categories.salary') },
  { value: 'supplies', label: t('financial.categories.supplies') },
  { value: 'utilities', label: t('financial.categories.utilities') },
  { value: 'marketing', label: t('financial.categories.marketing') },
  { value: 'other', label: t('financial.categories.other') },
];

const filteredPayments = computed(() => {
  if (paymentFilter.value === 'all') return payments.value;
  if (paymentFilter.value === 'OVERDUE') {
    return payments.value.filter(
      (p) => ['PENDING', 'PARTIALLY_PAID'].includes(p.status) && new Date(p.dueDate) < new Date()
    );
  }
  return payments.value.filter((p) => p.status === paymentFilter.value);
});

const filteredTransactions = computed(() => {
  if (transactionFilter.value === 'all') return transactions.value;
  return transactions.value.filter((t) => t.type === transactionFilter.value);
});

async function fetchSummary() {
  loadingSummary.value = true;
  try {
    const response = await api.get('/financial/summary');
    summary.value = response.data.summary;
  } catch (error) {
    console.error('Failed to fetch summary:', error);
  } finally {
    loadingSummary.value = false;
  }
}

async function fetchPayments() {
  loadingPayments.value = true;
  try {
    const response = await api.get('/financial/payments');
    payments.value = response.data.payments;
  } catch (error) {
    console.error('Failed to fetch payments:', error);
  } finally {
    loadingPayments.value = false;
  }
}

async function fetchTransactions() {
  loadingTransactions.value = true;
  try {
    const response = await api.get('/financial/transactions');
    transactions.value = response.data.transactions;
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
  } finally {
    loadingTransactions.value = false;
  }
}

async function fetchPatients() {
  try {
    const response = await api.get('/patients?limit=100');
    patients.value = response.data.patients.map((p: any) => ({ id: p.id, name: p.name }));
  } catch (error) {
    console.error('Failed to fetch patients:', error);
  }
}

function openPaymentModal() {
  paymentForm.value = {
    patientId: '',
    description: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    installments: 1,
  };
  showPaymentModal.value = true;
}

async function createPayment() {
  saving.value = true;
  try {
    await api.post('/financial/payments', paymentForm.value);
    showPaymentModal.value = false;
    fetchPayments();
    fetchSummary();
  } catch (error) {
    console.error('Failed to create payment:', error);
  } finally {
    saving.value = false;
  }
}

function openRecordPayment(payment: Payment) {
  selectedPayment.value = payment;
  const remaining = Number(payment.amount) - Number(payment.paidAmount);
  recordPaymentForm.value = {
    amount: remaining.toFixed(2),
    method: 'PIX',
    notes: '',
  };
  showRecordPaymentModal.value = true;
}

async function recordPayment() {
  if (!selectedPayment.value) return;
  saving.value = true;
  try {
    await api.post(`/financial/payments/${selectedPayment.value.id}/pay`, recordPaymentForm.value);
    showRecordPaymentModal.value = false;
    fetchPayments();
    fetchTransactions();
    fetchSummary();
  } catch (error) {
    console.error('Failed to record payment:', error);
  } finally {
    saving.value = false;
  }
}

function openTransactionModal() {
  transactionForm.value = {
    type: 'EXPENSE',
    category: 'other',
    description: '',
    amount: '',
    method: 'PIX',
    date: new Date().toISOString().split('T')[0],
  };
  showTransactionModal.value = true;
}

async function createTransaction() {
  saving.value = true;
  try {
    await api.post('/financial/transactions', transactionForm.value);
    showTransactionModal.value = false;
    fetchTransactions();
    fetchSummary();
  } catch (error) {
    console.error('Failed to create transaction:', error);
  } finally {
    saving.value = false;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'PARTIALLY_PAID':
      return 'bg-blue-100 text-blue-800';
    case 'OVERDUE':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function isOverdue(payment: Payment): boolean {
  return (
    ['PENDING', 'PARTIALLY_PAID'].includes(payment.status) && new Date(payment.dueDate) < new Date()
  );
}

onMounted(() => {
  fetchSummary();
  fetchPayments();
  fetchTransactions();
  fetchPatients();
});
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('financial.title') }}</h1>
      <div class="flex gap-2">
        <button
          @click="openPaymentModal"
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          {{ t('financial.newPayment') }}
        </button>
        <button
          @click="openTransactionModal"
          class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          {{ t('financial.newTransaction') }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8 overflow-x-auto">
        <button
          v-for="tab in [
            { id: 'dashboard', label: t('financial.dashboard') },
            { id: 'receivables', label: t('financial.accountsReceivable') },
            { id: 'commissions', label: t('financial.commissions.title') },
            { id: 'reports', label: t('financial.reports.title') },
            { id: 'payments', label: t('financial.payments') },
            { id: 'transactions', label: t('financial.transactions') },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id as TabType"
          :class="[
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
          ]"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Dashboard Tab (Net Profit) -->
    <div v-if="activeTab === 'dashboard'">
      <NetProfitDashboard
        ref="dashboardRef"
        :start-date="dateRangeStart"
        :end-date="dateRangeEnd"
      />
    </div>

    <!-- Accounts Receivable Tab -->
    <div v-if="activeTab === 'receivables'">
      <AccountsReceivableTab ref="receivablesRef" />
    </div>

    <!-- Commissions Tab -->
    <div v-if="activeTab === 'commissions'">
      <CommissionsTab
        ref="commissionsRef"
        :start-date="dateRangeStart"
        :end-date="dateRangeEnd"
      />
    </div>

    <!-- Reports Tab -->
    <div v-if="activeTab === 'reports'">
      <ReportsTab
        ref="reportsRef"
        :start-date="dateRangeStart"
        :end-date="dateRangeEnd"
      />
    </div>

    <!-- Payments Tab -->
    <div v-if="activeTab === 'payments'">
      <div class="flex gap-2 mb-4">
        <button
          v-for="filter in [
            { value: 'all', label: 'Todos' },
            { value: 'PENDING', label: t('financial.paymentStatus.PENDING') },
            { value: 'PAID', label: t('financial.paymentStatus.PAID') },
            { value: 'OVERDUE', label: t('financial.overdue') },
          ]"
          :key="filter.value"
          @click="paymentFilter = filter.value as any"
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            paymentFilter === filter.value
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="loadingPayments" class="text-center py-8 text-gray-500">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="filteredPayments.length === 0" class="text-center py-8 text-gray-500">
        {{ t('financial.noPayments') }}
      </div>
      <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('financial.description') }}</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('financial.amount') }}</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{{ t('financial.dueDate') }}</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="payment in filteredPayments" :key="payment.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ payment.patient.name }}</p>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ payment.description }}</td>
              <td class="px-4 py-3 text-right">
                <p class="font-medium text-gray-900">{{ n(Number(payment.amount), 'currency') }}</p>
                <p v-if="Number(payment.paidAmount) > 0" class="text-xs text-green-600">
                  Pago: {{ n(Number(payment.paidAmount), 'currency') }}
                </p>
              </td>
              <td class="px-4 py-3 text-center text-gray-600">
                {{ d(new Date(payment.dueDate), 'short') }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    isOverdue(payment) ? 'bg-red-100 text-red-800' : getStatusColor(payment.status),
                  ]"
                >
                  {{ isOverdue(payment) ? t('financial.paymentStatus.OVERDUE') : t(`financial.paymentStatus.${payment.status}`) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="payment.status !== 'PAID' && payment.status !== 'CANCELLED'"
                  @click="openRecordPayment(payment)"
                  class="text-sm text-primary hover:underline"
                >
                  {{ t('financial.recordPayment') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transactions Tab -->
    <div v-if="activeTab === 'transactions'">
      <div class="flex gap-2 mb-4">
        <button
          v-for="filter in [
            { value: 'all', label: 'Todos' },
            { value: 'INCOME', label: t('financial.transactionType.INCOME') },
            { value: 'EXPENSE', label: t('financial.transactionType.EXPENSE') },
          ]"
          :key="filter.value"
          @click="transactionFilter = filter.value as any"
          :class="[
            'px-3 py-1.5 text-sm rounded-lg transition-colors',
            transactionFilter === filter.value
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ]"
        >
          {{ filter.label }}
        </button>
      </div>

      <div v-if="loadingTransactions" class="text-center py-8 text-gray-500">
        {{ t('common.loading') }}
      </div>
      <div v-else-if="filteredTransactions.length === 0" class="text-center py-8 text-gray-500">
        {{ t('financial.noTransactions') }}
      </div>
      <div v-else class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('financial.description') }}</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{{ t('financial.category') }}</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{{ t('financial.amount') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="tx in filteredTransactions" :key="tx.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-gray-600">{{ d(new Date(tx.date), 'short') }}</td>
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900">{{ tx.description }}</p>
                <p v-if="tx.payment?.patient?.name" class="text-xs text-gray-500">
                  {{ tx.payment.patient.name }}
                </p>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ t(`financial.categories.${tx.category}`) }}</td>
              <td class="px-4 py-3 text-right">
                <span :class="tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'" class="font-medium">
                  {{ tx.type === 'INCOME' ? '+' : '-' }}{{ n(Number(tx.amount), 'currency') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Payment Modal -->
    <Modal :open="showPaymentModal" :title="t('financial.newPayment')" @close="showPaymentModal = false">
      <form @submit.prevent="createPayment" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Paciente *</label>
          <select
            v-model="paymentForm.patientId"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Selecione...</option>
            <option v-for="p in patients" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.description') }} *</label>
          <input
            v-model="paymentForm.description"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('financial.amount') }} (R$) *</label>
            <input
              v-model="paymentForm.amount"
              type="number"
              step="0.01"
              min="0"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('financial.installments') }}</label>
            <select
              v-model="paymentForm.installments"
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option v-for="i in 12" :key="i" :value="i">{{ i }}x</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.dueDate') }} *</label>
          <input
            v-model="paymentForm.dueDate"
            type="date"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showPaymentModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="createPayment"
            :disabled="saving || !paymentForm.patientId || !paymentForm.amount"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Record Payment Modal -->
    <Modal :open="showRecordPaymentModal" :title="t('financial.recordPayment')" @close="showRecordPaymentModal = false">
      <div v-if="selectedPayment" class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="font-medium">{{ selectedPayment.description }}</p>
          <p class="text-sm text-gray-500">{{ selectedPayment.patient.name }}</p>
          <div class="mt-2 flex justify-between text-sm">
            <span>Total: {{ n(Number(selectedPayment.amount), 'currency') }}</span>
            <span class="text-green-600">Pago: {{ n(Number(selectedPayment.paidAmount), 'currency') }}</span>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.amount') }} (R$) *</label>
          <input
            v-model="recordPaymentForm.amount"
            type="number"
            step="0.01"
            min="0"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.method') }} *</label>
          <select
            v-model="recordPaymentForm.method"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showRecordPaymentModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="recordPayment"
            :disabled="saving || !recordPaymentForm.amount"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? t('common.loading') : t('financial.recordPayment') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- New Transaction Modal -->
    <Modal :open="showTransactionModal" :title="t('financial.newTransaction')" @close="showTransactionModal = false">
      <form @submit.prevent="createTransaction" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Tipo *</label>
          <div class="mt-2 flex gap-4">
            <label class="flex items-center gap-2">
              <input type="radio" v-model="transactionForm.type" value="INCOME" class="text-primary" />
              <span>{{ t('financial.transactionType.INCOME') }}</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" v-model="transactionForm.type" value="EXPENSE" class="text-primary" />
              <span>{{ t('financial.transactionType.EXPENSE') }}</span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.category') }} *</label>
          <select
            v-model="transactionForm.category"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.description') }} *</label>
          <input
            v-model="transactionForm.description"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">{{ t('financial.amount') }} (R$) *</label>
            <input
              v-model="transactionForm.amount"
              type="number"
              step="0.01"
              min="0"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Data *</label>
            <input
              v-model="transactionForm.date"
              type="date"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">{{ t('financial.method') }}</label>
          <select
            v-model="transactionForm.method"
            class="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showTransactionModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="createTransaction"
            :disabled="saving || !transactionForm.description || !transactionForm.amount"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {{ saving ? t('common.loading') : t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

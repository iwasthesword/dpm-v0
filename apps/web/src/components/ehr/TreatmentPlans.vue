<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import Modal from '@/components/ui/Modal.vue';

const props = defineProps<{
  patientId: string;
}>();

const { t, n, d } = useI18n();

interface TreatmentPlanItem {
  id: string;
  tooth?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes?: string;
  procedure: { id: string; name: string; code?: string };
}

interface TreatmentPlan {
  id: string;
  name: string;
  description?: string;
  totalCost: string;
  status: string;
  createdAt: string;
  professional: { id: string; name: string };
  items: TreatmentPlanItem[];
}

interface Procedure {
  id: string;
  name: string;
  code?: string;
  price: string;
}

interface TreatmentSuggestion {
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  tooth: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedCost: number;
}

const plans = ref<TreatmentPlan[]>([]);
const procedures = ref<Procedure[]>([]);
const loading = ref(true);
const showCreateModal = ref(false);
const saving = ref(false);
const expandedPlanId = ref<string | null>(null);

// Form data
const formData = ref({
  name: '',
  description: '',
  items: [] as Array<{
    procedureId: string;
    tooth: string;
    quantity: number;
    unitPrice: number;
  }>,
});

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
});

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: t('treatments.planStatus.draft'),
    PRESENTED: t('treatments.planStatus.presented'),
    APPROVED: t('treatments.planStatus.approved'),
    IN_PROGRESS: t('treatments.planStatus.inProgress'),
    COMPLETED: t('treatments.planStatus.completed'),
    REJECTED: t('treatments.planStatus.rejected'),
  };
  return statusMap[status] || status;
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PRESENTED: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

async function fetchPlans() {
  loading.value = true;
  try {
    const response = await api.get(`/ehr/patients/${props.patientId}/treatment-plans`);
    plans.value = response.data.plans;
  } catch (error) {
    console.error('Failed to fetch treatment plans:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchProcedures() {
  try {
    const response = await api.get('/clinics/procedures');
    procedures.value = response.data.procedures || [];
  } catch (error) {
    console.error('Failed to fetch procedures:', error);
  }
}

function addItem() {
  formData.value.items.push({
    procedureId: '',
    tooth: '',
    quantity: 1,
    unitPrice: 0,
  });
}

function removeItem(index: number) {
  formData.value.items.splice(index, 1);
}

function onProcedureChange(index: number) {
  const item = formData.value.items[index];
  const proc = procedures.value.find(p => p.id === item.procedureId);
  if (proc) {
    item.unitPrice = parseFloat(proc.price);
  }
}

function openCreateModal() {
  formData.value = {
    name: '',
    description: '',
    items: [],
  };
  showCreateModal.value = true;
}

async function createPlan() {
  if (!formData.value.name || formData.value.items.length === 0) return;

  saving.value = true;
  try {
    await api.post(`/ehr/patients/${props.patientId}/treatment-plans`, {
      name: formData.value.name,
      description: formData.value.description,
      items: formData.value.items.map(item => ({
        procedureId: item.procedureId,
        tooth: item.tooth || undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
    showCreateModal.value = false;
    await fetchPlans();
  } catch (error) {
    console.error('Failed to create plan:', error);
  } finally {
    saving.value = false;
  }
}

async function updateStatus(planId: string, status: string) {
  try {
    await api.patch(`/ehr/patients/${props.patientId}/treatment-plans/${planId}/status`, {
      status,
    });
    await fetchPlans();
  } catch (error) {
    console.error('Failed to update status:', error);
  }
}

function toggleExpand(planId: string) {
  expandedPlanId.value = expandedPlanId.value === planId ? null : planId;
}

function addSuggestionToNewPlan(suggestion: TreatmentSuggestion) {
  // Open the create modal with the suggestion pre-filled
  formData.value = {
    name: `${t('treatments.treatmentFor')} ${t('ehr.suggestions.tooth')} ${suggestion.tooth}`,
    description: suggestion.reason,
    items: [{
      procedureId: suggestion.procedureId,
      tooth: String(suggestion.tooth),
      quantity: 1,
      unitPrice: suggestion.estimatedCost,
    }],
  };
  showCreateModal.value = true;
}

onMounted(() => {
  fetchPlans();
  fetchProcedures();
});

defineExpose({
  addSuggestionToNewPlan,
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">{{ t('treatments.treatmentPlans') }}</h3>
      <button
        class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        @click="openCreateModal"
      >
        {{ t('treatments.createPlan') }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-gray-500">
      {{ t('common.loading') }}
    </div>

    <div v-else-if="plans.length === 0" class="text-center py-8 text-gray-500">
      {{ t('treatments.noTreatmentPlans') }}
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="border border-gray-200 rounded-lg overflow-hidden"
      >
        <!-- Plan Header -->
        <div
          class="p-4 bg-gray-50 cursor-pointer flex items-center justify-between"
          @click="toggleExpand(plan.id)"
        >
          <div>
            <h4 class="font-medium text-gray-900">{{ plan.name }}</h4>
            <p class="text-sm text-gray-500">
              {{ plan.professional.name }} - {{ d(new Date(plan.createdAt), 'short') }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-semibold text-gray-900">
              {{ n(parseFloat(plan.totalCost), 'currency') }}
            </span>
            <span :class="['px-2 py-1 text-xs rounded-full', getStatusClass(plan.status)]">
              {{ getStatusLabel(plan.status) }}
            </span>
          </div>
        </div>

        <!-- Expanded Content -->
        <div v-if="expandedPlanId === plan.id" class="p-4 border-t border-gray-200">
          <p v-if="plan.description" class="text-sm text-gray-600 mb-4">{{ plan.description }}</p>

          <!-- Items Table -->
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-left text-gray-500">{{ t('treatments.procedure') }}</th>
                <th class="px-3 py-2 text-left text-gray-500">{{ t('treatments.tooth') }}</th>
                <th class="px-3 py-2 text-right text-gray-500">{{ t('treatments.quantity') }}</th>
                <th class="px-3 py-2 text-right text-gray-500">{{ t('treatments.unitPrice') }}</th>
                <th class="px-3 py-2 text-right text-gray-500">{{ t('treatments.total') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="item in plan.items" :key="item.id">
                <td class="px-3 py-2 text-gray-900">
                  {{ item.procedure.name }}
                  <span v-if="item.procedure.code" class="text-gray-400 text-xs">
                    ({{ item.procedure.code }})
                  </span>
                </td>
                <td class="px-3 py-2 text-gray-600">{{ item.tooth || '-' }}</td>
                <td class="px-3 py-2 text-right text-gray-600">{{ item.quantity }}</td>
                <td class="px-3 py-2 text-right text-gray-600">
                  {{ n(parseFloat(item.unitPrice), 'currency') }}
                </td>
                <td class="px-3 py-2 text-right font-medium text-gray-900">
                  {{ n(parseFloat(item.totalPrice), 'currency') }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Status Actions -->
          <div v-if="plan.status === 'DRAFT'" class="mt-4 flex gap-2">
            <button
              class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              @click="updateStatus(plan.id, 'PRESENTED')"
            >
              {{ t('treatments.planStatus.presented') }}
            </button>
          </div>
          <div v-else-if="plan.status === 'PRESENTED'" class="mt-4 flex gap-2">
            <button
              class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              @click="updateStatus(plan.id, 'APPROVED')"
            >
              {{ t('treatments.planStatus.approved') }}
            </button>
            <button
              class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              @click="updateStatus(plan.id, 'REJECTED')"
            >
              {{ t('treatments.planStatus.rejected') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Plan Modal -->
    <Modal :open="showCreateModal" :title="t('treatments.createPlan')" size="lg" @close="showCreateModal = false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('treatments.planName') }} *
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t('treatments.planDescription') }}
          </label>
          <textarea
            v-model="formData.description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <!-- Items -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-700">{{ t('treatments.procedures') }}</label>
            <button
              type="button"
              class="text-sm text-primary hover:text-primary/80"
              @click="addItem"
            >
              + {{ t('treatments.addItem') }}
            </button>
          </div>

          <div v-if="formData.items.length === 0" class="text-center py-4 text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
            {{ t('treatments.addItem') }}
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(item, index) in formData.items"
              :key="index"
              class="p-3 bg-gray-50 rounded-lg"
            >
              <div class="grid grid-cols-4 gap-3">
                <div class="col-span-2">
                  <select
                    v-model="item.procedureId"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                    @change="onProcedureChange(index)"
                  >
                    <option value="">{{ t('treatments.procedure') }}</option>
                    <option v-for="proc in procedures" :key="proc.id" :value="proc.id">
                      {{ proc.name }} - {{ n(parseFloat(proc.price), 'currency') }}
                    </option>
                  </select>
                </div>
                <div>
                  <input
                    v-model="item.tooth"
                    type="text"
                    :placeholder="t('treatments.tooth')"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="w-16 px-2 py-2 border border-gray-300 rounded-lg text-center"
                  />
                  <button
                    type="button"
                    class="text-red-500 hover:text-red-700"
                    @click="removeItem(index)"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div class="mt-2 text-right text-sm text-gray-600">
                {{ n(item.unitPrice * item.quantity, 'currency') }}
              </div>
            </div>
          </div>

          <div v-if="formData.items.length > 0" class="mt-3 text-right font-semibold">
            {{ t('treatments.total') }}: {{ n(totalCost, 'currency') }}
          </div>
        </div>
      </div>

      <template #footer>
        <button
          class="px-4 py-2 text-gray-600 hover:text-gray-800"
          @click="showCreateModal = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          :disabled="!formData.name || formData.items.length === 0 || saving"
          @click="createPlan"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

interface PatientRiskProfile {
  noShowRisk: 'low' | 'medium' | 'high';
  noShowRate: number;
  noShowCount: number;
  totalAppointments: number;
  treatmentCompliance: number;
  completedPlans: number;
  totalApprovedPlans: number;
  paymentReliability: 'good' | 'fair' | 'poor';
  overdueAmount: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
}

const props = defineProps<{
  patientId: string;
  compact?: boolean;
}>();

const { t, n, d } = useI18n();

const riskProfile = ref<PatientRiskProfile | null>(null);
const loading = ref(true);

async function fetchRiskProfile() {
  loading.value = true;
  try {
    const response = await api.get(`/ehr/patients/${props.patientId}/risk-profile`);
    riskProfile.value = response.data.riskProfile;
  } catch (err) {
    console.error('Failed to fetch risk profile:', err);
  } finally {
    loading.value = false;
  }
}

function formatCurrency(value: number): string {
  return n(value, 'currency');
}

const noShowBadgeClass = computed(() => {
  if (!riskProfile.value) return '';
  switch (riskProfile.value.noShowRisk) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-green-100 text-green-800 border-green-200';
  }
});

const complianceBadgeClass = computed(() => {
  if (!riskProfile.value) return '';
  const compliance = riskProfile.value.treatmentCompliance;
  if (compliance >= 80) return 'bg-green-100 text-green-800 border-green-200';
  if (compliance >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
});

const paymentBadgeClass = computed(() => {
  if (!riskProfile.value) return '';
  switch (riskProfile.value.paymentReliability) {
    case 'good': return 'bg-green-100 text-green-800 border-green-200';
    case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-red-100 text-red-800 border-red-200';
  }
});

const visitAlertClass = computed(() => {
  if (!riskProfile.value?.daysSinceLastVisit) return '';
  const days = riskProfile.value.daysSinceLastVisit;
  if (days > 365) return 'text-red-600';
  if (days > 180) return 'text-yellow-600';
  return 'text-gray-500';
});

onMounted(fetchRiskProfile);

defineExpose({ refresh: fetchRiskProfile });
</script>

<template>
  <div v-if="loading" class="flex gap-2">
    <div class="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
    <div class="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
    <div class="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
  </div>

  <div v-else-if="riskProfile" :class="compact ? 'flex flex-wrap gap-2' : 'space-y-3'">
    <!-- Compact Mode -->
    <template v-if="compact">
      <!-- No-Show Risk Badge -->
      <div
        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border"
        :class="noShowBadgeClass"
        :title="`${riskProfile.noShowCount} faltas em ${riskProfile.totalAppointments} consultas`"
      >
        <span>!</span>
        <span>{{ t(`ehr.risk.noShow.${riskProfile.noShowRisk}`) }}</span>
      </div>

      <!-- Compliance Badge -->
      <div
        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border"
        :class="complianceBadgeClass"
        :title="`${riskProfile.completedPlans}/${riskProfile.totalApprovedPlans} planos concluídos`"
      >
        <span>+</span>
        <span>{{ Math.round(riskProfile.treatmentCompliance) }}%</span>
      </div>

      <!-- Payment Badge -->
      <div
        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border"
        :class="paymentBadgeClass"
        :title="riskProfile.overdueAmount > 0 ? `${formatCurrency(riskProfile.overdueAmount)} em atraso` : 'Sem pendências'"
      >
        <span>$</span>
        <span>{{ t(`ehr.risk.payment.${riskProfile.paymentReliability}`) }}</span>
      </div>
    </template>

    <!-- Full Mode -->
    <template v-else>
      <!-- No-Show Risk -->
      <div class="flex items-center justify-between p-3 rounded-lg border" :class="noShowBadgeClass">
        <div class="flex items-center gap-2">
          <span class="text-lg">!</span>
          <div>
            <p class="font-medium">{{ t('ehr.risk.noShowRisk') }}</p>
            <p class="text-sm opacity-80">
              {{ riskProfile.noShowCount }} {{ t('ehr.risk.noShowsIn') }} {{ riskProfile.totalAppointments }} {{ t('ehr.risk.appointments') }}
            </p>
          </div>
        </div>
        <span class="text-lg font-semibold">{{ t(`ehr.risk.noShow.${riskProfile.noShowRisk}`) }}</span>
      </div>

      <!-- Treatment Compliance -->
      <div class="flex items-center justify-between p-3 rounded-lg border" :class="complianceBadgeClass">
        <div class="flex items-center gap-2">
          <span class="text-lg">+</span>
          <div>
            <p class="font-medium">{{ t('ehr.risk.treatmentCompliance') }}</p>
            <p class="text-sm opacity-80">
              {{ riskProfile.completedPlans }}/{{ riskProfile.totalApprovedPlans }} {{ t('ehr.risk.plansCompleted') }}
            </p>
          </div>
        </div>
        <span class="text-lg font-semibold">{{ Math.round(riskProfile.treatmentCompliance) }}%</span>
      </div>

      <!-- Payment Reliability -->
      <div class="flex items-center justify-between p-3 rounded-lg border" :class="paymentBadgeClass">
        <div class="flex items-center gap-2">
          <span class="text-lg">$</span>
          <div>
            <p class="font-medium">{{ t('ehr.risk.paymentReliability') }}</p>
            <p v-if="riskProfile.overdueAmount > 0" class="text-sm opacity-80">
              {{ formatCurrency(riskProfile.overdueAmount) }} {{ t('ehr.risk.overdue') }}
            </p>
            <p v-else class="text-sm opacity-80">{{ t('ehr.risk.noPendingPayments') }}</p>
          </div>
        </div>
        <span class="text-lg font-semibold">{{ t(`ehr.risk.payment.${riskProfile.paymentReliability}`) }}</span>
      </div>

      <!-- Last Visit -->
      <div v-if="riskProfile.daysSinceLastVisit !== null" class="flex items-center gap-2 text-sm" :class="visitAlertClass">
        <span>~</span>
        <span>
          {{ t('ehr.risk.lastVisit') }}:
          <template v-if="riskProfile.lastVisit">
            {{ d(new Date(riskProfile.lastVisit), 'short') }}
            ({{ riskProfile.daysSinceLastVisit }} {{ t('time.days') }})
          </template>
          <template v-else>{{ t('ehr.risk.noVisitRecorded') }}</template>
        </span>
      </div>
    </template>
  </div>
</template>

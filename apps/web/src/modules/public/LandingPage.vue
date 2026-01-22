<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';
import { useAuthStore } from '@/stores/auth';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  billingPeriod: string;
  maxUsers: number;
  maxPatients: number;
  maxAppointments: number;
  features: string[];
}

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const plans = ref<Plan[]>([]);
const loading = ref(true);

onMounted(async () => {
  // Redirect if already authenticated
  if (authStore.isAuthenticated) {
    router.push('/');
    return;
  }

  try {
    const response = await api.get('/public/plans');
    plans.value = response.data.plans;
  } catch (error) {
    console.error('Failed to load plans:', error);
  } finally {
    loading.value = false;
  }
});

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

function formatLimit(value: number, singular: string, plural: string): string {
  if (value === -1) return `${plural} ilimitados`;
  return `${value} ${value === 1 ? singular : plural}`;
}

function getPlanFeatures(plan: Plan): string[] {
  const baseFeatures = [
    formatLimit(plan.maxUsers, 'usuário', 'Usuários'),
    formatLimit(plan.maxPatients, 'paciente', 'Pacientes'),
    plan.maxAppointments === -1 ? 'Consultas ilimitadas' : `${plan.maxAppointments} consultas/mês`,
  ];
  const extraFeatures = Array.isArray(plan.features) ? plan.features : [];
  return [...baseFeatures, ...extraFeatures];
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <h1 class="text-2xl font-bold text-primary">{{ t('common.appName') }}</h1>
          <span class="text-sm text-gray-500">{{ t('common.appFullName') }}</span>
        </div>
        <div class="flex items-center space-x-4">
          <router-link
            to="/login"
            class="text-gray-600 hover:text-gray-900 font-medium"
          >
            {{ t('auth.signIn') }}
          </router-link>
          <router-link
            to="/register"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 font-medium"
          >
            {{ t('landing.startFreeTrial') }}
          </router-link>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-20 bg-gradient-to-b from-primary/5 to-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          {{ t('landing.heroTitle') }}
        </h2>
        <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          {{ t('landing.heroSubtitle') }}
        </p>
        <div class="flex justify-center space-x-4">
          <router-link
            to="/register"
            class="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium text-lg"
          >
            {{ t('landing.startFreeTrial') }}
          </router-link>
          <a
            href="#features"
            class="px-8 py-3 border border-primary text-primary rounded-lg hover:bg-primary/5 font-medium text-lg"
          >
            {{ t('landing.learnMore') }}
          </a>
        </div>
        <p class="mt-4 text-sm text-gray-500">
          {{ t('landing.trialInfo') }}
        </p>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 class="text-3xl font-bold text-center text-gray-900 mb-12">
          {{ t('landing.featuresTitle') }}
        </h3>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.scheduling') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.schedulingDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.patients') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.patientsDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.financial') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.financialDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.documents') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.documentsDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.reminders') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.remindersDesc') }}</p>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border">
            <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h4 class="text-lg font-semibold mb-2">{{ t('landing.features.reports') }}</h4>
            <p class="text-gray-600">{{ t('landing.features.reportsDesc') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-20 bg-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 class="text-3xl font-bold text-center text-gray-900 mb-4">
          {{ t('landing.pricingTitle') }}
        </h3>
        <p class="text-center text-gray-600 mb-12">
          {{ t('landing.pricingSubtitle') }}
        </p>

        <div v-if="loading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>

        <div v-else class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="bg-white rounded-lg shadow-sm border p-6 flex flex-col"
            :class="{ 'ring-2 ring-primary': plan.tier === 'PROFESSIONAL' }"
          >
            <div v-if="plan.tier === 'PROFESSIONAL'" class="text-center mb-2">
              <span class="bg-primary text-white text-xs px-2 py-1 rounded-full">
                {{ t('landing.mostPopular') }}
              </span>
            </div>
            <h4 class="text-xl font-bold text-gray-900 mb-2">{{ plan.name }}</h4>
            <div class="mb-4">
              <span class="text-3xl font-bold">{{ formatPrice(plan.price) }}</span>
              <span class="text-gray-500">/{{ plan.billingPeriod === 'yearly' ? 'ano' : 'mês' }}</span>
            </div>
            <ul class="space-y-2 mb-6 flex-grow">
              <li
                v-for="(feature, idx) in getPlanFeatures(plan)"
                :key="idx"
                class="flex items-start text-sm text-gray-600"
              >
                <svg class="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ feature }}
              </li>
            </ul>
            <router-link
              :to="{ path: '/register', query: { plan: plan.id } }"
              class="w-full py-2 px-4 text-center rounded-md font-medium"
              :class="plan.tier === 'PROFESSIONAL'
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'"
            >
              {{ plan.price === 0 ? t('landing.startFree') : t('landing.selectPlan') }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-primary">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h3 class="text-3xl font-bold text-white mb-4">
          {{ t('landing.ctaTitle') }}
        </h3>
        <p class="text-lg text-white/80 mb-8">
          {{ t('landing.ctaSubtitle') }}
        </p>
        <router-link
          to="/register"
          class="inline-block px-8 py-3 bg-white text-primary rounded-lg hover:bg-gray-100 font-medium text-lg"
        >
          {{ t('landing.startFreeTrial') }}
        </router-link>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-400 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <h5 class="text-white font-bold mb-4">{{ t('common.appName') }}</h5>
            <p class="text-sm">{{ t('landing.footerDescription') }}</p>
          </div>
          <div>
            <h5 class="text-white font-bold mb-4">{{ t('landing.product') }}</h5>
            <ul class="space-y-2 text-sm">
              <li><a href="#features" class="hover:text-white">{{ t('landing.features.title') }}</a></li>
              <li><a href="#pricing" class="hover:text-white">{{ t('landing.pricing') }}</a></li>
            </ul>
          </div>
          <div>
            <h5 class="text-white font-bold mb-4">{{ t('landing.support') }}</h5>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white">{{ t('landing.helpCenter') }}</a></li>
              <li><a href="#" class="hover:text-white">{{ t('landing.contact') }}</a></li>
            </ul>
          </div>
          <div>
            <h5 class="text-white font-bold mb-4">{{ t('landing.legal') }}</h5>
            <ul class="space-y-2 text-sm">
              <li><a href="#" class="hover:text-white">{{ t('landing.privacy') }}</a></li>
              <li><a href="#" class="hover:text-white">{{ t('landing.terms') }}</a></li>
            </ul>
          </div>
        </div>
        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {{ new Date().getFullYear() }} {{ t('common.appName') }}. {{ t('landing.allRightsReserved') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

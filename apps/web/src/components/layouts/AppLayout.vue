<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { setLocale, getLocale } from '@/i18n';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const navigation = computed(() => [
  { name: t('nav.dashboard'), href: '/', icon: 'home' },
  { name: t('nav.schedule'), href: '/schedule', icon: 'calendar' },
  { name: t('nav.patients'), href: '/patients', icon: 'users' },
  { name: t('financial.title'), href: '/financial', icon: 'dollar' },
  { name: t('satisfaction.title'), href: '/satisfaction', icon: 'star' },
  { name: t('campaigns.title'), href: '/campaigns', icon: 'megaphone' },
  { name: t('compliance.title'), href: '/compliance', icon: 'document' },
  { name: t('reports.title'), href: '/reports', icon: 'chart' },
  { name: t('help.title'), href: '/help', icon: 'help' },
  { name: t('nav.settings'), href: '/settings', icon: 'settings' },
]);

const currentPath = computed(() => route.path);
const currentLocale = computed(() => getLocale());

function toggleLocale() {
  const newLocale = currentLocale.value === 'pt-BR' ? 'en' : 'pt-BR';
  setLocale(newLocale);
}

async function handleLogout() {
  await authStore.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
      <div class="flex h-16 items-center justify-center border-b border-gray-200">
        <h1 class="text-2xl font-bold text-primary">{{ t('common.appName') }}</h1>
      </div>

      <nav class="flex flex-col gap-1 p-4">
        <RouterLink
          v-for="item in navigation"
          :key="item.href"
          :to="item.href"
          :class="[
            currentPath === item.href
              ? 'bg-primary/10 text-primary'
              : 'text-gray-600 hover:bg-gray-100',
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          ]"
        >
          {{ item.name }}
        </RouterLink>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button
            @click="toggleLocale"
            class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
            :title="currentLocale === 'pt-BR' ? 'Switch to English' : 'Mudar para Português'"
          >
            {{ currentLocale === 'pt-BR' ? '🇧🇷 PT' : '🇺🇸 EN' }}
          </button>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ authStore.user?.name }}
            </p>
            <p class="text-xs text-gray-500 truncate">
              {{ authStore.user?.email }}
            </p>
          </div>
          <button
            @click="handleLogout"
            class="text-gray-400 hover:text-gray-600 text-sm"
            :title="t('auth.logout')"
          >
            {{ t('auth.logout') }}
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="pl-64">
      <div class="p-8">
        <RouterView />
      </div>
    </main>
  </div>
</template>

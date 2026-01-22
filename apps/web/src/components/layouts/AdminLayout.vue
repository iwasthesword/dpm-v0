<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import adminApi, { adminLogout } from '@/api/adminClient';

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

const { t } = useI18n();
const router = useRouter();

const admin = ref<AdminUser | null>(null);
const loading = ref(true);
const sidebarOpen = ref(true);

const navItems = [
  { name: 'admin.dashboard', path: '/admin', icon: 'dashboard' },
  { name: 'admin.clinics', path: '/admin/clinics', icon: 'clinics' },
];

onMounted(async () => {
  // Check for admin token
  const adminToken = localStorage.getItem('adminAccessToken');
  if (!adminToken) {
    router.push('/admin/login');
    return;
  }

  try {
    // Verify admin session
    const response = await adminApi.get('/admin/auth/me');
    admin.value = response.data.admin;
  } catch {
    adminLogout();
  } finally {
    loading.value = false;
  }
});

function logout() {
  adminLogout();
}
</script>

<template>
  <div v-if="loading" class="min-h-screen flex items-center justify-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>

  <div v-else class="min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside
      :class="sidebarOpen ? 'w-64' : 'w-20'"
      class="fixed inset-y-0 left-0 bg-gray-900 text-white transition-all duration-300 z-30"
    >
      <div class="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        <span v-if="sidebarOpen" class="text-xl font-bold">{{ t('common.appName') }} Admin</span>
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 rounded-md hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav class="mt-4 px-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-4 py-3 mb-1 rounded-md hover:bg-gray-800 transition-colors"
          :class="{ 'bg-gray-800': $route.path === item.path }"
        >
          <svg v-if="item.icon === 'dashboard'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <svg v-if="item.icon === 'clinics'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span v-if="sidebarOpen" class="ml-3">{{ t(item.name) }}</span>
        </router-link>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div v-if="sidebarOpen" class="flex items-center justify-between">
          <div class="text-sm truncate">
            <p class="font-medium">{{ admin?.name }}</p>
            <p class="text-gray-400 text-xs">{{ admin?.email }}</p>
          </div>
          <button @click="logout" class="p-2 rounded-md hover:bg-gray-800" :title="t('admin.logout')">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        <button v-else @click="logout" class="w-full p-2 rounded-md hover:bg-gray-800" :title="t('admin.logout')">
          <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main :class="sidebarOpen ? 'ml-64' : 'ml-20'" class="transition-all duration-300 min-h-screen">
      <header class="bg-white shadow-sm h-16 flex items-center px-6">
        <h1 class="text-xl font-semibold text-gray-900">{{ t('admin.title') }}</h1>
      </header>
      <div class="p-6">
        <router-view />
      </div>
    </main>
  </div>
</template>

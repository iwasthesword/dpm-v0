<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <router-link to="/landing" class="flex items-center space-x-2">
            <h1 class="text-2xl font-bold text-primary">{{ t('common.appName') }}</h1>
            <span class="text-sm text-gray-500 hidden sm:inline">{{ t('common.appFullName') }}</span>
          </router-link>
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

    <!-- Main Content -->
    <main class="flex-grow">
      <slot />
    </main>

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
              <li><router-link to="/landing#features" class="hover:text-white">{{ t('landing.features.title') }}</router-link></li>
              <li><router-link to="/landing#pricing" class="hover:text-white">{{ t('landing.pricing') }}</router-link></li>
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

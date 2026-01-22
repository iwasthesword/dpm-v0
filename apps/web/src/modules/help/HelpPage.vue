<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api/client';

const { t } = useI18n();

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: string;
  order: number;
  viewCount: number;
}

interface ArticlesByCategory {
  category: string;
  articles: HelpArticle[];
}

const categories = ref<ArticlesByCategory[]>([]);
const selectedArticle = ref<HelpArticle | null>(null);
const searchQuery = ref('');
const searchResults = ref<HelpArticle[]>([]);
const loading = ref(false);
const searching = ref(false);

const categoryLabels: Record<string, string> = {
  GETTING_STARTED: t('help.categories.GETTING_STARTED'),
  PATIENTS: t('help.categories.PATIENTS'),
  SCHEDULING: t('help.categories.SCHEDULING'),
  FINANCIAL: t('help.categories.FINANCIAL'),
  CLINICAL: t('help.categories.CLINICAL'),
  SETTINGS: t('help.categories.SETTINGS'),
  FAQ: t('help.categories.FAQ'),
};

const categoryIcons: Record<string, string> = {
  GETTING_STARTED: 'M13 10V3L4 14h7v7l9-11h-7z',
  PATIENTS:
    'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  SCHEDULING:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  FINANCIAL:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  CLINICAL:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  SETTINGS:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  FAQ: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const showingResults = computed(() => searchQuery.value.length >= 2 && searchResults.value.length > 0);

async function fetchArticles() {
  loading.value = true;
  try {
    const response = await api.get('/help/articles/by-category');
    categories.value = response.data.categories;
  } catch (error) {
    console.error('Failed to fetch articles:', error);
  } finally {
    loading.value = false;
  }
}

async function searchArticles() {
  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  searching.value = true;
  try {
    const response = await api.get(`/help/articles/search?q=${encodeURIComponent(searchQuery.value)}`);
    searchResults.value = response.data.articles;
  } catch (error) {
    console.error('Failed to search articles:', error);
  } finally {
    searching.value = false;
  }
}

async function viewArticle(article: HelpArticle) {
  selectedArticle.value = article;
  searchQuery.value = '';
  searchResults.value = [];

  // Increment view count
  try {
    await api.post(`/help/articles/${article.slug}/view`);
  } catch (error) {
    // Ignore errors
  }
}

function closeArticle() {
  selectedArticle.value = null;
}

function renderMarkdown(content: string): string {
  // Simple markdown rendering (basic)
  return content
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

onMounted(() => {
  fetchArticles();
});
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">{{ t('help.title') }}</h1>
      <p class="text-gray-500">{{ t('help.subtitle') }}</p>
    </div>

    <!-- Search -->
    <div class="relative mb-8">
      <div class="relative">
        <input
          v-model="searchQuery"
          @input="searchArticles"
          type="text"
          :placeholder="t('help.searchPlaceholder')"
          class="w-full px-4 py-3 pl-12 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <svg
          class="absolute left-4 top-3.5 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <svg
          v-if="searching"
          class="absolute right-4 top-3.5 w-5 h-5 text-gray-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>

      <!-- Search Results Dropdown -->
      <div
        v-if="showingResults"
        class="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto"
      >
        <button
          v-for="article in searchResults"
          :key="article.id"
          @click="viewArticle(article)"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
        >
          <p class="font-medium text-gray-900">{{ article.title }}</p>
          <p class="text-sm text-gray-500">{{ categoryLabels[article.category] }}</p>
        </button>
      </div>
    </div>

    <!-- Article View -->
    <div v-if="selectedArticle" class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex items-center justify-between mb-4">
        <button @click="closeArticle" class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {{ t('common.back') }}
        </button>
        <span class="text-sm text-gray-500">
          {{ categoryLabels[selectedArticle.category] }}
        </span>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ selectedArticle.title }}</h2>
      <div
        class="prose max-w-none text-gray-600"
        v-html="renderMarkdown(selectedArticle.content)"
      ></div>
    </div>

    <!-- Categories Grid -->
    <div v-else-if="!loading" class="space-y-8">
      <div v-for="category in categories" :key="category.category">
        <div v-if="category.articles.length > 0" class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
              <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="categoryIcons[category.category] || categoryIcons.FAQ"
                />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-gray-900">
              {{ categoryLabels[category.category] }}
            </h2>
          </div>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="article in category.articles"
              :key="article.id"
              @click="viewArticle(article)"
              class="text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all"
            >
              <h3 class="font-medium text-gray-900 mb-1">{{ article.title }}</h3>
              <p class="text-sm text-gray-500 line-clamp-2">
                {{ article.content.substring(0, 100) }}...
              </p>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="categories.every((c) => c.articles.length === 0)"
        class="text-center py-12 text-gray-500"
      >
        <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <p>{{ t('help.noArticles') }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-else class="text-center py-8 text-gray-500">{{ t('common.loading') }}</div>

    <!-- Support Link -->
    <div class="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
      <p class="text-gray-600 mb-2">{{ t('help.needMoreHelp') }}</p>
      <router-link to="/support" class="text-primary hover:underline font-medium">
        {{ t('help.contactSupport') }}
      </router-link>
    </div>
  </div>
</template>

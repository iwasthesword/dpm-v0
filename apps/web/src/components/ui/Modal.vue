<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}>();

const emit = defineEmits<{
  close: [];
}>();

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click="handleBackdropClick"
        @keydown="handleKeydown"
      >
        <div
          :class="[
            'bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col',
            size === 'sm' && 'max-w-md',
            size === 'md' && 'max-w-lg',
            size === 'lg' && 'max-w-2xl',
            size === 'xl' && 'max-w-4xl',
            !size && 'max-w-lg',
          ]"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <slot name="header">
              <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
            </slot>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>

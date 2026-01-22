import { createI18n } from 'vue-i18n';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';

export type MessageSchema = typeof ptBR;

const i18n = createI18n<[MessageSchema], 'pt-BR' | 'en'>({
  legacy: false,
  locale: localStorage.getItem('locale') || 'pt-BR',
  fallbackLocale: 'en',
  messages: {
    'pt-BR': ptBR,
    en: en,
  },
  numberFormats: {
    'pt-BR': {
      currency: {
        style: 'currency',
        currency: 'BRL',
        notation: 'standard',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      percent: {
        style: 'percent',
        useGrouping: false,
      },
    },
    en: {
      currency: {
        style: 'currency',
        currency: 'USD',
        notation: 'standard',
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      percent: {
        style: 'percent',
        useGrouping: false,
      },
    },
  },
  datetimeFormats: {
    'pt-BR': {
      short: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        weekday: 'long',
      },
      time: {
        hour: '2-digit',
        minute: '2-digit',
      },
      datetime: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
      weekday: {
        weekday: 'short',
      },
    },
    en: {
      short: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        weekday: 'long',
      },
      time: {
        hour: '2-digit',
        minute: '2-digit',
      },
      datetime: {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      },
      weekday: {
        weekday: 'short',
      },
    },
  },
});

export function setLocale(locale: 'pt-BR' | 'en') {
  (i18n.global.locale as unknown as { value: string }).value = locale;
  localStorage.setItem('locale', locale);
  document.documentElement.lang = locale;
}

export function getLocale(): 'pt-BR' | 'en' {
  return (i18n.global.locale as unknown as { value: string }).value as 'pt-BR' | 'en';
}

export default i18n;

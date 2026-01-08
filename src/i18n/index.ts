import { createI18n } from 'vue-i18n';
import ko from '../locales/ko.json';
import en from '../locales/en.json';

const i18n = createI18n({
  legacy: false, // Composition API 모드 사용
  locale: localStorage.getItem('lang') || 'ko',
  fallbackLocale: 'en',
  messages: { ko, en }
});

export default i18n;
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import i18n from '../i18n';

export const useLangStore = defineStore('lang', () => {
  // 1. 우선순위: 로컬 스토리지 -> 브라우저 기본 언어 -> 한국어
  const savedLang = localStorage.getItem('lang') || (navigator.language.startsWith('ko') ? 'ko' : 'en');
  const currentLang = ref(savedLang);

  // 초기 로드 시 i18n 로케일 강제 설정
  i18n.global.locale.value = savedLang as 'ko' | 'en';

  watch(currentLang, (newLang) => {
    i18n.global.locale.value = newLang as 'ko' | 'en';
    localStorage.setItem('lang', newLang);
  });

  function setLanguage(lang: 'ko' | 'en') {
    currentLang.value = lang;
  }

  return { currentLang, setLanguage };
});
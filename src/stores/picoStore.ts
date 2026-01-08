import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePicoStore = defineStore('pico', () => {
  // 상태: 변환된 파이썬 코드
  const pythonCode = ref<string>('');
  // 상태: 피코 연결 여부
  const isConnected = ref<boolean>(false);

  // 코드 업데이트 액션
  function setPythonCode(code: string) {
    pythonCode.value = code;
  }

  return { pythonCode, isConnected, setPythonCode };
});
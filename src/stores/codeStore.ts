import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCodeStore = defineStore('code', () => {
  // 상태
  const pythonCode = ref<string>(''); // 변환된 파이썬 코드
  const isManualEditing = ref<boolean>(false); // 텍스트 에디터 수정 중인지 여부
  const hasUnsavedChanges = ref<boolean>(false); // 텍스트 수정 후 아직 블록과 최종 합의가 안 된 상태
  
  // 코드 업데이트 액션
  function setPythonCode(code: string) {
    pythonCode.value = code;
  }

  return { pythonCode, isManualEditing, hasUnsavedChanges, setPythonCode };
});
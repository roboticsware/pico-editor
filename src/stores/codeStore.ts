import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pythonGenerator } from 'blockly/python';
import { sanitizeCode } from '@/utils/code-sanitizer';
import { useProjectStore } from './projectStore';

export const useCodeStore = defineStore('code', () => {
  // 상태
  const pythonCode = ref<string>(''); // 변환된 파이썬 코드
  const isManualEditing = ref<boolean>(false); // 텍스트 에디터 수정 중인지 여부
  const hasUnsavedChanges = ref<boolean>(false); // 텍스트 수정 후 아직 블록과 최종 합의가 안 된 상태
  
  // 코드 업데이트 액션
  function setPythonCode(code: string) {
    pythonCode.value = code;
  }

  const triggerCodeUpdate = () => {
    const projectStore = useProjectStore(); // 참조 접근시 주의!! 최상위(Top-level)에서 접근하면, Circular Reference 발생!!
    if (!projectStore.workspace) return;
    
    try {
      const rawCode = pythonGenerator.workspaceToCode(projectStore.workspace);
      pythonCode.value = sanitizeCode(rawCode);
    } catch (err) {
      console.error("코드 생성 오류:", err);
      pythonCode.value = "# 코드 생성 중 오류가 발생했습니다.";
    }
  };

  return { pythonCode, isManualEditing, hasUnsavedChanges, setPythonCode, triggerCodeUpdate };
});
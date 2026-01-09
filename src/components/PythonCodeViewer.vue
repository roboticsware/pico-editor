<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useCodeStore } from '@/stores/codeStore';
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { CodeIcon } from 'lucide-vue-next';
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const codeStore = useCodeStore();
const editorContainer = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

// 외부에서 이 컴포넌트의 에디터에 포커스를 줄 수 있게 함수 노출
const focusTextEditor = () => {
  if (view) {
    view.focus();
    // 커서를 맨 끝으로 보내고 싶다면 아래 코드 추가
    view.dispatch({ selection: { head: view.state.doc.length, anchor: view.state.doc.length } });
  }
};
defineExpose({ focusTextEditor });

onMounted(() => {
  if (editorContainer.value) {
    view = new EditorView({
      doc: codeStore.pythonCode,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        // 탭 키를 눌렀을 때 빈칸 4개(들여쓰기)가 작동하도록 설정
        keymap.of([indentWithTab]),
        // 사용자 타이핑 감지 시 즉시 스토어에 자동 저장 (실시간 동기화)
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isUpdatingFromStore) {
            codeStore.isManualEditing = true; // 블록코딩창 포커스 시 블록코딩용 파이썬코드로의 자동 업데이트를 금지!
            codeStore.hasUnsavedChanges = true; // "수정된 적 있음" 표시
            const currentCode = update.state.doc.toString();
            codeStore.setPythonCode(currentCode);
          }
        }),
      ],
      parent: editorContainer.value,
    });
  }
});

// 모달 관련
// .py 파일로 저장하는 함수
const saveToFile = () => {
  const blob = new Blob([codeStore.pythonCode], { type: 'text/x-python' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'main.py';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  codeStore.isManualEditing = false;
  codeStore.hasUnsavedChanges = true;
};

// 스토어 업데이트 중인지 확인하는 플래그 (무한 루프 방지)
let isUpdatingFromStore = false;
// 스토어 변경시, 에디터 동기화 (블록 조작 시)
watch(() => codeStore.pythonCode, (newCode) => {
  if (codeStore.isManualEditing) return; //텍스트 수정 중에는 스토어에서 오는 값 무시
  if (view) {
    isUpdatingFromStore = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newCode }
    });
    nextTick(() => { isUpdatingFromStore = false; });
  }
});
</script>

<template>
  <div class="flex flex-col h-full bg-base-100 text-xs font-bold relative">
    <div class="flex justify-between items-center px-4 py-2 bg-neutral text-neutral-content shrink-0">
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-2">
        <CodeIcon :size="14" />PYTHON CODE
      </span>
        <div v-if="codeStore.isManualEditing" class="badge badge-warning badge-sm animate-pulse">{{ $t('editor.modified') }}</div>
      </div>
      <div class="flex gap-2">
        <button @click="saveToFile()" class="btn btn-xs btn-primary">{{ $t('editor.saveToFile') }}</button>
      </div>
    </div>

    <div ref="editorContainer" class="flex-1 overflow-hidden text-base"></div>
  </div>
</template>

<style scoped>
/* CodeMirror가 컨테이너 높이를 꽉 채우도록 설정 */
:deep(.cm-editor) {
  height: 100%;
}
/* 에디터 폰트 사이즈 조정 */
:deep(.cm-content) {
  font-family: 'Fira Code', monospace;
  font-size: 14px;
}
</style>
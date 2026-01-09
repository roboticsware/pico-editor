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
    // 커서를 맨 끝으로 보내기
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
// 에디터 -> 스토어 감시
EditorView.updateListener.of((update) => {
  if (update.docChanged && !isUpdatingFromStore) {
    const currentCode = update.state.doc.toString();
    
    // [중요] 스토어를 업데이트하기 전에 플래그를 세우지 않으면 
    // watch가 반응하면서 커서를 초기화할 수 있습니다.
    isUpdatingFromStore = true; 
    codeStore.setPythonCode(currentCode);
    
    // 다음 틱에서 플래그 해제
    setTimeout(() => { isUpdatingFromStore = false; }, 0);
  }
}),

// 스토어 변경시, 에디터 동기화 (블록 조작 시)
watch(() => codeStore.pythonCode, (newCode) => {
  // 사용자가 에디터를 수정 중(ManualEditing)이거나 이미 업데이트 중이면 무시
  if (isUpdatingFromStore || codeStore.isManualEditing) return;

  if (view && view.state.doc.toString() !== newCode) {
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
/* 커서 스타일 (깜빡이는 선) */
:deep(.cm-editor .cm-cursor) {
  border-left: 3px solid #ffcc00 !important; /* 금색 커서 */
  margin-left: -1.5px; /* 두꺼워진 만큼 정렬 조정 */
}

/* 현재 활성화된 줄(포커스 되었을 때) 배경색 */
:deep(.cm-editor.cm-focused .cm-activeLine) {
  background-color: rgba(255, 255, 255, 0.07) !important;
}

/* 현재 활성화된 줄의 줄번호 창(Gutter) 배경색 */
:deep(.cm-editor.cm-focused .cm-activeLineGutter) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
  font-weight: bold;
}

/* 줄번호 창 전체 스타일 */
:deep(.cm-gutters) {
  background-color: #282c34 !important;
  border-right: 1px solid #3e4451 !important;
  color: #4b5263 !important;
}

/* 선택 영역(드래그) 색상 */
:deep(.cm-selectionBackground) {
  background-color: rgba(100, 150, 255, 0.3) !important;
}
</style>
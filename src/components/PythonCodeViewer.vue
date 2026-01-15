<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useCodeStore } from '../stores/codeStore';
import { EditorView, basicSetup } from "codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { useI18n } from 'vue-i18n';
import { 
  IonToolbar, IonButtons, IonButton, IonIcon, IonBadge 
} from '@ionic/vue';
import { codeSlash } from 'ionicons/icons';

const { t } = useI18n();
const codeStore = useCodeStore();
const editorContainer = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

// Shadow DOM 내부에서 사용할 테마 설정
// 외부 간섭이 없으므로 !important 없이도 적용되지만, CodeMirror 기본값 오버라이딩을 위해 명시
const shadowTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px"
  },
  ".cm-scroller": {
    fontFamily: "monospace", /* 시스템 모노스페이스 폰트 사용 */
    fontWeight: "bold",
    lineHeight: "1.5",
    overflow: "auto"
  },
  ".cm-content": {
    whiteSpace: "pre",
    padding: "4px 0",
    minHeight: "100%"
  },
  ".cm-gutters": {
    backgroundColor: "#282c34",
    borderRight: "1px solid #3e4451",
    color: "#4b5263"
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.07)"
  }
});

// 외부에서 이 컴포넌트의 에디터에 포커스를 줄 수 있게 함수 노출
const focusTextEditor = () => {
  if (view) {
    view.focus();
    // 커서를 맨 끝으로 보내기
    view.dispatch({ selection: { head: view.state.doc.length, anchor: view.state.doc.length } });
  }
};
defineExpose({ focusTextEditor });

// 스토어 업데이트 중인지 확인하는 플래그 (무한 루프 방지)
let isUpdatingFromStore = false;

onMounted(() => {
  if (editorContainer.value) {
    // [Shadow DOM Strategy]
    // Ionic 스타일 격리를 위해 Shadow DOM 생성
    // 1. 이미 shadowRoot가 있는지 확인 (HMR 대응)
    let shadow = editorContainer.value.shadowRoot;
    if (!shadow) {
       shadow = editorContainer.value.attachShadow({ mode: 'open' });
    }

    // 2. Host 스타일 정의 (Shadow DOM 컨테이너 자체의 스타일)
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        overflow: hidden;
        text-align: left;
        background-color: #282c34;
        position: relative;
      }
      /* CodeMirror Editor가 Host를 가득 채우도록 */
      .cm-editor {
        height: 100%;
      }
      /* 커서 스타일 (깜빡이는 선) */
      .cm-editor .cm-cursor {
        border-left: 3px solid #ffcc00 !important; /* 금색 커서 */
        margin-left: -1.5px; /* 두꺼워진 만큼 정렬 조정 */
      }
      /* 선택 영역(드래그) 색상 */
      .cm-selectionBackground {
        background-color: rgba(100, 150, 255, 0.3) !important;
      }
      /* 현재 활성화된 줄의 줄번호 창(Gutter) 배경색 */
      .cm-editor.cm-focused .cm-activeLineGutter {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: #ffffff !important;
        font-weight: bold;
      }
    `;
    // 기존 스타일 제거 후 추가 (중복 방지)
    shadow.innerHTML = ''; 
    shadow.appendChild(hostStyle);

    // 3. EditorView 생성 (Shadow Root 내부에 마운트)
    view = new EditorView({
      doc: codeStore.pythonCode,
      extensions: [
        shadowTheme,
        basicSetup, 
        python(),   
        oneDark,    
        // 탭 키를 눌렀을 때 빈칸(들여쓰기)가 작동하도록 설정
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
      root: shadow,   // 중요: 이벤트를 Shadow DOM 기준으로 처리
      parent: shadow, // 중요: 마운트 위치
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

// 스토어 변경시, 에디터 동기화 (블록 조작 시)
watch(() => codeStore.pythonCode, (newCode) => {
  // 사용자가 에디터를 수정 중(ManualEditing)이거나 이미 업데이트 중이면 무시
  if (isUpdatingFromStore || codeStore.isManualEditing) return;
  if (view && view.state.doc.toString() !== newCode) {
    isUpdatingFromStore = true;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newCode } });
    nextTick(() => { isUpdatingFromStore = false; });
  }
});
</script>

<template>
  <div class="code-viewer-container">
    <ion-toolbar color="light" style="--min-height: 48px; --padding-start: 8px; --padding-end: 8px;">
       <ion-buttons slot="start">
          <ion-icon :icon="codeSlash" style="margin-right: 8px; font-size: 1.2em;"></ion-icon>
          <span style="font-weight: bold; font-size: 0.9em;">PYTHON CODE</span>
          <ion-badge v-if="codeStore.isManualEditing" color="warning" style="margin-left: 10px">{{ $t('editor.modified') }}</ion-badge>
       </ion-buttons>
       <ion-buttons slot="end">
          <ion-button size="small" fill="solid" @click="saveToFile()">{{ $t('editor.saveToFile') }}</ion-button>
       </ion-buttons>
    </ion-toolbar>

    <!-- Shadow Host -->
    <div ref="editorContainer" class="editor-area"></div>
  </div>
</template>

<style scoped>
.code-viewer-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--ion-background-color, #fff); 
  position: relative;
}

.editor-area {
  flex: 1;
  /* overflow: hidden; -> Shadow DOM Host Style (:host)에서 처리하므로 여기선 굳이 필요 없지만 레이아웃 잡기용 */
  overflow: hidden; 
  position: relative;
}
</style>
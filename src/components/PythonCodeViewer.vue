<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useCodeStore } from '../stores/codeStore';
import { useThemeStore } from '../stores/themeStore';
import { EditorView, basicSetup } from "codemirror";
import { Compartment } from "@codemirror/state";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { defaultKeymap, historyKeymap, indentWithTab, history } from "@codemirror/commands";
import { useI18n } from 'vue-i18n';
import { 
  IonToolbar, IonButtons, IonButton, IonIcon, IonBadge 
} from '@ionic/vue';
import { codeSlash, save, add, remove } from 'ionicons/icons';

const { t } = useI18n();
const codeStore = useCodeStore();
const themeStore = useThemeStore();
const editorContainer = ref<HTMLElement | null>(null);
const fontSize = ref(14);
let view: EditorView | null = null;
const themeCompartment = new Compartment();
const shadowThemeCompartment = new Compartment();

// Shadow DOM 내부에서 사용할 테마 설정
const getShadowTheme = (isDark: boolean) => EditorView.theme({
  "&": {
    height: "100%",
    fontSize: `${fontSize.value}px`,
    backgroundColor: "var(--editor-bg)"
  },
  ".cm-scroller": {
    fontFamily: "var(--app-font-mono)",
    fontWeight: "500",
    lineHeight: "1.6",
    overflow: "auto"
  },
  ".cm-content": {
    whiteSpace: "pre",
    padding: "8px 0",
    minHeight: "100%"
  },
  ".cm-gutters": {
    backgroundColor: "var(--editor-gutter-bg)",
    borderRight: "1px solid var(--editor-border)",
    color: "var(--ion-color-step-300)"
  },
  ".cm-activeLine": {
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)"
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

const changeFontSize = (delta: number) => {
  const newSize = fontSize.value + delta;
  if (newSize >= 10 && newSize <= 30) {
    fontSize.value = newSize;
    if (view) {
      view.dispatch({
        effects: shadowThemeCompartment.reconfigure(getShadowTheme(themeStore.isDarkMode))
      });
    }
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
    hostStyle.id = 'cm-host-style';
    const updateHostStyle = (isDark: boolean) => {
      hostStyle.textContent = `
        :host {
          display: block;
          height: 100%;
          width: 100%;
          overflow: hidden;
          text-align: left;
          background-color: var(--editor-bg);
          position: relative;
        }
        /* CodeMirror Editor가 Host를 가득 채우도록 */
        .cm-editor {
          height: 100%;
        }
        /* 커서 스타일 (깜빡이는 선) */
        .cm-editor .cm-cursor {
          border-left: 2px solid var(--ion-color-primary) !important; 
        }
        /* 선택 영역(드래그) 색상 */
        .cm-selectionBackground {
          background-color: ${isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'} !important;
        }
        /* 현재 활성화된 줄의 줄번호 창(Gutter) 배경색 */
        .cm-editor.cm-focused .cm-activeLineGutter {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'} !important;
          color: var(--ion-color-primary) !important;
          font-weight: bold;
        }
      `;
    };
    updateHostStyle(themeStore.isDarkMode);
    shadow.appendChild(hostStyle);

    // 3. EditorView 생성 (Shadow Root 내부에 마운트)
    view = new EditorView({
      doc: codeStore.pythonCode,
      extensions: [
        shadowThemeCompartment.of(getShadowTheme(themeStore.isDarkMode)),
        themeCompartment.of(themeStore.isDarkMode ? oneDark : []),
        basicSetup, 
        python(),   
        history(),   
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab
        ]), 
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isUpdatingFromStore) {
            codeStore.isManualEditing = true;
            codeStore.hasUnsavedChanges = true;
            const currentCode = update.state.doc.toString();
            codeStore.setPythonCode(currentCode);
          }
        }),
      ],
      root: shadow,
      parent: shadow,
    });

    // 테마 변경 실시간 반영
    watch(() => themeStore.isDarkMode, (isDark) => {
      if (view) {
        updateHostStyle(isDark);
        view.dispatch({
          effects: [
            shadowThemeCompartment.reconfigure(getShadowTheme(isDark)),
            themeCompartment.reconfigure(isDark ? oneDark : []),
          ]
        });
      }
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
    <ion-toolbar class="panel-header">
        <ion-buttons slot="start">
          <ion-icon :icon="codeSlash" class="header-icon"></ion-icon>
          <span class="header-title">PYTHON SOURCE</span>
          <ion-badge v-if="codeStore.isManualEditing" color="warning" class="status-badge">{{ $t('editor.modified') }}</ion-badge>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button fill="clear" @click="changeFontSize(1)">
            <ion-icon :icon="add" slot="icon-only"></ion-icon>
          </ion-button>
          <ion-button fill="clear" @click="changeFontSize(-1)">
            <ion-icon :icon="remove" slot="icon-only"></ion-icon>
          </ion-button>
          <ion-button fill="clear" class="header-action-btn" @click="saveToFile()">
            <ion-icon :icon="save" slot="start"></ion-icon>
            {{ $t('editor.saveToFile') }}
          </ion-button>
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
  background-color: var(--ion-background-color); 
  position: relative;
}

.panel-header {
  --min-height: 38px;
  --padding-start: 16px;
  --padding-end: 8px;
  --background: var(--panel-header-bg);
  border-bottom: 1px solid var(--ion-border-color);
}

.header-icon {
  font-size: 16px;
  color: var(--ion-color-primary);
  margin-right: 10px;
}

.header-title {
  font-family: var(--app-font-main);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--panel-header-text);
  text-transform: uppercase;
}

.status-badge {
  margin-left: 8px;
  font-size: 10px;
  --padding-start: 6px;
  --padding-end: 6px;
}

.header-action-btn {
  font-size: 11px;
  font-family: var(--app-font-main);
  font-weight: 700;
  --color: var(--ion-color-secondary);
}

.editor-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
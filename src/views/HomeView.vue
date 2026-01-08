<script setup lang="ts">
import NavBar from '../components/NavBar.vue';
import BlocklyEditor from '../components/BlocklyEditor.vue';
import { useProjectStore } from '../stores/projectStore';
import { ref } from 'vue';

const projectStore = useProjectStore();
const editorRef = ref();

// workspace가 BlocklyEditor 컴포넌트에 있기 때문에 부모에서 중계해야 함
const handleSave = () => {
  const ws = editorRef.value?.getWorkspace(); 
  if (ws) projectStore.saveProject(ws);
};
const handleLoad = (file: File) => {
  const ws = editorRef.value?.getWorkspace();
  if (ws) projectStore.loadProject(ws, file);
};
</script>

<template>
  <div class="app-container">
    <NavBar class="app-header"
      @request-save="handleSave" 
      @request-load="handleLoad"
    />
    <main class="app-main">
      <BlocklyEditor
        ref="editorRef"
      />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh; /* 전체 화면 높이 고정 */
  margin: 0;
  padding: 0;
  overflow: hidden; /* 전체 페이지 스크롤 방지 */
}

.app-header {
  min-height: 60px; /* 최소 높이 보장 */
  flex-shrink: 0;   /* 헤더가 찌그러지지 않게 방지 */
  display: flex;
  flex-wrap: wrap;  /* 버튼이 많으면 다음 줄로 넘김 */
  padding: 10px;
  /* ...기타 배경색 등... */
}

.app-main {
  flex: 1;          /* 나머지 공간 전체 차지 */
  display: flex;
  flex-direction: row;
  overflow: hidden; /* 에디터 내부 스크롤만 허용 */
}

/* 태블릿/모바일 대응: 코드 미리보기가 아래로 내려가도록 */
@media (max-width: 1024px) {
  .app-main {
    flex-direction: column;
  }
}

@media (orientation: landscape) {
  .editor-header {
    height: 45px; /* 헤더를 더 슬림하게 */
    padding: 0 10px;
  }

  .main-layout {
    flex-direction: row; /* 에디터와 코드창을 옆으로 배치 */
  }

  .code-preview {
    width: 300px; /* 고정폭을 주어 에디터 공간 확보 */
    height: 100%;
  }
}

/* 화면 높이가 너무 낮을 때 (예: 폰 가로 모드) */
@media (max-height: 500px) {
  .editor-header h1 {
    display: none; /* 로고 텍스트를 숨겨서 버튼 공간 확보 */
  }
}
</style>
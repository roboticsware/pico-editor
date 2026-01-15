<script setup lang="ts">
import { IonPage, IonHeader, IonContent } from '@ionic/vue';
import NavBar from '../components/NavBar.vue';
import BlocklyEditor from '../components/BlocklyEditor.vue';
import ModeSelectModal from '../components/ModeSelectModal.vue';
import { useProjectStore } from '../stores/projectStore';
import { useModeStore } from '../stores/modeStore';

const projectStore = useProjectStore();
const modeStore = useModeStore();

// NavBar의 저장/불러오기 요청 중개
const handleSave = () => {
  projectStore.saveProject();
};
const handleLoad = (file: File) => {
  projectStore.loadProject(file);
};
</script>

<template>
  <ion-page>
    <ion-header>
      <NavBar 
        @request-save="handleSave" 
        @request-load="handleLoad"
      />
    </ion-header>

    <!-- scrollY="false" ensures the editor takes full control of scrolling/layout -->
    <ion-content :scrollY="false" class="ion-no-padding"> 
      <main class="app-main">
        <BlocklyEditor v-if="modeStore.currentMode"/>
      </main>
      <ModeSelectModal />
    </ion-content>
  </ion-page>
</template>

<style scoped>
/* IonPage provides the main container structure.
   IonContent handles the main content area.
*/

.app-main {
  width: 100%;
  height: 100%;
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
  /* Removed editor-header styles as they might belong to child components or handled by IonHeader */
  /* Keeping media queries for layout adjustments if needed */
}

/* 화면 높이가 너무 낮을 때 (예: 폰 가로 모드) */
@media (max-height: 500px) {
  /* Needs to be checked if these classes exist in child components or here */
}
</style>
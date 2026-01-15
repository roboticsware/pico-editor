<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import BlocklyCanvas from './BlocklyCanvas.vue'
import RightPanel from './RightPanel.vue'
import { ref, computed } from 'vue';
import { useCodeStore } from '@/stores/codeStore';
import { IonAlert } from '@ionic/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const canvasRef = ref<InstanceType<typeof BlocklyCanvas> | null>(null);

const onPaneResize = () => {
  if (canvasRef.value) {
    canvasRef.value.handleResize();
  }
}

// 코드저장필요 경고모달 관련
const showModal = ref(false);
const rightPanelRef = ref<InstanceType<typeof RightPanel> | null>(null);
const codeStore = useCodeStore();

const alertButtons = computed(() => [
  {
    text: t('editor.modal.cancel'),
    role: 'cancel',
    handler: () => {
      showModal.value = false;
      if (rightPanelRef.value?.pythonViewerRef) {
        rightPanelRef.value.pythonViewerRef.focusTextEditor();
      }
    }
  },
  {
    text: t('editor.modal.confirm'),
    role: 'confirm',
    handler: () => {
      codeStore.hasUnsavedChanges = false;
      codeStore.isManualEditing = false;
      showModal.value = false;
    }
  }
]);
</script>

<template>
  <div class="editor-main-container">
    <splitpanes class="default-theme" @resize="onPaneResize">
      <pane min-size="30" size="65">
        <BlocklyCanvas ref="canvasRef" @show-save-warnning="showModal = true"/>
      </pane>

      <pane min-size="20" size="35">
        <RightPanel ref="rightPanelRef"/>
      </pane>
    </splitpanes>
    
    <ion-alert
      :is-open="showModal"
      :header="t('editor.modal.title')"
      :message="t('editor.modal.description')"
      :buttons="alertButtons"
      @didDismiss="showModal = false"
    ></ion-alert>
  </div>
</template>

<style scoped>
  .editor-main-container {
    height: 100%;
    width: 100%;
  } 

  /* deep을 사용해야 하위 컴포넌트인 splitpanes의 내부 클래스에 접근 가능합니다. */
  :deep(.splitpanes--theme-default .splitpanes__splitter) {
    background-color: #333 !important;
    border: 1px solid #444 !important;
    min-width: 7px !important; /* 클릭 영역 확보를 위해 조금 더 키움 */
    cursor: col-resize; /* 마우스 커서 강제 지정 */
  }
  :deep(.splitpanes--theme-default .splitpanes__splitter:hover) {
    background-color: #42b983 !important;
  }
  /* 세로형 스플리터(RightPanel용)일 때의 두께 설정 */
  :deep(.splitpanes--horizontal > .splitpanes__splitter) {
    min-height: 7px !important;
    cursor: row-resize;
  }
  :deep(.splitpanes__splitter) {
    position: relative;
    background-color: #1a1a1a !important; /* 배경은 아주 어둡게 */
  }
  /* 스플리터 정중앙에 얇은 선 하나를 더 그림 */
  :deep(.splitpanes__splitter::before) {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background-color: #444;
    transition: background-color 0.3s;
  }
  /* 세로선 */
  :deep(.splitpanes--vertical > .splitpanes__splitter::before) {
    width: 1px;
    height: 30px;
  }
  /* 가로선 */
  :deep(.splitpanes--horizontal > .splitpanes__splitter::before) {
    width: 30px;
    height: 1px;
  }
  /* 호버 시 중앙 가이드라인 색상 변경 */
  :deep(.splitpanes__splitter:hover::before) {
    background-color: #42b983;
  }
</style>
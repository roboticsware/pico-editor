<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
</script>

<style>
/* Global Modern Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--ion-color-step-200, #444);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #4facfe;
}

/* IonApp takes 100% width/height by default */

/* Blockly의 Flyout(블록선택창)의 스크롤바(?) 잔상이 생기는 이슈 수정 */
/* Flyout 스크롤바 트랙(배경)을 완전히 투명하게 */
.blocklyFlyoutScrollbar .blocklyScrollbarBackground {
    fill: transparent !important;
    stroke: none !important;
}
/* 스크롤바 핸들(움직이는 바)을 평소엔 숨겼다가 마우스 올릴 때만 살짝 보이게 */
.blocklyFlyoutScrollbar .blocklyScrollbarHandle {
    fill: var(--ion-color-step-300) !important;
    fill-opacity: 0;
    transition: fill-opacity 0.2s;
}
.blocklyFlyout:hover .blocklyScrollbarHandle {
    fill-opacity: 0.5; /* 마우스를 올리면 슬쩍 나타남 */
}

/* Blockly Main Scrollbar */
.blocklyMainWorkspaceScrollbar .blocklyScrollbarHandle {
    fill: var(--ion-color-step-300) !important;
    fill-opacity: 0.3;
}

/* splitpanes 처음 나타날 때 슥 밀리는 것처럼 보이는 현상 때문에 꺼둠 */
.splitpanes__pane {
  transition: none !important;
  background-color: var(--ion-background-color);
}
/* 그러나, 드래그할 때만 부드럽게 움직이고 싶다면 아래와 같이 특정 상황에만 부여 */
.splitpanes--resizing .splitpanes__pane {
  transition: none;
}

/* Typography refinement */
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

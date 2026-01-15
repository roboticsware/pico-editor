<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import PythonCodeViewer from './PythonCodeViewer.vue'
import TerminalLog from './TerminalLog.vue'
import { ref } from 'vue';

const pythonViewerRef = ref<InstanceType<typeof PythonCodeViewer> | null>(null);
// 부모(BlocklyEditor)가 접근할 수 있도록 다시 노출
defineExpose({ pythonViewerRef });
</script>

<template>
  <splitpanes horizontal class="default-theme">
    <pane min-size="20" size="70">
      <PythonCodeViewer ref="pythonViewerRef" />
    </pane>

    <pane min-size="10" size="30">
      <TerminalLog />
    </pane>
  </splitpanes>
</template>

<style scoped>
/* Pane 내부의 컴포넌트가 높이 100%를 차지하도록 보장 */
:deep(.splitpanes) {
  height: 100%;
  width: 100%;
}

:deep(.splitpanes__pane) {
  height: 100%;
  display: flex; 
  flex-direction: column;
  overflow: hidden; /* 내부 컴포넌트(CodeMirror)가 자체 스크롤을 가지므로 Pane은 넘침 숨김 */
}
</style>
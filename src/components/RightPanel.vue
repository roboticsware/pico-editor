<script setup>
import { Splitpanes, Pane } from 'splitpanes'
import PythonCodeViewer from './PythonCodeViewer.vue'
import TerminalLog from './TerminalLog.vue'
import { ref } from 'vue';

const pythonViewerRef = ref(null);
// 부모(BlocklyEditor)가 접근할 수 있도록 다시 노출
defineExpose({ pythonViewerRef });
</script>

<template>
  <splitpanes horizontal>
    <pane min-size="20" size="70">
      <PythonCodeViewer ref="pythonViewerRef" />
    </pane>

    <pane min-size="10" size="30">
      <TerminalLog />
    </pane>
  </splitpanes>
</template>

<style scoped>
</style>
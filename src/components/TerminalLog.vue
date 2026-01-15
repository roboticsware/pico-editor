<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useLogStore } from '../stores/logStore';
import i18n from '@/i18n';
import { IonToolbar, IonButtons, IonIcon } from '@ionic/vue';
import { terminal } from 'ionicons/icons';

const logStore = useLogStore();
const scrollBox = ref<HTMLElement | null>(null);

// 로그 추가 시 자동 스크롤
watch(() => logStore.logs.length, async () => {
  await nextTick();
  if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight;
});

onMounted(() => {
  // 컴포넌트가 뜨자마자 로그를 하나 생성해서 창을 채워봅니다.
  logStore.addLog('system', i18n.global.t('msg.letsStartCoding'));
});
</script>

<template>
  <div class="terminal-wrapper">
    <ion-toolbar color="dark" style="--min-height: 36px; border-bottom: 1px solid #333;">
        <ion-buttons slot="start" style="min-height: 36px;">
            <ion-icon :icon="terminal" style="margin-left:8px; margin-right:8px; font-size: 14px;"></ion-icon>
            <span style="font-weight: bold; font-size: 12px;">TERMINAL LOG</span>
        </ion-buttons>
    </ion-toolbar>

    <div class="log-container" ref="scrollBox">
      <div v-for="(log, i) in logStore.logs" :key="i" :class="['log-row', log.type]">
        <span class="time">[{{ log.time }}]</span>
        <span class="text">{{ log.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .terminal-wrapper {
    width: 100%;
    height: 100%;  /* 부모 .terminal-area의 높이를 따름 */
    display: flex;
    flex-direction: column;
    background: #000; /* 완전 검정으로 구분 */
  }
  
  .log-container {
    flex: 1;
    padding: 8px;
    overflow-y: auto;
    font-family: 'Consolas', monospace;
  }

  .log-row {
    font-size: 12px;
    margin-bottom: 2px;
    line-height: 1.4;
  }

  .system { color: #4ade80; }
  .error { color: #ff6b6b; }
  .time { color: #666; margin-right: 6px; }

  /* 스크롤바 디자인 */
  .log-container::-webkit-scrollbar { width: 4px; }
  .log-container::-webkit-scrollbar-thumb { background: #444; }
</style>
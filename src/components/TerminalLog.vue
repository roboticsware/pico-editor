<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useLogStore } from '../stores/logStore';
import i18n from '@/i18n';
import { 
  IonToolbar, IonButtons, IonIcon 
} from '@ionic/vue';
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
    <ion-toolbar class="panel-header">
        <ion-buttons slot="start">
            <ion-icon :icon="terminal" class="header-icon"></ion-icon>
            <span class="header-title">TERMINAL OUTPUT</span>
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
.panel-header {
  --min-height: 38px;
  --padding-start: 16px;
  --background: var(--terminal-header-bg);
  border-bottom: 1px solid var(--terminal-header-border);
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
  color: var(--terminal-header-text);
  text-transform: uppercase;
}

.terminal-wrapper {
  width: 100%;
  height: 100%;  /* 부모 .terminal-area의 높이를 따름 */
  display: flex;
  flex-direction: column;
  background: var(--terminal-bg);
}

.log-container {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  font-family: var(--app-font-mono);
  background-color: var(--terminal-bg);
}

.log-row {
  font-size: 0.8rem;
  margin-bottom: 2px;
  line-height: 1.4;
  color: var(--terminal-text);
}

.log-row:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.05);
}

.system { color: var(--ion-color-success); }
.error { color: var(--ion-color-danger); }
.time { color: var(--terminal-time); margin-right: 10px; font-weight: 500; }

/* 스크롤바 디자인 */
.log-container::-webkit-scrollbar { width: 5px; }
.log-container::-webkit-scrollbar-thumb { background: var(--ion-color-step-100); border-radius: 4px; }
.log-container::-webkit-scrollbar-thumb:hover { background: var(--ion-color-step-200); }
</style>
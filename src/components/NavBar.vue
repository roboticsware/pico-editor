<script setup lang="ts">
import { usePicoStore } from '../stores/picoStore';
import { useLogStore } from '../stores/logStore';
import { useSerialStore } from '../stores/serialStore';
import { useLangStore } from '../stores/langStore';
import { useI18n } from 'vue-i18n'
import { ref } from 'vue';
import { Play, Square, Loader2, Save } from 'lucide-vue-next';

const picoStore = usePicoStore();
const logStore = useLogStore();
const serialStore = useSerialStore();

// 다국어 지원
const langStore = useLangStore();
const { t } = useI18n();
// 언어 변경 및 드롭다운 닫기 처리
const handleLangChange = (lang: 'ko' | 'en') => {
  langStore.setLanguage(lang);
  
  // 현재 포커스된 엘리먼트(드롭다운 버튼)를 강제로 해제하여 메뉴를 닫음
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

// BlocklyEditor의 workspace가 필요하여, 직접 호출할 수 없고, 부모를 중개자로 사용
const emit = defineEmits(['request-save', 'request-load']);
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  // 버튼을 누르면 숨겨진 input의 click() 메서드를 강제로 실행
  fileInputRef.value?.click();
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('request-load', file);
    // 중요: 같은 파일을 다시 선택해도 이벤트가 발생하도록 value 초기화
    target.value = '';
  }
};

const onFileSave = () => emit('request-save'); 

// Pico 연결 핸들러
const handleConnectionToggle = async () => {
  if (!serialStore.isConnected) {
    // 연결 시도
    try {
      const success = await serialStore.connect();
      if (success) {
        logStore.addLog('system', t('msg.connectSuccess'));
      }
    } catch (error: any) {
      logStore.addLog('error', t('msg.connectError', error.message));
    }
  } else {
    // 연결 해제 시도
    try {
      await serialStore.disconnect();
      logStore.addLog('system', t('navbar.disconnect'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.disconnectError', error.message));
    }
  }
};

// 실행 핸들러
async function handleRunToggle() {
  if (!picoStore.pythonCode) {
    alert(t('msg.noCodeToRun'));
    return;
  }

  if (!serialStore.isRunning) {
    try {
      // Pinia 스토어에 저장된 현재 블록 코드를 전송
      await serialStore.run(picoStore.pythonCode);
      logStore.addLog('system', t('msg.runSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.runError',  error.message));
      serialStore.isRunning = false;
    }
  } else {
    try {
      await serialStore.stop();
      logStore.addLog('system', t('msg.stopSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.stopError',  error.message));
    }
  }
}

// 업로드 핸들러
async function handleUpload() {
  if (!picoStore.pythonCode) {
    alert(t('msg.noCodeToUpload'));
    return;
  }

  try {
    // Pinia 스토어에 저장된 현재 블록 코드를 전송
    const success = await serialStore.upload(picoStore.pythonCode);
    if (!serialStore.hasError && success) {
      logStore.addLog('system', t('msg.uploadSuccess'));
    } else {
      logStore.addLog('error', t('msg.uploadError'));
    }
  } catch (error: any) {
    logStore.addLog('error', t('msg.uploadError',  error.message));
  }
}
</script>

<template>
  <header class="navbar bg-base-300 border-b border-base-100 px-4 min-h-[60px]">
    <div class="flex-1 flex items-center gap-6">
      <a class="text-xl font-bold text-success tracking-widest">PICO EDITOR</a>
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-sm btn-ghost gap-2 border border-base-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          {{ langStore.currentLang.toUpperCase() }}
          <svg width="12" height="12" class="opacity-60" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
        </div>
        <ul tabindex="0" class="dropdown-content z-[100] menu p-2 shadow bg-base-200 rounded-box w-32 mt-2 border border-base-100">
          <li><a @click="handleLangChange('ko')">한국어</a></li>
          <li><a @click="handleLangChange('en')">English</a></li>
        </ul>
      </div>
    </div>

    <div class="flex-1 flex items-center gap-2">
      <button @click="triggerFileInput" class="btn btn-sm btn-ghost border border-base-100 gap-2">
        📁 {{ $t('navbar.open') }}
      </button>
      <input type="file" ref="fileInputRef" @change="onFileSelect" accept=".json" hidden />
      <button @click="onFileSave" class="btn btn-sm btn-ghost border border-base-100 gap-2">
        💾 {{ $t('navbar.save') }}
      </button>
    </div>

    <div class="flex-none flex items-center gap-3">
      <button 
        @click="handleConnectionToggle" 
        :class="['btn btn-sm', serialStore.isConnected ? 'btn-success' : 'btn-outline']"
      >
        <svg v-if="!serialStore.isConnected" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span v-if="serialStore.isConnected">{{ $t('navbar.disconnect') }}</span>
        <span v-else>{{ $t('navbar.connect') }}</span>
      </button>

      <button 
        @click="handleRunToggle" 
        :class="['btn btn-sm gap-2', serialStore.isRunning ? 'btn-warning' : 'btn-primary']"
        :disabled="!serialStore.isConnected || serialStore.isUploading"
      >
        <component :is="serialStore.isRunning ? Square : Play" class="w-4 h-4" />
        {{ serialStore.isRunning ? $t('navbar.stop') : $t('navbar.run') }}
      </button>

      <button 
        @click="handleUpload" 
        class="btn btn-sm btn-secondary gap-2" 
        :disabled="!serialStore.isConnected || serialStore.isUploading"
      >
        <Loader2 v-if="serialStore.isUploading" class="w-4 h-4 animate-spin" />
        <Save v-else class="w-4 h-4" />
        
        <span>
          {{ serialStore.isUploading ? $t('navbar.uploading') : $t('navbar.upload') }}
        </span>
      </button>
    </div>
  </header>
</template>

<style scoped>
  /* 비활성화된 버튼을 확실히 어둡게 만들기 */
  .btn-disabled, .btn[disabled] {
    color: #555 !important;
  }

  /* 로딩 스피너 애니메이션 */
  .animate-spin {
  animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
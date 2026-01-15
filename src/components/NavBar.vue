<script setup lang="ts">
import { useCodeStore } from '../stores/codeStore';
import { useLogStore } from '../stores/logStore';
import { useSerialStore } from '../stores/serialStore';
import { useLangStore } from '../stores/langStore';
import { useModeStore } from '../stores/modeStore';
import { useI18n } from 'vue-i18n'
import { ref } from 'vue';
import { confirmCustom } from '../services/modal-confirm';
import { Unplug, Play, Square, Loader2, Upload } from 'lucide-vue-next';

const codeStore = useCodeStore();
const logStore = useLogStore();
const serialStore = useSerialStore();
const modeStore = useModeStore();
const langStore = useLangStore();

// 모드 변경 경고 모달
const handleModeChangeRequest = async () => {
  // 함수 호출 한 줄로 모달을 띄우고 결과를 기다림
  const ok = await confirmCustom(
    '모드 변경 주의', 
    '모드를 변경하면 작성 중인 블록이 사라질 수 있습니다. 계속할까요?'
  );

  if (ok) {
    modeStore.setMode(null); // 사용자가 '확인'을 눌렀을 때만 모드 초기화
  }
};

// 다국어 지원
const { t } = useI18n();
// 언어 변경 및 드롭다운 닫기 처리
const handleLangChange = (lang: 'ko' | 'en') => {
  langStore.setLanguage(lang);
  
  // 현재 포커스된 엘리먼트(드롭다운 버튼)를 강제로 해제하여 메뉴를 닫음
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

// 부모를 중개자로 사용
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
      logStore.addLog('error', t('msg.connectError', {error: error.message}));
    }
  } else {
    // 연결 해제 시도
    try {
      await serialStore.disconnect();
      logStore.addLog('system', t('navbar.disconnect'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.disconnectError', {error: error.message}));
    }
  }
};

// 실행 핸들러
async function handleRunToggle() {
  if (!codeStore.pythonCode) {
    alert(t('msg.noCodeToRun'));
    return;
  }

  if (!serialStore.isRunning) {
    try {
      // 코드를 분석해서 picozero가 필요한지 확인
      if (codeStore.pythonCode.includes('picozero') && !serialStore.isInstalled('picozero.py')) {
        // 알림창 띄우기
        alert("PicoZero 라이브러리가 필요합니다. 라이브러리 매니저에서 설치해주세요!");
        openLibManager(); // 자동으로 매니저 열어주기
        return;
      }
      // Pinia 스토어에 저장된 현재 블록 코드를 전송
      await serialStore.run(codeStore.pythonCode);
      logStore.addLog('system', t('msg.runSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.runError',  {error: error.message}));
      serialStore.isRunning = false;
    }
  } else {
    try {
      await serialStore.stop();
      logStore.addLog('system', t('msg.stopSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('msg.stopError',  {error: error.message}));
    }
  }
}

// 업로드 핸들러
async function handleUpload() {
  if (!codeStore.pythonCode) {
    alert(t('msg.noCodeToUpload'));
    return;
  }

  try {
    // Pinia 스토어에 저장된 현재 블록 코드를 전송
    const success = await serialStore.upload(codeStore.pythonCode);
    if (!serialStore.hasError && success) {
      logStore.addLog('system', t('msg.uploadSuccess'));
    } else {
      logStore.addLog('error', t('msg.uploadError'));
    }
  } catch (error: any) {
    logStore.addLog('error', t('msg.uploadError',  {error: error.message}));
  }
}

const openLibManager = async () => {
  // 보드가 연결되어 있다면 최신 파일 목록을 즉시 동기화
  if (serialStore.isConnected) {
    try {
      await serialStore.syncFileList();
    } catch (error) {
      console.error("파일 목록을 가져오는 중 오류 발생:", error);
    }
  }
};
</script>

<template>
  <header class="navbar bg-base-300 border-b border-base-100 px-4 min-h-[60px]">
    <div class="flex-1 flex items-center gap-6">
      <a class="text-xl font-bold text-success tracking-widest">PICO EDITOR</a>
      <div class="flex-none gap-2">
        <div v-if="modeStore.currentModeDetail" class="tooltip tooltip-bottom" :data-tip="modeStore.currentModeDetail.name">
          <button @click="handleModeChangeRequest" class="btn btn-ghost btn-circle">
            <img :src="modeStore.currentModeDetail.icon" class="w-8 h-8 object-contain" />
          </button>
        </div>
      </div>
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
      <!-- <button 
        class="btn btn-ghost btn-circle" 
        @click="openLibManager"
        :title="$t('navbar.lib_manager')"
      >
        <div class="indicator">
          <span class="text-xl">📦</span>
          <span v-if="hasUpdates" class="badge badge-xs badge-primary indicator-item"></span>
        </div>
      </button> -->
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
        <Upload v-else class="w-4 h-4" />
        
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

  /* 툴팁 안보이는 이슈 */
  .tooltip:before {
    content: attr(data-tip); /* data-tip 속성값을 강제로 출력 */
    color: white !important; /* 글자색 강제 지정 */
    min-width: 50px;         /* 최소 너비 지정 */
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
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCodeStore } from '../stores/codeStore';
import { useLogStore } from '../stores/logStore';
import { useSerialStore } from '../stores/serialStore';
import { useLangStore } from '../stores/langStore';
import { useModeStore } from '../stores/modeStore';
import { confirmCustom } from '../services/modal-confirm';
import { 
  IonToolbar, IonButtons, IonButton, IonTitle, IonIcon, 
  IonSpinner, actionSheetController
} from '@ionic/vue';
import { 
  play, square, cloudUpload, folderOpen, save, 
  globe, flash, flashOff
} from 'ionicons/icons';

const codeStore = useCodeStore();
const logStore = useLogStore();
const serialStore = useSerialStore();
const modeStore = useModeStore();
const langStore = useLangStore();

// 모드 변경 경고 모달
const handleModeChangeRequest = async () => {
  const ok = await confirmCustom(
    '모드 변경 주의', 
    '모드를 변경하면 작성 중인 블록이 사라질 수 있습니다. 계속할까요?'
  );

  if (ok) {
    modeStore.setMode(null);
  }
};

// 다국어 지원
const { t } = useI18n();

const handleLangClick = async () => {
  const actionSheet = await actionSheetController.create({
    header: 'Select Language',
    buttons: [
      {
        text: '한국어',
        handler: () => {
          langStore.setLanguage('ko');
        },
      },
      {
        text: 'English',
        handler: () => {
          langStore.setLanguage('en');
        },
      },
      {
        text: 'Cancel',
        role: 'cancel',
      },
    ],
  });
  await actionSheet.present();
};

// 부모를 중개자로 사용
const emit = defineEmits(['request-save', 'request-load']);
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    emit('request-load', file);
    target.value = '';
  }
};

const onFileSave = () => emit('request-save'); 

// Pico 연결 핸들러
const handleConnectionToggle = async () => {
  if (!serialStore.isConnected) {
    try {
      const success = await serialStore.connect();
      if (success) {
        logStore.addLog('system', t('msg.connectSuccess'));
      }
    } catch (error: any) {
      logStore.addLog('error', t('msg.connectError', {error: error.message}));
    }
  } else {
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
      if (codeStore.pythonCode.includes('picozero') && !serialStore.isInstalled('picozero.py')) {
        alert("PicoZero 라이브러리가 필요합니다. 라이브러리 매니저에서 설치해주세요!");
        openLibManager();
        return;
      }
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
  <ion-toolbar>
    <ion-buttons slot="start">
      <ion-title>PICO EDITOR</ion-title>
      
      <!-- Mode Icon Button -->
      <ion-button v-if="modeStore.currentModeDetail" @click="handleModeChangeRequest">
        <img :src="modeStore.currentModeDetail.icon" style="width: 24px; height: 24px;" alt="Mode Icon" />
      </ion-button>

      <!-- Language Button -->
      <ion-button @click="handleLangClick">
        <ion-icon slot="start" :icon="globe"></ion-icon>
        {{ langStore.currentLang.toUpperCase() }}
      </ion-button>
    </ion-buttons>

    <!-- Center Group: File Actions -->
    <ion-buttons class="center-group">
      <input type="file" ref="fileInputRef" @change="onFileSelect" accept=".json" style="display: none;" />
      
      <ion-button @click="triggerFileInput">
        <ion-icon slot="start" :icon="folderOpen"></ion-icon>
        <span class="ion-hide-sm-down">{{ $t('navbar.open') }}</span>
      </ion-button>
      
      <ion-button @click="onFileSave">
        <ion-icon slot="start" :icon="save"></ion-icon>
        <span class="ion-hide-sm-down">{{ $t('navbar.save') }}</span>
      </ion-button>
    </ion-buttons>

    <ion-buttons slot="end">
      <!-- Hardware Actions -->
      <ion-button 
        @click="handleConnectionToggle" 
        :color="serialStore.isConnected ? 'success' : 'medium'"
      >
        <ion-icon slot="start" :icon="serialStore.isConnected ? flash : flashOff"></ion-icon>
        <span class="ion-hide-sm-down">{{ serialStore.isConnected ? $t('navbar.disconnect') : $t('navbar.connect') }}</span>
      </ion-button>

      <ion-button 
        @click="handleRunToggle" 
        :color="serialStore.isRunning ? 'warning' : 'primary'"
        :disabled="!serialStore.isConnected || serialStore.isUploading"
      >
        <ion-icon slot="start" :icon="serialStore.isRunning ? square : play"></ion-icon>
        <span class="ion-hide-sm-down">{{ serialStore.isRunning ? $t('navbar.stop') : $t('navbar.run') }}</span>
      </ion-button>

      <ion-button 
        @click="handleUpload" 
        color="secondary" 
        :disabled="!serialStore.isConnected || serialStore.isUploading"
      >
        <ion-spinner v-if="serialStore.isUploading" name="crescent" style="width: 1em; margin-right: 0.5em;"></ion-spinner>
        <ion-icon v-else slot="start" :icon="cloudUpload"></ion-icon>
        <span class="ion-hide-sm-down">{{ serialStore.isUploading ? $t('navbar.uploading') : $t('navbar.upload') }}</span>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</template>

<style scoped>
.center-group {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
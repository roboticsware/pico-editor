<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCodeStore } from '../stores/codeStore';
import { useLogStore } from '../stores/logStore';
import { useSerialStore } from '../stores/serialStore';
import { useLangStore } from '../stores/langStore';
import { useThemeStore } from '../stores/themeStore';
import { useModeStore } from '../stores/modeStore';
import { confirmCustom, alertCustom } from '../services/modal-confirm';
import { 
  IonToolbar, IonButtons, IonButton, IonTitle, IonIcon, 
  IonSpinner, actionSheetController
} from '@ionic/vue';
import { 
  play, square, download, folderOpen, save, 
  globe, moon, sunny, flash, flashOff
} from 'ionicons/icons';

const codeStore = useCodeStore();
const logStore = useLogStore();
const serialStore = useSerialStore();
const modeStore = useModeStore();
const langStore = useLangStore();
const themeStore = useThemeStore();

// 모드 변경 경고 모달
const handleModeChangeRequest = async () => {
  const ok = await confirmCustom(
    t('editor.mode_change.title'), 
    t('editor.mode_change.message'),
    '⚠️'
  );

  if (ok) {
    modeStore.setMode(null);
  }
};

// 다국어 지원
const { t } = useI18n();

const handleLangClick = async () => {
  const actionSheet = await actionSheetController.create({
    header: '💡 ' + t('navbar.lang'),
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
        text: t('common.cancel'),
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
    await alertCustom(t('common.notice'), t('msg.noCodeToRun'), '💡');
    return;
  }

  if (!serialStore.isRunning) {
    try {
      if (codeStore.pythonCode.includes('picozero') && !serialStore.isInstalled('picozero.py')) {
        await alertCustom(t('common.notice'), t('msg.picoZeroRequired'), '⚠️');
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
    await alertCustom(t('common.notice'), t('msg.noCodeToUpload'), '💡');
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
  <ion-toolbar class="main-navbar">
    <ion-buttons slot="start">
      <div class="logo-container">
        <span class="logo-text">PICO EDITOR</span>
      </div>
      
      <!-- Mode Icon Button -->
      <ion-button v-if="modeStore.currentModeDetail" fill="clear" @click="handleModeChangeRequest" class="mode-btn">
        <div class="mode-icon-frame">
          <img :src="modeStore.currentModeDetail.icon" alt="Mode Icon" />
        </div>
        <span class="mode-name ion-hide-sm-down">{{ modeStore.currentModeDetail.name }}</span>
      </ion-button>
       <!-- Theme & Lang -->
      <ion-button fill="clear" @click="handleLangClick" class="nav-icon-btn">
        <ion-icon :icon="globe" slot="start"></ion-icon>
        {{ langStore.currentLang.toUpperCase() }}
      </ion-button>

      <ion-button fill="clear" @click="themeStore.toggleTheme" class="nav-icon-btn">
        <ion-icon slot="icon-only" :icon="themeStore.isDarkMode ? sunny : moon"></ion-icon>
      </ion-button>
    </ion-buttons>

    <!-- Center Group: File Actions -->
    <ion-buttons class="center-group">
      <input type="file" ref="fileInputRef" @change="onFileSelect" accept=".json" style="display: none;" />
      
      <ion-button fill="clear" @click="triggerFileInput" class="nav-ghost-btn">
        <ion-icon slot="start" :icon="folderOpen"></ion-icon>
        <span class="ion-hide-sm-down">{{ $t('navbar.open') }}</span>
      </ion-button>
      
      <ion-button fill="clear" @click="onFileSave" class="nav-ghost-btn">
        <ion-icon slot="start" :icon="save"></ion-icon>
        <span class="ion-hide-sm-down">{{ $t('navbar.save') }}</span>
      </ion-button>
    </ion-buttons>

    <ion-buttons slot="end">
      <!-- Hardware Actions -->
      <ion-button 
        @click="handleConnectionToggle" 
        :fill="serialStore.isConnected ? 'outline' : 'clear'"
        :color="serialStore.isConnected ? 'success' : 'medium'"
        class="connection-btn"
      >
        <ion-icon slot="start" :icon="serialStore.isConnected ? flash : flashOff"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isConnected ? $t('navbar.disconnect') : $t('navbar.connect') }}</span>
      </ion-button>

      <ion-button 
        @click="handleRunToggle" 
        :color="serialStore.isRunning ? 'warning' : 'success'"
        :disabled="!serialStore.isConnected || serialStore.isUploading"
        class="run-btn"
      >
        <ion-icon slot="start" :icon="serialStore.isRunning ? square : play"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isRunning ? $t('navbar.stop') : $t('navbar.run') }}</span>
      </ion-button>

      <ion-button 
        @click="handleUpload" 
        fill="clear"
        color="secondary"
        :disabled="!serialStore.isConnected || serialStore.isUploading"
        class="upload-btn"
      >
        <ion-spinner v-if="serialStore.isUploading" name="crescent" class="btn-spinner"></ion-spinner>
        <ion-icon v-else slot="start" :icon="download"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isUploading ? $t('navbar.uploading') : $t('navbar.upload') }}</span>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</template>

<style scoped>
.main-navbar {
  --background: var(--ion-background-color);
  --color: var(--ion-text-color);
  --border-width: 0;
  height: var(--nav-height);
  padding: 0 20px;
  border-bottom: 1px solid var(--ion-border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1000;
}

.logo-container {
  padding-left: 10px;
  margin-right: 20px;
}

.logo-text {
  font-family: var(--app-font-main);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: var(--ion-color-primary);
}

.center-group {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.v-divider {
  width: 1px;
  height: 20px;
  background: var(--ion-border-color);
  margin: 0 12px;
}

ion-button {
  --padding-start: 12px;
  --padding-end: 12px;
  font-family: var(--app-font-main);
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: none;
  margin: 0 4px;
}

.nav-icon-btn {
  --color: var(--ion-color-step-300);
}

.text-primary-btn {
  --color: var(--ion-color-primary);
}

.connection-btn {
  --border-radius: var(--app-radius-md);
  height: 36px;
}

.run-btn {
  --border-radius: var(--app-radius-md);
  --background: var(--ion-color-primary);
  --color: white;
  height: 36px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.upload-btn {
  --color: var(--ion-color-secondary);
}

.mode-btn {
  --padding-start: 8px;
  --padding-end: 12px;
  margin-right: 12px;
}

.mode-icon-frame {
  width: 28px;
  height: 28px;
  background: white; /* Always white background for icons with non-tp bg */
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-right: 8px;
}

.mode-icon-frame img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.mode-name {
  font-weight: 700;
  color: var(--ion-text-color);
  letter-spacing: -0.01em;
}

.btn-spinner {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}

ion-icon {
  font-size: 1.2rem;
}

.ion-hide-md-down {
  margin-left: 6px;
}

.ion-hide-lg-down {
  margin-left: 6px;
}

@media (max-width: 992px) {
  .ion-hide-lg-down {
    display: none;
  }
}

@media (max-width: 768px) {
  .ion-hide-md-down {
    display: none;
  }
}
</style>
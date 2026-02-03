<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCodeStore } from '../stores/codeStore';
import { useLogStore } from '../stores/logStore';
import { useSerialStore } from '../stores/serialStore';
import { useLangStore } from '../stores/langStore';
import { useThemeStore } from '../stores/themeStore';
import { useDeviceStore } from '../stores/deviceStore';
import { useModeStore } from '../stores/modeStore';
import { confirmCustom, alertCustom } from '../services/modal-confirm';
import { 
  IonToolbar, IonButtons, IonButton, IonIcon, 
  IonSpinner, actionSheetController
} from '@ionic/vue';
import BleDeviceModal from './BleDeviceModal.vue';
import SetupGuideModal from './SetupGuideModal.vue';
import { 
  play, square, download, folderOpen, save, 
  globe, moon, sunny, flash, flashOff, wifi, hardwareChip, bluetooth, ellipse 
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { toastController } from '@ionic/vue';
import { checkUsbConnection, isWebReplAvailable, getPicoHostname } from '../utils/serial';

const codeStore = useCodeStore();
const logStore = useLogStore();
const serialStore = useSerialStore();
const deviceStore = useDeviceStore();
const modeStore = useModeStore();
const langStore = useLangStore();
const themeStore = useThemeStore();

const isAndroid = Capacitor.getPlatform() === 'android';

// Setup Modal State
const showSetupModal = ref(false);
const setupInitialStep = ref(1);
const showBleModal = ref(false);

// 업데이트 및 환경 관련
const isElectron = !!window.ElectronUpdater;
const isPWA = window.matchMedia('(display-mode: standalone)').matches;
const isNative = Capacitor.isNativePlatform();
const isAppMode = isElectron || isPWA || isNative;

const updateProgress = ref(0);
const isDownloading = ref(false);
const hasUpdate = ref(false);
const isManualCheck = ref(false);

const { t } = useI18n();

onMounted(() => {
  if (isAndroid) {
    // Attempt auto-connect for Android
    setTimeout(() => {
      handleConnectionToggle();
    }, 500);
  } else if (isElectron) {
    // Silent update check on startup
    if (navigator.onLine) {
       isManualCheck.value = false;
       // Cast to any because checkForUpdatesSilent is new
       (window.ElectronUpdater as any).checkForUpdatesSilent?.().catch((e: any) => console.log("Silent Check Error:", e));
    }
  }
});

if (isElectron) {
  window.ElectronUpdater.onUpdateAvailable((info) => {
    hasUpdate.value = true;
    if (isManualCheck.value) {
      alertCustom(t('update.title'), t('update.available') + ` (v${info.version})`, '🎉');
    }
  });

  window.ElectronUpdater.onUpdateNotAvailable(() => {
    hasUpdate.value = false;
    if (isManualCheck.value) {
      toastController.create({
        message: t('update.not_available'),
        duration: 2000,
        position: 'bottom',
        color: 'success'
      }).then(t => t.present());
    }
  });

  window.ElectronUpdater.onUpdateError((err) => {
    logStore.addLog('error', t('update.error', { error: err }));
  });

  window.ElectronUpdater.onDownloadProgress((progress) => {
    isDownloading.value = true;
    updateProgress.value = Math.floor(progress.percent);
  });

  window.ElectronUpdater.onUpdateDownloaded(() => {
    isDownloading.value = false;
    confirmCustom(t('update.title'), t('update.downloaded'), '✅').then(ok => {
      if (ok) {
        window.ElectronUpdater.quitAndInstall();
      }
    });
  });
}

const handleUpdateCheck = async () => {
  if (!isAppMode) return;

  const ok = await confirmCustom(t('update.title'), t('update.confirm_check'), '❓');
  if (!ok) return;
  
  if (isElectron) {
    isManualCheck.value = true;
    const toast = await toastController.create({
      message: t('update.checking'),
      duration: 1000,
      position: 'bottom'
    });
    await toast.present();
    
    const res = await window.ElectronUpdater.checkForUpdates();
    if (res.status === 'dev-mode') {
      alertCustom(t('update.title'), t('update.dev_mode'), '🛠️');
    } else if (res.status === 'error') {
      logStore.addLog('error', t('update.error', { error: res.message }));
    }
  } else if (isPWA) {
    // PWA update logic
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        toastController.create({
          message: t('update.checking'),
          duration: 2000,
          position: 'bottom'
        }).then(t => t.present());
      }
    }
  } else if (isNative) {
    // Native update check - usually handled by app stores or OTA service
    // For now just show a message.
    alertCustom(t('update.title'), t('terminal.letsStartCoding'), '📱');
  }
};

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

const handleBleSearch = async () => {
    showBleModal.value = true;
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
    // Android: Always Wireless
    if (isAndroid) {
      // Check Network Status First
      try {
          const { Network } = await import('@capacitor/network');
          const status = await Network.getStatus();
          // If not connected or not wifi, we can't be connected to Pico AP
          if (!status.connected || status.connectionType !== 'wifi') {
              console.log("Network Check: Not connected to WiFi (Type: " + status.connectionType + ")");
              
              const { NativeSettings, AndroidSettings } = await import('capacitor-native-settings');
              const openSettings = await confirmCustom(
                  t('common.notice'),
                  t('editor.wifi_off_guide'), // We need to add this key or reuse error guide
                  '📡'
              );

              if (openSettings) {
                  try {
                      await NativeSettings.open({
                          optionAndroid: AndroidSettings.Wifi,
                      } as any);
                  } catch(e) {
                      console.error("Failed to open settings", e);
                  }
              }
              return false;
          }
      } catch (e) {
          console.warn("Network check failed", e);
      }

          // Check SSID before connecting
      try {
          const { Geolocation } = await import('@capacitor/geolocation');
          try {
             await Geolocation.requestPermissions();
          } catch(e) { console.warn("Location permission error", e); }

          const { CapacitorWifi } = await import('@capgo/capacitor-wifi');
          try {
              const { ssid } = await CapacitorWifi.getSsid();
              // Android often returns SSID with quotes
              const rawSSID = ssid || '';
              const cleanSSID = rawSSID.replace(/^"|"$/g, '');
              
              if (cleanSSID && cleanSSID !== '<unknown ssid>' && !cleanSSID.startsWith('pico-')) {
                  const proceed = await confirmCustom(
                      t('common.notice'),
                      t('editor.wifi_ssid_mismatch', { ssid: cleanSSID }),
                      '⚠️'
                  );
                  if (!proceed) return;
              }
          } catch (e) {
              console.warn("Failed to get SSID", e);
          }
      } catch (e) {
          console.warn("SSID check skipped", e);
      }

      try {
          const success = await serialStore.connect({ type: 'wifi' });
          if (success) {
            logStore.addLog('system', t('terminal.connectSuccess'));
          }
      } catch (err) {
          console.warn("Auto-connect failed", err);
          await alertCustom(
             t('common.notice'),
             t('editor.android_wifi_error_guide'),
             '⚠️'
          );
      }
      return;
    }

    // Web/Electron
    // Check if we know the device model or have history
    const currentModel = deviceStore.picoModel;
    const hasHistory = deviceStore.picoIdSuffix && deviceStore.picoIdSuffix !== 'xxxx';

    const isUsbConnected = await checkUsbConnection();
    if (isUsbConnected) {
      const proceed = await confirmCustom(
          t('common.notice'),
          t('editor.serial_detected'),
          '⚠️'
      );
      if (proceed) {
        try {
          const success = await serialStore.connect({ type: 'serial' });
          if (success) {
            logStore.addLog('system', t('terminal.connectSuccess'));
          }
        } catch (error: any) {
          logStore.addLog('error', t('terminal.connectError', {error: error.message}));
        }
        return;
      }
    }

    const isWebRepl = await isWebReplAvailable();
    if (isWebRepl) {
        // Validation check for mismatch before connecting
        const hostname = await getPicoHostname();
        if (hostname && deviceStore.picoIdSuffix && deviceStore.picoIdSuffix !== 'xxxx') {
             const oldSuffix = deviceStore.picoIdSuffix;
             const parts = hostname.split('-');
             const newSuffix = parts.length === 2 ? parts[1] : '';
             
             if (newSuffix && newSuffix !== oldSuffix) {
                 const proceed = await confirmCustom(
                     t('common.notice'),
                     t('editor.wifi_different_device', { new: newSuffix, old: oldSuffix }),
                     '⚠️'
                 );
                 if (!proceed) return;
                 // Update to new suffix so password works
                 deviceStore.picoIdSuffix = newSuffix;
                 localStorage.setItem('picoIdSuffix', newSuffix);
             }
        }
        
        // Try connecting via WiFi
        try {
            await new Promise(r => setTimeout(r, 3000)); // Wait for socket cleanup
            
            let wifiPassword = '1234'; // Hardcorded in webrepl_cfg.py

            const success = await serialStore.connect({ 
                type: 'wifi', 
                host: '192.168.4.1', 
                port: 8266, 
                password: wifiPassword 
            });
            if (success) {
                logStore.addLog('system', t('terminal.connectSuccess') + ' (WiFi)');
                toastController.create({
                    message: t('editor.connectedViaWiFi'),
                    duration: 2000,
                    color: 'success'
                }).then(t => t.present());
                return;
            }
        } catch (e) {
            console.warn("WiFi detected but failed to connect, falling back to serial", e);
        }
    } else { // WebRepl not available
        // If the user *expected* wireless (model implies it or history exists), maybe boot.py is missing?
        const ok = await confirmCustom(
             t('common.notice'),
             t('editor.wifi_conf_wrong'),
             '🔧'
        );

        if (ok) {
            setupInitialStep.value = 4;
            showSetupModal.value = true;
            return; // Exit connection attempt to let user setup
        }
    }

    // Default Fallback: Serial
    if (serialStore.isConnected || isUsbConnected) return;
    try {
      const success = await serialStore.connect({ type: 'serial' });
      if (success) {
        logStore.addLog('system', t('terminal.connectSuccess'));
      }
    } catch (error: any) {
      logStore.addLog('error', t('terminal.connectError', {error: error.message}));
    }
  } else { // Disconnect Logic by Toggle
    try {
      await serialStore.disconnect(true);
      logStore.addLog('system', t('navbar.disconnect'));
    } catch (error: any) {
      logStore.addLog('error', t('terminal.disconnectError', {error: error.message}));
    }
  }
};

// 실행 핸들러
async function handleRunToggle() {
  // 코드가 없거나, 기본 주석만 있는 경우 체크
  const trimmedCode = codeStore.pythonCode.trim();
  const isEmptyOrDefaultOnly = !trimmedCode || 
    trimmedCode === t('editor.default_comment');

  if (isEmptyOrDefaultOnly) {
    await alertCustom(t('common.notice'), t('editor.noCodeToRun'), '💡');
    return;
  }

  if (!serialStore.isRunning) {
    try {
      await serialStore.run(codeStore.pythonCode);
      logStore.addLog('system', t('terminal.runSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('terminal.runError',  {error: error.message}));
      serialStore.isRunning = false;
    }
  } else {
    try {
      await serialStore.stop();
      logStore.addLog('system', t('terminal.stopSuccess'));
    } catch (error: any) {
      logStore.addLog('error', t('terminal.stopError',  {error: error.message}));
    }
  }
}

// 업로드 핸들러
async function handleUpload() {
  if (!codeStore.pythonCode) {
    await alertCustom(t('common.notice'), t('editor.noCodeToUpload'), '💡');
    return;
  }

  try {
    const success = await serialStore.upload(codeStore.pythonCode);
    if (!serialStore.hasError && success) {
      logStore.addLog('system', t('terminal.uploadSuccess'));
    } else {
      logStore.addLog('error', t('terminal.uploadError'));
    }
  } catch (error: any) {
    logStore.addLog('error', t('terminal.uploadError',  {error: error.message}));
  }
}
</script>

<template>
  <ion-toolbar class="main-navbar">
    <ion-buttons slot="start">
      <div class="logo-container" @click="handleUpdateCheck" :class="{ 'clickable-logo': isAppMode }">
        <span v-if="isDownloading" class="logo-download-info">
          <ion-spinner name="crescent" size="small"></ion-spinner>
          <span class="progress-percent">{{ updateProgress }}%</span>
        </span>
        <span v-else class="logo-text">PICO EDITOR</span>
        <ion-icon v-if="hasUpdate && !isDownloading" :icon="ellipse" class="update-dot"></ion-icon>
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
      <!-- BLE Search Button -->
      <ion-button 
        v-if="!serialStore.isConnected"
        @click="handleBleSearch"
        color="tertiary"
        fill="clear"
        title="Find BLE Device"
      >
        <ion-icon slot="icon-only" :icon="bluetooth"></ion-icon>
      </ion-button>

      <ion-button 
        @click="handleConnectionToggle" 
        :fill="serialStore.isConnected ? 'outline' : 'clear'"
        :color="serialStore.isConnected ? 'success' : 'medium'"
        class="connection-btn"
        :title="serialStore.isConnected ? (serialStore.connectionType === 'wifi' ? 'Connected via WiFi' : (serialStore.connectionType === 'ble' ? 'Connected via BLE' : 'Connected via USB')) : 'Connect'"
      >
        <ion-icon slot="start" :icon="serialStore.isConnected ? (serialStore.connectionType === 'wifi' ? wifi : (serialStore.connectionType === 'ble' ? bluetooth : hardwareChip)) : flashOff"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isConnected ? $t('navbar.disconnect') : $t('navbar.connect') }}</span>
      </ion-button>

      <ion-button 
        @click="handleRunToggle" 
        :color="serialStore.isRunning ? 'warning' : 'success'"
        :disabled="!serialStore.isConnected || serialStore.isUploading || serialStore.isInstallingLibrary"
        class="run-btn"
      >
        <div v-if="serialStore.isInstallingLibrary" class="custom-spinner">
            <svg class="progress-icon" width="20px" height="20px" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" opacity="0.3" />
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="progress-value" 
                  transform="rotate(-90 12 12)"
                  :style="{ strokeDasharray: 62.8, strokeDashoffset: 62.8 * (1 - serialStore.libraryInstallProgress / 100) }" />
            </svg>
        </div>
        <ion-icon v-else slot="start" :icon="serialStore.isRunning ? square : play"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isInstallingLibrary ? `${serialStore.libraryInstallProgress}%` : (serialStore.isRunning ? $t('navbar.stop') : $t('navbar.run')) }}</span>
      </ion-button>

      <ion-button 
        @click="handleUpload" 
        fill="clear"
        color="secondary"
        :disabled="!serialStore.isConnected || serialStore.isUploading"
        class="upload-btn"
      >
        <div v-if="serialStore.isUploading" class="custom-spinner">
            <svg class="progress-icon" width="20px" height="20px" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="progress-value" 
                  transform="rotate(-90 12 12)"
                  :style="{ strokeDasharray: 62.8, strokeDashoffset: 62.8 * (1 - serialStore.uploadProgress / 100) }" />
            </svg>
        </div>
        <ion-icon v-else slot="start" :icon="download"></ion-icon>
        <span class="ion-hide-lg-down">{{ serialStore.isUploading ? `${serialStore.uploadProgress}%` : $t('navbar.upload') }}</span>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>

  <SetupGuideModal
      :is-open="showSetupModal"
      :initial-step="setupInitialStep"
      @close="showSetupModal = false"
  />

  <BleDeviceModal
      :is-open="showBleModal"
      @close="showBleModal = false"
  />
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
  transition: opacity 0.2s;
  position: relative;
}

.clickable-logo {
  cursor: pointer;
}

.clickable-logo:hover {
  opacity: 0.8;
}

.clickable-logo:active {
  opacity: 0.6;
}

.logo-text {
  font-family: var(--app-font-main);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  color: var(--ion-color-primary);
  user-select: none;
}

.logo-download-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-color-primary);
}

.progress-percent {
  font-family: var(--app-font-main);
  font-size: 0.9rem;
  font-weight: 800;
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

.custom-spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
}

.progress-icon {
  display: block;
}

.progress-value {
  transition: stroke-dashoffset 0.3s ease;
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

  .ion-hide-md-down {
    display: none;
  }
}

.update-dot {
  position: absolute;
  top: 0px;
  right: -5px;
  font-size: 10px;
  color: var(--ion-color-danger);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}
</style>
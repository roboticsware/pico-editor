<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonText, IonBadge, IonIcon, IonProgressBar, IonSpinner,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonGrid, IonRow, IonCol,
  IonRadio, IonRadioGroup
} from '@ionic/vue';
import { flashOutline, warningOutline, checkmarkCircle, arrowForward, wifi, bluetooth } from 'ionicons/icons';


// Import local assets
import step1Img from '@/assets/step1.png';
import step2Img from '@/assets/step2.png';
import step4Img from '@/assets/step4.png';
import picoImg from '@/assets/rp2-pico.thumb.png';
import picoWImg from '@/assets/rp2-pico-w.thumb.png';
import pico2Img from '@/assets/rp2-pico2.thumb.jpg';
import pico2WImg from '@/assets/rp2-pico2-w.thumb.jpg';
import { useDeviceStore } from '@/stores/deviceStore';
import { alertCustom } from '@/services/modal-confirm';
import { flashFirmware, injectLibraries } from '@/utils/firmware-flash';
import { Capacitor } from '@capacitor/core';
import { serial } from '@/utils/serial';

const props = withDefaults(defineProps<{ 
  isOpen: boolean,
  initialStep?: number 
}>(), {
  initialStep: 1
});
const emit = defineEmits(['close', 'install-complete']);
const deviceStore = useDeviceStore();
const { t } = useI18n();

const isElectron = Capacitor.getPlatform() === 'electron';
const currentStep = ref(props.initialStep);
const selectedModel = ref<string>('');
const isFlashing = ref(false);
const progress = ref(0);
const statusMessage = ref('');
const currentModelInfo = ref<{ id: string; isWireless: boolean } | null>(null);
const picoIdSuffix = ref<string>('xxxx');
const connectionMethod = ref<'wifi' | 'ble'>('wifi');

// State for Web Nuke Re-selection
const waitingForReSelect = ref(false);
let reSelectResolve: ((handle: any) => void) | null = null;

const models = computed(() => [
  { id: 'pico', name: 'Pico', img: picoImg, firm: 'RPI_PICO-20251209-v1.27.0.uf2' },
  { id: 'pico_w', name: 'Pico W', img: picoWImg, firm: 'RPI_PICO_W-20251209-v1.27.0.uf2' },
  { id: 'pico2', name: 'Pico 2', img: pico2Img, firm: 'RPI_PICO2-20251209-v1.27.0.uf2' },
  { id: 'pico2_w', name: 'Pico 2 W', img: pico2WImg, firm: 'RPI_PICO2_W-20251209-v1.27.0.uf2' },  
]);

// Reset state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentStep.value = props.initialStep;
    selectedModel.value = '';
    isFlashing.value = false;
    progress.value = 0;
    statusMessage.value = '';
    picoIdSuffix.value = 'xxxx';
    connectionMethod.value = 'wifi';
    
    // If opening directly at Step 4 (e.g. from "Fix WiFi" flow), assume Wireless context
    if (props.initialStep === 4) {
         currentModelInfo.value = { id: 'pico_w', isWireless: true };
    } else {
         currentModelInfo.value = null;
    }
  }
});

const nextStep = async () => {
  let next = currentStep.value + 1;
  // In Electron, skip Step 2 (Drive Check) as it's auto-detected
  if (isElectron && next === 2) {
    next = 3;
  }

  if (next <= 4) {
    currentStep.value = next;

    if (currentStep.value === 3) { // USB drive selection
      await deviceStore.scanPicoFWstatus();
      if (deviceStore.fwStatusType === 'retry') {
        await alertCustom(t('common.error'), t('setup.retry'), '❌');
        // Go back to previous step
        prevStep();
      } else if (deviceStore.fwStatusType === 'already') {
        await alertCustom(t('common.error'), t('setup.already'), '❌');
        handleDismiss();
      }
    }
  }
};

const prevStep = () => {
  let prev = currentStep.value - 1;
  // In Electron, skip Step 2
  if (isElectron && prev === 2) {
    prev = 1;
  }
  
  if (prev >= 1) currentStep.value = prev;
};

const startInstallation = async () => {
  const model = models.value.find(m => m.id === selectedModel.value);
  if (!model) return;

  isFlashing.value = true;
  statusMessage.value = t('common.progress'); // reset
  progress.value = 0.05;

  try {
    // Determine if model is wireless
    const isWireless = model.id === 'pico_w' || model.id === 'pico2_w';
    currentModelInfo.value = { id: model.id, isWireless };
    
    await flashFirmware(model.firm, (status) => {
       progress.value = status.progress;
       statusMessage.value = t(status.status); 
    }, {
        getNextDriveHandle: async () => {
            // Pause here and wait for user interaction
            waitingForReSelect.value = true;
            return new Promise((resolve) => {
                reSelectResolve = resolve;
            });
        }
    });

    // Flashing complete at 60%
    isFlashing.value = false;
    currentStep.value = 4;

  } catch (err: any) {
    console.error(err);
    const msg = err.message || 'common.error';
    statusMessage.value = (msg.startsWith('setup.') || msg.startsWith('common.'))
       ? t(msg) 
       : `${t('common.error')}: ${msg}`;
    
    setTimeout(() => {
        isFlashing.value = false;
        progress.value = 0;
        waitingForReSelect.value = false; // Reset
    }, 3000);
  }
};

const handleReSelectDrive = async () => {
    try {
        if (!('showDirectoryPicker' in window)) return;
        
        // This is called directly from user click, satisfying security requirements
        const handle = await (window as any).showDirectoryPicker({
            id: 'pico-firmware-install',
            mode: 'readwrite',
            startIn: 'desktop'
        });
        
        if (handle && reSelectResolve) {
            waitingForReSelect.value = false;
            reSelectResolve(handle);
            reSelectResolve = null;
        }
    } catch (e) {
        console.error("Drive selection cancelled or failed", e);
        // We could handle cancellations by rejecting the promise, 
        // but flashFirmware will throw if handle is null anyway.
    }
};

const handleLibraryInstall = async () => {
  isFlashing.value = true;
  
  try {
    // If directly entering step 4 without model info, ensure we have defaults or prompts
    if (!currentModelInfo.value) {
        // Assume Pico W default if unknown
        currentModelInfo.value = { id: 'pico_w', isWireless: true };
    }

    if (!currentModelInfo.value) return;
    
    statusMessage.value = t('setup.library_installing');

    // Web: Connect serial first (User action required)
    if (!isElectron) {
      // Force USB Serial transport (in case previously in WiFi/BLE mode)
      serial.useTransport('serial');
      
      // Trigger port picker
      const connected = await serial.connect();
      if (!connected) return;
    }
    
    const idSuffix = await injectLibraries(currentModelInfo.value, (status: any) => {
      progress.value = status.progress;
      statusMessage.value = t(status.status);
    }, isElectron, connectionMethod.value);
    
    
    if (idSuffix) {
        picoIdSuffix.value = idSuffix;
        deviceStore.picoIdSuffix = idSuffix;
        localStorage.setItem('picoIdSuffix', idSuffix);
        
        // Save preference: 'ble' or 'wifi'
        deviceStore.connectionTypePref = connectionMethod.value;
    }

    // Save model info
    if (currentModelInfo.value && currentModelInfo.value.id) {
       deviceStore.picoModel = currentModelInfo.value.id;
       localStorage.setItem('picoModel', currentModelInfo.value.id);
    }
    
    // Complete (100%)
    progress.value = 1;
    statusMessage.value = t('setup.l_complete');
    
    setTimeout(() => {
      emit('install-complete');
    }, 1500);
    
  } catch (err: any) {
    console.error(err);
    const msg = err.message || t('common.error');

    if (!isElectron) {
      // Web: Show alert and immediately revert to selection screen (e.g. cancelled)
      isFlashing.value = false;
      progress.value = 0;
      statusMessage.value = '';
      await alertCustom(t('common.error'), msg, '❌');
    } else {
      // Electron: Show error status then reset
      statusMessage.value = `${t('common.error')}: ${msg}`;
      setTimeout(() => {
        isFlashing.value = false;
        progress.value = 0;
      }, 3000);
    }
  }
};

const handleDismiss = async () => {
  if (!isFlashing.value || progress.value >= 1) {
    // Reset steps when closed
    currentStep.value = 1;
    selectedModel.value = '';
    emit('close');
  }
};
</script>

<template>
  <ion-modal :is-open="isOpen" :backdrop-dismiss="!isFlashing" @didDismiss="handleDismiss" class="setup-modal">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ t('setup.title') }}</ion-title>
        <ion-buttons slot="end" v-if="!isFlashing">
          <ion-button @click="emit('close')">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="!isFlashing" class="guide-container">
        <!-- Step 1: Preparation -->
        <div v-show="currentStep === 1" class="step-view">
          <ion-card class="step-card">
            <ion-card-header>
              <ion-badge color="tertiary">{{ t('setup.step1_title') }}</ion-badge>
            </ion-card-header>
            <ion-card-content class="step-content">
              <div class="img-wrapper">
                <img :src="step1Img" alt="BOOTSEL Button" />
              </div>
              <p v-html="t('setup.step1_desc')"></p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Step 2: USB Drive selection -->
        <div v-show="currentStep === 2" class="step-view">
          <ion-card class="step-card">
            <ion-card-header>
              <ion-badge color="tertiary">{{ t('setup.step2_title') }}</ion-badge>
            </ion-card-header>
            <ion-card-content class="step-content">
              <div class="img-wrapper">
                <img :src="step2Img" alt="RPI-RP2 Drive" />
              </div>
              <p v-html="t('setup.step2_desc')"></p>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Step 3: Model Selection & Flashing -->
        <div v-show="currentStep === 3" class="step-view">
          <ion-card class="step-card highlight-step">
            <ion-card-header>
              <ion-badge color="warning">{{ t('setup.step3_title') }}</ion-badge>
            </ion-card-header>
            <ion-card-content>
              <p v-html="t('setup.step3_desc')"></p>
              
              <ion-grid class="model-grid">
                <ion-row>
                  <ion-col size="6" v-for="model in models" :key="model.id">
                    <div 
                      class="model-item" 
                      :class="{ selected: selectedModel === model.id }"
                      @click="selectedModel = model.id"
                    >
                      <img :src="model.img" :alt="model.name" />
                      <span>{{ model.name }}</span>
                    </div>
                  </ion-col>
                </ion-row>
              </ion-grid>

              <ion-button 
                expand="block" 
                color="success" 
                class="ion-margin-top" 
                @click="startInstallation"
                :disabled="!selectedModel"
              >
                <ion-icon slot="start" :icon="flashOutline"></ion-icon>
                {{ t('setup.start_install') }}
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Step 4: Library Install / Boot Setup -->
        <div v-show="currentStep === 4" class="step-view">
          <!-- Electron View -->
          <ion-card class="step-card" v-if="isElectron">
            <ion-card-header>
              <ion-badge color="success">{{ t('setup.f_complete') }}</ion-badge>
            </ion-card-header>
            <ion-card-content class="step-content ion-text-center">
              <div class="status-icon-box">
                <ion-icon :icon="checkmarkCircle" color="success" size="large"></ion-icon>
              </div>
              <p class="ion-margin-top">{{ t('setup.library_install_prompt') }}</p>
              
              <ion-button expand="block" color="primary" class="ion-margin-top" @click="handleLibraryInstall">
                {{ t('common.ok') }}
              </ion-button>
            </ion-card-content>
          </ion-card>

          <!-- Web View -->
          <ion-card class="step-card" v-else>
            <ion-card-header>
              <ion-badge color="tertiary">{{ t('setup.step4_title') }}</ion-badge>
            </ion-card-header>
            <ion-card-content class="step-content">
              <div class="img-wrapper" style="height: 150px;">
                <img :src="step4Img" alt="Select Port" />
              </div>
              
              <!-- Connection Method Selection -->
              <div class="connection-select ion-margin-top" v-if="currentModelInfo?.isWireless">
                <ion-text color="dark">
                  <p><strong>{{ t('setup.select_connection') }}</strong></p>
                </ion-text>
                <ion-radio-group v-model="connectionMethod">
                  <div class="radio-item">
                     <ion-radio value="wifi" label-placement="end">Wi-Fi (WebREPL)</ion-radio>
                     <p class="radio-desc">{{ t('setup.wifi_desc') }}</p>
                  </div>
                  <div class="radio-item">
                     <ion-radio value="ble" label-placement="end">Bluetooth (BLE)</ion-radio>
                     <p class="radio-desc">{{ t('setup.ble_desc') }}</p>
                  </div>
                </ion-radio-group>
              </div>

              <ion-text class="ion-text-center"><p v-html="t('setup.step4_desc')" class="ion-margin-top"></p></ion-text>

              <ion-button expand="block" class="ion-margin-top" @click="handleLibraryInstall">
                  {{ t('setup.next') }}
                  <ion-icon slot="end" :icon="arrowForward" />
              </ion-button>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Navigation Buttons -->
        <div class="nav-buttons">
          <ion-button 
            fill="clear" 
            @click="prevStep" 
            :disabled="currentStep === 1"
          >
            {{ t('setup.prev') }}
          </ion-button>
          
          <div class="stepper-dots">
            <span :class="{ active: currentStep === 1 }"></span>
            <span :class="{ active: currentStep === 2 }" v-if="!isElectron"></span>
            <span :class="{ active: currentStep === 3 }"></span>
            <span :class="{ active: currentStep === 4 }"></span>
          </div>

          <ion-button 
            v-if="currentStep < 3" 
            @click="nextStep"
          >
            {{ t('setup.next') }}
            <ion-icon slot="end" :icon="arrowForward" />
          </ion-button>
          <ion-button v-else disabled class="placeholder-btn">
             <!-- Spacer -->
          </ion-button>
        </div>
      </div>

      <!-- Installation Progress View -->
      <div v-else class="install-container ion-text-center">
        <div class="status-icon-box">
          <ion-spinner name="crescent" color="primary" v-if="progress < 1"></ion-spinner>
          <ion-icon :icon="checkmarkCircle" color="success" size="large" v-else></ion-icon>
        </div>
        
        <h3>{{ statusMessage }}</h3>
        
        <div class="progress-wrapper">
          <ion-progress-bar :value="progress" :color="progress < 1 ? 'primary' : 'success'"></ion-progress-bar>
          <ion-text color="medium">
            <p>{{ Math.round(progress * 100) }}%</p>
          </ion-text>
        </div>

        <ion-card color="warning" v-if="progress < 1">
          <ion-card-content>
            <ion-icon :icon="warningOutline" slot="start"></ion-icon>
            <strong>{{ t('common.notice') }}:</strong> {{ t('setup.flashing') }}
          </ion-card-content>
        </ion-card>

        <ion-card v-if="progress >= 1 && currentModelInfo?.isWireless && connectionMethod === 'wifi'" class="wifi-info-card">
          <ion-card-header>
            <ion-card-title class="ion-text-start" style="font-size: 1rem; display: flex; align-items: center;">
                <ion-icon :icon="wifi" class="ion-margin-end"/> 
                {{ t('setup.wifi_config_title') }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content class="ion-text-start">
            <p style="margin-bottom: 8px;">{{ t('setup.wifi_connect_guide') }}</p>
            <ul style="padding-left: 20px; margin: 0;">
              <li><strong>SSID:</strong> pico-{{ picoIdSuffix }}</li>
              <li><strong>Password:</strong> pwd-{{ picoIdSuffix }}</li>
            </ul>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="progress >= 1 && currentModelInfo?.isWireless && connectionMethod === 'ble'" class="ble-info-card">
           <ion-card-header>
             <ion-card-title class="ion-text-start" style="font-size: 1rem; display: flex; align-items: center;">
                 <ion-icon :icon="bluetooth" class="ion-margin-end"/> 
                 {{ t('setup.ble_config_title') }}
             </ion-card-title>
           </ion-card-header>
           <ion-card-content class="ion-text-start">
               <p style="font-size: 1.1em;"><strong>{{ t('setup.ble_name_label') }}:</strong> pico-{{ picoIdSuffix }}</p>
               <p style="font-size: 0.9em; margin-top: 4px; opacity: 0.8;">
                  {{ t('setup.ble_connect_guide') }}
               </p>
           </ion-card-content>
        </ion-card>

        <ion-button v-if="progress >= 1" expand="block" color="primary" @click="handleDismiss">
          {{ t('setup.success_btn') }}
        </ion-button>

        <!-- Drive Re-selection Overlay for Nuke Flow -->
        <div v-if="waitingForReSelect" class="reselect-overlay">
           <ion-card class="reselect-card">
              <ion-card-header>
                <ion-badge color="warning">{{ t('common.notice') }}</ion-badge>
              </ion-card-header>
              <ion-card-content>
                 <div class="status-icon-box ion-margin-bottom">
                    <ion-icon :icon="warningOutline" size="large" color="warning"></ion-icon>
                 </div>
                 <p class="ion-margin-bottom" style="font-size: 1.1em; font-weight: bold;">
                    {{ t('setup.reselect_drive') }}
                 </p>
                 <ion-button expand="block" @click="handleReSelectDrive">
                    {{ t('setup.select_drive') }}
                 </ion-button>
              </ion-card-content>
           </ion-card>
        </div>
      </div>

    </ion-content>
  </ion-modal>
</template>

<style scoped>
.guide-container {
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.step-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.step-card {
  margin: 10px 0;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.img-wrapper {
  background: #f4f5f8;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  text-align: center;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-wrapper img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.model-grid {
  margin-top: 20px;
}

.model-item {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 120px;
  justify-content: space-between;
}

.model-item:hover {
  background: #f9f9f9;
}

.model-item.selected {
  border-color: var(--ion-color-primary);
  background: #f0f7ff;
  color: var(--ion-color-primary);
  font-weight: bold;
}

.model-item img {
  height: 60px;
  object-fit: contain;
  margin-bottom: 5px;
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.stepper-dots {
  display: flex;
  gap: 8px;
}

.stepper-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ddd;
  transition: background 0.3s;
}

.stepper-dots span.active {
  background: var(--ion-color-primary);
  transform: scale(1.2);
}

.placeholder-btn {
  opacity: 0;
  pointer-events: none;
}

/* Install View Styles */
.install-container {
  padding: 40px 20px;
  max-width: 500px;
  margin: 0 auto;
}

.status-icon-box {
  margin-bottom: 20px;
  transform: scale(2);
}
.progress-wrapper {
  margin: 30px 0;
}
ion-progress-bar {
  height: 12px;
  border-radius: 6px;
}

.reselect-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--ion-background-color-rgb), 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.reselect-card {
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
</style>
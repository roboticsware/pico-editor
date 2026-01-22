<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonButton, IonText, IonBadge, IonIcon, IonProgressBar, IonSpinner,
  IonCard, IonCardContent, IonCardHeader, IonGrid, IonRow, IonCol
} from '@ionic/vue';
import { flashOutline, warningOutline, checkmarkCircle, arrowForward } from 'ionicons/icons';

// Import local assets
import step1Img from '@/assets/step1.png';
import step2Img from '@/assets/step2.png';
import step5Img from '@/assets/step5.png';
import picoImg from '@/assets/rp2-pico.thumb.png';
import picoWImg from '@/assets/rp2-pico-w.thumb.png';
import pico2Img from '@/assets/rp2-pico2.thumb.jpg';
import pico2WImg from '@/assets/rp2-pico2-w.thumb.jpg';
import { useDeviceStore } from '@/stores/deviceStore';
import { alertCustom } from '@/services/modal-confirm';
import { flashFirmware, injectLibraries } from '@/utils/firmware-flash';
import { Capacitor } from '@capacitor/core';
import { serial } from '@/utils/serial';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close', 'install-complete']);
const deviceStore = useDeviceStore();
const { t } = useI18n();

const isElectron = Capacitor.getPlatform() === 'electron';
const currentStep = ref(1);
const selectedModel = ref<string>('');
const isFlashing = ref(false);
const progress = ref(0);
const statusMessage = ref('');
const currentModelInfo = ref<{ id: string; isWireless: boolean } | null>(null);

const models = computed(() => [
  { id: 'pico', name: 'Pico', img: picoImg, firm: 'RPI_PICO-20251209-v1.27.0.uf2' },
  { id: 'pico_w', name: 'Pico W', img: picoWImg, firm: 'RPI_PICO_W-20251209-v1.27.0.uf2' },
  { id: 'pico2', name: 'Pico 2', img: pico2Img, firm: 'RPI_PICO2-20251209-v1.27.0.uf2' },
  { id: 'pico2_w', name: 'Pico 2 W', img: pico2WImg, firm: 'RPI_PICO2_W-20251209-v1.27.0.uf2' },  
]);

// Reset state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentStep.value = 1;
    selectedModel.value = '';
    isFlashing.value = false;
    progress.value = 0;
    statusMessage.value = '';
    currentModelInfo.value = null;
  }
});

const nextStep = async () => {
  let next = currentStep.value + 1;
  // In Electron, skip Step 2 (Drive Check) as it's auto-detected
  if (isElectron && next === 2) {
    next = 3;
  }
  // In Web, skip Step 4 (Library Install Prompt - Electron only)
  if (!isElectron && next === 4) {
    next = 5;
  }

  if (next <= 5) {
    currentStep.value = next;

    if (currentStep.value === 3) { // USB drive selection
      await deviceStore.scanPicoStatus();
      if (deviceStore.statusType === 'retry') {
        await alertCustom(t('common.error'), t('setup.retry'), '❌');
        // Go back to previous step
        prevStep();
      } else if (deviceStore.statusType === 'already') {
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
  // In Web, skip Step 4
  if (!isElectron && prev === 4) {
    prev = 3;
  }
  
  if (prev >= 1) currentStep.value = prev;
};

const startInstallation = async () => {
  const model = models.value.find(m => m.id === selectedModel.value);
  if (!model) return;

  isFlashing.value = true;
  statusMessage.value = t('setup.progress'); // reset
  progress.value = 0.05;

  try {
    // Determine if model is wireless
    const isWireless = model.id === 'pico_w' || model.id === 'pico2_w';
    currentModelInfo.value = { id: model.id, isWireless };
    
    await flashFirmware(model.firm, (status) => {
       progress.value = status.progress;
       statusMessage.value = t(status.status); 
    });

    // Flashing complete at 60%
    // Show platform-specific intermediate screen
    isFlashing.value = false;
    if (isElectron) {
      currentStep.value = 4;
    } else { // web
      currentStep.value = 5;
    }

  } catch (err: any) {
    console.error(err);
    // If err message is a translation key
    const msg = err.message || 'common.error';
    statusMessage.value = (msg.startsWith('setup.') || msg.startsWith('common.'))
       ? t(msg) 
       : `${t('common.error')}: ${msg}`;
    
    setTimeout(() => {
        isFlashing.value = false;
        progress.value = 0;
    }, 3000);
  }
};

const handleLibraryInstall = async () => {
  isFlashing.value = true;
  
  try {
    if (!currentModelInfo.value) return;
    
    statusMessage.value = t('setup.library_installing');

    // Web: Connect serial first (User action required)
    if (!isElectron) {
      // Trigger port picker
      // If user cancels, serial.connect() throws an error (handled in catch)
      const connected = await serial.connect();
      if (!connected) return;
    }
    
    await injectLibraries(currentModelInfo.value, (status: any) => {
      progress.value = status.progress;
      statusMessage.value = t(status.status);
    }, isElectron);
    
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

const handleDismiss = () => {
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
              <p class="ready-text">{{ t('setup.step3_desc') }}</p>
              
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

        <!-- Step 4: Electron Library Install Prompt -->
        <div v-show="currentStep === 4" class="step-view">
          <ion-card class="step-card">
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
        </div>

        <!-- Step 5: Web Port Selection -->
        <div v-show="currentStep === 5" class="step-view">
          <ion-card class="step-card">
            <ion-card-header>
              <ion-badge color="tertiary">{{ t('setup.step5_title') }}</ion-badge>
            </ion-card-header>
            <ion-card-content class="step-content">
              <div class="img-wrapper">
                <img :src="step5Img" alt="Select Port" />
              </div>
              <p v-html="t('setup.step5_desc')"></p>
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
            <span :class="{ active: currentStep === 4 }" v-if="isElectron"></span>
            <span :class="{ active: currentStep === 5 }" v-if="!isElectron"></span>
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

        <ion-button v-if="progress >= 1" expand="block" color="primary" @click="handleDismiss">
          {{ t('setup.success_btn') }}
        </ion-button>
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
</style>
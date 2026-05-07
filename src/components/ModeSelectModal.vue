<script setup lang="ts">
import { useModeStore } from '../stores/modeStore';
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
import SetupGuideModal from './SetupGuideModal.vue';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonButton 
} from '@ionic/vue';
import { Capacitor } from '@capacitor/core';

const modeStore = useModeStore();
const { t } = useI18n();
const showSetupGuide = ref(false);
const setupInitialStep = ref(1);
const setupInitialFamily = ref<'pico' | 'esp32'>('pico');
const showFamilyPicker = ref(false);
const isAndroid = Capacitor.getPlatform() === 'android';

const openSetupGuide = (step: number) => {
  setupInitialStep.value = step;
  showSetupGuide.value = true;
};

// "기본 라이브러리 설치와 무선 설정" 클릭 시 기기 패밀리 선택 팝업 표시
const openWirelessSetup = () => {
  showFamilyPicker.value = true;
};

const confirmFamilyAndProceed = (family: 'pico' | 'esp32') => {
  setupInitialFamily.value = family;
  showFamilyPicker.value = false;
  openSetupGuide(4);
};
</script>

<template>
  <ion-modal :is-open="!modeStore.currentMode" :backdrop-dismiss="false">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('editor.mode_change.select') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div v-if="!isAndroid" class="modal-footer">
        <ion-button fill="clear" @click="openSetupGuide(1)">
          {{ t('editor.mode_change.install_firmware') }}
        </ion-button>
        <div class="v-divider"></div>
        <ion-button fill="clear" @click="openWirelessSetup">
          {{ t('editor.mode_change.wireless_setup') }}
        </ion-button>
      </div>

      <!-- Family Picker Overlay -->
      <div v-if="showFamilyPicker" class="family-picker-overlay">
        <div class="family-picker-card">
          <p class="picker-title">{{ t('editor.mode_change.wireless_setup') }}</p>
          <p class="picker-desc">{{ t('editor.mode_change.wireless_setup_desc') }}</p>
          <div class="family-toggle">
            <button 
              class="family-btn" 
              :class="{ active: setupInitialFamily === 'pico' }"
              @click="setupInitialFamily = 'pico'"
            >
              🎛️ Pico / Pico W
            </button>
            <button 
              class="family-btn" 
              :class="{ active: setupInitialFamily === 'esp32' }"
              @click="setupInitialFamily = 'esp32'"
            >
              📡 ESP32
            </button>
          </div>
          <div class="picker-actions">
            <ion-button fill="outline" size="small" @click="showFamilyPicker = false">
              {{ t('common.cancel') }}
            </ion-button>
            <ion-button size="small" @click="confirmFamilyAndProceed(setupInitialFamily)">
              {{ t('common.ok') }}
            </ion-button>
          </div>
        </div>
      </div>

      <div class="modal-container">
        <ion-grid>
          <ion-row class="ion-justify-content-center">
            <ion-col size="12" size-md="4" v-for="mode in modeStore.allModes" :key="mode.id">
              <ion-card class="mode-card" button @click="modeStore.setMode(mode.id)">
                <div class="image-container">
                  <img :src="mode.image" class="mode-image" />
                </div>
                <ion-card-header>
                  <ion-card-title class="ion-text-center">{{ mode.name }}</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-button expand="block">{{ t('common.select') }}</ion-button>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
    <SetupGuideModal 
        :is-open="showSetupGuide" 
        :initial-step="setupInitialStep"
        :initial-family="setupInitialFamily"
        @close="showSetupGuide = false" 
    />
  </ion-modal>
</template>

<style scoped>
.modal-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.mode-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.mode-card:hover {
  transform: scale(1.05);
}

.image-container {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f4f5f8;
}

.mode-image {
  max-height: 100%;
  object-fit: contain;
}

.modal-footer {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  flex-wrap: wrap;
  gap: 10px;
}

.v-divider {
  width: 1px;
  height: 20px;
  background: var(--ion-border-color, #ccc);
  margin: 0 10px;
}

/* Family Picker Overlay */
.family-picker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--ion-background-color-rgb), 0.97);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.family-picker-card {
  background: var(--ion-card-background, #fff);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  padding: 28px 24px;
  width: 90%;
  max-width: 360px;
  text-align: center;
}

.picker-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--ion-color-dark);
}

.picker-desc {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
  margin: 0 0 20px;
  line-height: 1.5;
}

.family-toggle {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.family-btn {
  flex: 1;
  padding: 16px 8px;
  border-radius: 12px;
  border: 2px solid var(--ion-border-color, #ddd);
  background: transparent;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--ion-color-medium);
}

.family-btn.active {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  color: var(--ion-color-primary);
}

.picker-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
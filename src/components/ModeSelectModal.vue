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
const isAndroid = Capacitor.getPlatform() === 'android';

const openSetupGuide = (step: number) => {
  setupInitialStep.value = step;
  showSetupGuide.value = true;
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
        <ion-button fill="clear" @click="openSetupGuide(4)">
          {{ t('editor.mode_change.wireless_setup') }}
        </ion-button>
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
</style>
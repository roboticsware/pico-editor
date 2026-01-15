<template>
  <ion-modal :is-open="!modeStore.currentMode" :backdrop-dismiss="false">
    <ion-header>
      <ion-toolbar>
        <ion-title>Select your mode</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
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
                  <ion-button expand="block">Select</ion-button>
                </ion-card-content>
              </ion-card>
            </ion-col>
          </ion-row>
        </ion-grid>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { useModeStore } from '../stores/modeStore';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonGrid, IonRow, IonCol, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonButton 
} from '@ionic/vue';

const modeStore = useModeStore();
</script>

<style scoped>
.modal-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
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
</style>
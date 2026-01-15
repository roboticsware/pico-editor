<script setup lang="ts">
import { ref } from 'vue';
import { AVAILABLE_LIBRARIES } from '../constants/libraries';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonButton, IonList, IonItem, IonLabel, 
  IonBadge, IonNote, IonIcon 
} from '@ionic/vue';
import { close } from 'ionicons/icons';

defineProps<{
  show: boolean;
  isConnected: boolean;
  installedFiles: string[];
  isProcessing: boolean;
}>();

defineEmits(['close']);

const libraries = ref(AVAILABLE_LIBRARIES);

const isInstalled = (fileName: string) => {
  // TODO: picoStore logic
  return false; 
};

const handleInstall = (lib: any) => { /* TODO: SerialService logic */ };
const handleDelete = (fileName: string) => { /* TODO: SerialService logic */ };
</script>

<template>
  <ion-modal :is-open="show" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ $t('lib.title') || 'Library Manager' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div v-if="!isConnected" class="ion-padding ion-text-center">
        <ion-note color="warning">
           Connect your Pico to manage libraries.
        </ion-note>
      </div>
      
      <ion-list>
          <ion-item v-for="lib in libraries" :key="lib.fileName">
              <ion-label>
                  <h2>{{ lib.name }}</h2>
                  <p>{{ lib.description }}</p>
                  <ion-note>Version: {{ lib.version }}</ion-note>
              </ion-label>
              
              <div slot="end" class="lib-actions">
                  <div v-if="isInstalled(lib.fileName)" class="action-group">
                      <ion-badge color="success" class="ion-margin-end">Installed</ion-badge>
                      <ion-button 
                        color="danger" 
                        fill="outline" 
                        size="small" 
                        @click="handleDelete(lib.fileName)"
                        :disabled="!isConnected || isProcessing"
                      >
                        Remove
                      </ion-button>
                  </div>
                  <div v-else>
                      <ion-button 
                        size="small" 
                        @click="handleInstall(lib)" 
                        :disabled="!isConnected || isProcessing"
                      >
                        Install
                      </ion-button>
                  </div>
              </div>
          </ion-item>
      </ion-list>

      <div class="ion-padding ion-text-center">
         <ion-note class="ion-text-sm">
           * Libraries are stored directly on the Pico's flash memory.
         </ion-note>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.lib-actions {
  display: flex;
  align-items: center;
}
.action-group {
  display: flex;
  align-items: center;
}
</style>

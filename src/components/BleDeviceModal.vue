
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { 
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonSpinner, IonIcon, IonText, IonNote
} from '@ionic/vue';
import { bluetooth, stopCircle, refresh, close } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { BleClient, type ScanResult } from '@capacitor-community/bluetooth-le';
import { useSerialStore } from '@/stores/serialStore';
import { useLogStore } from '@/stores/logStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  isOpen: boolean
}>();

const emit = defineEmits(['close']);
const serialStore = useSerialStore();
const logStore = useLogStore();
const deviceStore = useDeviceStore();
const { t } = useI18n();

const isNative = Capacitor.isNativePlatform()
const isScanning = ref(false);
const scannedDevices = ref<ScanResult[]>([]);
const isConnecting = ref(false);

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    // Reset state
    scannedDevices.value = [];
    isConnecting.value = false;
    
    if (isNative) {
      await startScan();
    }
  } else {
    // Stop scanning when closed
    if (isScanning.value) {
      await stopScan();
    }
  }
});

onUnmounted(() => {
  if (isScanning.value) stopScan();
});

const startScan = async () => {
    if (!isNative) return;
    try {
        await BleClient.initialize();
        isScanning.value = true;
        scannedDevices.value = [];
        
        await BleClient.requestLEScan(
            {
                services: [NUS_SERVICE_UUID], // Only show devices with UART service
                allowDuplicates: false
            },
            (result) => {
                // Check if exists
                const existing = scannedDevices.value.findIndex(d => d.device.deviceId === result.device.deviceId);
                if (existing >= 0) {
                    scannedDevices.value[existing] = result;
                } else {
                    scannedDevices.value.push(result);
                }
            }
        );

        // Auto stop after 10 seconds?
        setTimeout(() => {
            if (isScanning.value) stopScan();
        }, 10000);

    } catch (error) {
        console.error("Scan failed", error);
        logStore.addLog('error', t('ble.scan_failed', {error: error}));
        isScanning.value = false;
    }
};

const stopScan = async () => {
   if (!isNative) return;
   
   // Update UI immediately to prevent hanging if plugin fails to respond
   isScanning.value = false;

   try {
       await BleClient.stopLEScan();
   } catch (e) {
       console.warn('Stop scan failed', e);
   }
};

const handleConnect = async (deviceId?: string) => {
    isConnecting.value = true;
    if (isNative && isScanning.value) {
        await stopScan();
    }

    try {
        const success = await serialStore.connect({ 
           type: 'ble', 
           deviceId: deviceId 
        });

        if (success) {
            logStore.addLog('system', t('terminal.connectSuccess') + ' (BLE)');
            // Update preference to BLE so auto-scan doesn't annoy user
            deviceStore.connectionTypePref = 'ble';
            handleClose();
        } else {
             // Status usually handled by store/transport logs, but we can show alert
             logStore.addLog('error', t('ble.connect_failed'));
        }
    } catch (e: any) {
        logStore.addLog('error', t('terminal.connectError', {error: e.message}));
    } finally {
        isConnecting.value = false;
    }
};

const handleClose = () => {
  emit('close');
};

</script>

<template>
  <ion-modal :is-open="isOpen" @didDismiss="handleClose" class="ble-modal">
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ t('navbar.connect') }} BLE</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleClose">
             <ion-icon :icon="close" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- Native View (Scanner) -->
    <ion-content v-if="isNative" class="ion-padding">
       <div class="controls ion-margin-bottom">
           <ion-button v-if="!isScanning" @click="startScan" expand="block" fill="outline">
              <ion-icon slot="start" :icon="refresh" />
              {{ t('ble.scan') }}
           </ion-button>
           <ion-button v-else @click="stopScan" expand="block" color="danger" fill="outline">
               <ion-icon slot="start" :icon="stopCircle" padding-right />
               {{ t('ble.stop_scan') }} <ion-spinner name="dots" style="margin-left: 10px;"></ion-spinner>
           </ion-button>
       </div>

       <ion-list>
           <ion-item v-for="res in scannedDevices" :key="res.device.deviceId" button @click="handleConnect(res.device.deviceId)" :disabled="isConnecting">
               <ion-icon :icon="bluetooth" slot="start" />
               <ion-label>
                   <h2>{{ res.localName || res.device.name || 'Unknown' }}</h2>
                   <p>{{ res.device.deviceId }}</p>
               </ion-label>
               <ion-note slot="end">
                   {{ res.rssi }} dBm
               </ion-note>
               <ion-spinner v-if="isConnecting" slot="end" name="crescent"></ion-spinner>
           </ion-item>
           
           <ion-item v-if="scannedDevices.length === 0 && !isScanning" lines="none">
               <ion-label class="ion-text-center" color="medium">
                   {{ t('ble.no_device') }}
               </ion-label>
           </ion-item>
           <ion-item v-if="scannedDevices.length === 0 && isScanning" lines="none">
               <ion-label class="ion-text-center" color="medium">
                   {{ t('ble.scanning') }}
               </ion-label>
           </ion-item>
       </ion-list>
    </ion-content>

    <!-- Web View (Fallback) -->
    <ion-content v-else class="ion-padding ion-text-center">
        <div class="web-view-container">
            <div class="icon-circle">
               <ion-icon :icon="bluetooth" size="large"></ion-icon>
            </div>
            
            <h2>{{ t('ble.web_bluetooth') || 'Web Bluetooth' }}</h2>
            <p>
              {{ t('ble.web_desc') }}
            </p>
            <p class="io-text-wrap" style="color: var(--ion-color-medium); font-size: 0.9em; margin-bottom: 20px;">
              {{ t('ble.web_guide') }}
            </p>

            <ion-button expand="block" @click="handleConnect()" :disabled="isConnecting">
                {{ isConnecting ? t('common.progress') : t('ble.open_picker') }}
            </ion-button>
        </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.ble-modal {
  --height: 60%;
  --border-radius: 16px;
}

.web-view-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 20px;
}

.icon-circle {
    width: 80px;
    height: 80px;
    background: var(--ion-color-light);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    color: var(--ion-color-primary);
    font-size: 2rem;
}
</style>

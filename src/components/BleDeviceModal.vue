
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

const isElectron = navigator.userAgent.includes('Electron');
const isNative = Capacitor.isNativePlatform() && !isElectron;
const isScanning = ref(false);
const scannedDevices = ref<ScanResult[]>([]);
const isConnecting = ref(false);
const isBleAvailable = ref(true);
const connectingDeviceId = ref<string | null>(null);

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    // Reset state
    scannedDevices.value = [];
    isConnecting.value = false;
    connectingDeviceId.value = null;
    
    // Native and Electron auto-scan
    // For Electron, we attempt to start. If it blocked by 'user gesture' requirement, 
    // the catch block in startScan triggers, and user can click 'Scan' button.
    if (isNative || isElectron) { 
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
  if (isElectron) {
      (window as any).ElectronBLE?.removeListener();
  }
});

const startScan = async () => {
    // --- Electron Scan Flow ---
    if (isElectron) {
        // Check availability first
        try {
            const available = await (navigator as any).bluetooth.getAvailability();
            isBleAvailable.value = available;
            if (!available) {
                console.warn('Bluetooth not available');
                return;
            }
        } catch(e) { 
           console.warn('Failed to check bluetooth availability', e);
        }

        isScanning.value = true;
        scannedDevices.value = [];
        
        // Listen for devices from Main Process
        (window as any).ElectronBLE?.onDeviceList((devices: any[]) => {
             // Windows often returns 'Unknown' or missing names for BLE devices initially.
             // We allow all devices so the user can select the correct one (likely via RSSI or ID).
             scannedDevices.value = devices.map(d => ({
                 device: { deviceId: d.deviceId, name: d.deviceName || 'Unknown Device' },
                 localName: d.deviceName || 'Unknown Device',
                 rssi: d.rssi || -100
             })).sort((a, b) => b.rssi - a.rssi); // Sort by strongest signal
        });

        const scanStartTime = Date.now();
        try {
            // Trigger the request. This will 'hang' until user selects via IPC.
            // We request the device here, but the UI is populated by the listener above.
            // Windows often fails to filter by Service UUID in advertisements. 
            // We use acceptAllDevices and filter in the callback above.
            const device = await (navigator as any).bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [NUS_SERVICE_UUID]
            });
            
            // If we get here, selection was successful!
            // Proceed to connect immediately
            await connectToDevice(device);

        } catch (e: any) {
            console.warn("Scan cancelled or failed", e);
            isScanning.value = false;

            // Heuristic: If it failed very quickly (< 500ms), it's likely a System Cancellation
            // because Bluetooth is Off (since we ruled out permissions via main process).
            // User Cancellation usually takes longer (time to click 'Cancel').
            const duration = Date.now() - scanStartTime;
            if (duration < 500 && (e.name === 'NotFoundError' || e.message?.includes('cancelled'))) {
                console.log('Rapid failure detected, assuming Bluetooth is Off');
                isBleAvailable.value = false;
            }
        }
        return;
    }

    // --- Native Scan Flow ---
    if (!isNative) return;
    try {
        await BleClient.initialize();
        
        const enabled = await BleClient.isEnabled();
        isBleAvailable.value = enabled;
        if (!enabled) {
            return;
        }

        // Robustness: Ensure any previous scan is stopped before starting
        try { await BleClient.stopLEScan(); } catch {}

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
   isScanning.value = false;

   if (isElectron) {
       // Send empty selection to cancel the requestDevice promise in Main
       (window as any).ElectronBLE?.selectDevice('');
       return;
   }

   if (!isNative) return;
   
   try {
       await BleClient.stopLEScan();
   } catch (e) {
       console.warn('Stop scan failed', e);
   }
};

// Called when user clicks a row
const handleConnect = async (deviceId?: string) => {
    isConnecting.value = true;
    connectingDeviceId.value = deviceId || null;
    
    if (isElectron && deviceId) {
        // Just signal the main process. 
        // The 'startScan' promise will resolve with the device object.
        (window as any).ElectronBLE?.selectDevice(deviceId);
        return;
    }

    // Native flow
    if (isNative && isScanning.value) {
        await stopScan();
    }
    
    // Web flow (Connect button in fallback UI)
    // or Native flow
    connectToDevice(undefined, deviceId);
};

// Actual connection logic
const connectToDevice = async (deviceObj?: any, deviceId?: string) => {
    try {
         const success = await serialStore.connect({ 
            type: 'ble', 
            deviceId: deviceId, // Native needs ID
            device: deviceObj   // Web/Electron needs Object
         });

         if (success) {
             logStore.addLog('system', t('terminal.connectSuccess') + ' (BLE)');
             deviceStore.connectionTypePref = 'ble';
             handleClose();
         } else {
             logStore.addLog('error', t('ble.connect_failed'));
         }
    } catch (e: any) {
        logStore.addLog('error', t('terminal.connectError', {error: e.message}));
    } finally {
        isConnecting.value = false;
        connectingDeviceId.value = null;
        isScanning.value = false;
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
    <ion-content v-if="isNative || isElectron" class="ion-padding">
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
               <ion-spinner v-if="isConnecting && connectingDeviceId === res.device.deviceId" slot="end" name="crescent"></ion-spinner>
           </ion-item>
           
           <ion-item v-if="!isBleAvailable" lines="none" color="warning" class="ion-text-center">
                <ion-label class="ion-text-wrap">
                    <h2>Bluetooth is turned off</h2>
                    <p>Please enable Bluetooth on your computer to scan.</p>
                </ion-label>
                <ion-button slot="end" fill="clear" @click="startScan">Retry</ion-button>
            </ion-item>

            <ion-item v-if="scannedDevices.length === 0 && !isScanning && isBleAvailable" lines="none">
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

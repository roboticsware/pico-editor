import { alertCustom, confirmCustom } from '@/services/modal-confirm';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogStore } from './logStore';

export const useDeviceStore = defineStore('device', () => {
  const selectedDevice = ref<any | null>(null);
  // 'new': 펌웨어 설치, 'retry': 단순 연결 확인, 'already': 이미 펌웨어 탑재 상태
  const fwStatusType = ref<'new' | 'retry' | 'already'>('new');
  const logStore = useLogStore();
  const { t } = useI18n();

  const scanPicoFWstatus = async () => {
    if (!(navigator as any).usb) {
      await alertCustom(t('common.error'), t('editor.serialNotSupported'), '❌');
      return;
    }

    try {
      // 이미 페어링된 장치 목록 가져오기
      let devices = await (navigator as any).usb.getDevices();
      if (devices.length === 0) {
        // 없다면 사용자에게 "기기 찾기" 버튼을 누르게 유도하여 팝업창을 띄움
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x2e8a, productId: 0x0003 }, // 부트로더 모드
            { vendorId: 0x2e8a, productId: 0x0005 }  // MicroPython 모드
          ]
        });
        selectedDevice.value = device;
      }
      devices = await (navigator as any).usb.getDevices();

      // BOOTSEL 모드(새 제품)인 장치가 있는지 확인
      const isNewPico = devices.some((d: any) => d.vendorId === 0x2E8A && d.productId === 0x0003);
      // 이미 MicroPython이 깔린 장치가 있는지 확인
      const isReadyPico = devices.some((d: any) => d.vendorId === 0x2E8A && d.productId === 0x0005);

      if (isReadyPico) {
        // 이미 준비된 피코가 있다면 과정 불필요
        fwStatusType.value = 'already';
      } else if (isNewPico) {
        // 새 피코(부트로더 모드)가 감지되면 바로 펌웨어 설치
        fwStatusType.value = 'new';
      } else {
        // 아무것도 감지되지 않는다면 재시도 안내
        fwStatusType.value = 'retry';
      }
    } catch (err) {
      fwStatusType.value = 'retry';
      logStore.addLog('error', t('terminal.noDeviceSelected', { error: err }));
    }
  };

  const picoIdSuffix = ref(localStorage.getItem('picoIdSuffix') || '');
  const picoModel = ref(localStorage.getItem('picoModel') || '');
  // Background Auto-Scan Logic
  let scanInterval: any = null;
  const isScanning = ref(false);
  const lastDetectedPico = ref<{ hostname: string, battery_percent: number } | null>(null);

  const detectPicoWiFi = async (): Promise<boolean> => {
    try {
      // Use AbortController for short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('http://192.168.4.1:80', {
        signal: controller.signal,
        method: 'GET',
        cache: 'no-store',
        mode: 'cors'
      });
      clearTimeout(timeoutId);

      if (!res.ok) return false;

      const data = await res.json();
      console.log('Pico detected via Info Server:', data);

      lastDetectedPico.value = data;
      const detectedHostname = data.hostname; // e.g., "pico-abc1"

      // If we have a stored suffix, check mismatches
      if (picoIdSuffix.value && picoIdSuffix.value !== 'xxxx') {
        const expected = `pico-${picoIdSuffix.value}`;
        if (detectedHostname !== expected) {
          console.warn(`Detected ${detectedHostname} but expected ${expected}`);
          return true;
        }
      } else {
        // If we don't have a suffix (e.g. reload), extract it
        const parts = detectedHostname.split('-');
        if (parts.length === 2) {
          picoIdSuffix.value = parts[1];
        }
      }

      return true;
    } catch (e) {
      // Fetch failed -> Not connected
      return false;
    }
  };

  // State to prevent overlapping connect attempts
  let isAutoConnectBusy = false;

  const attemptAutoConnect = async () => {
    if (isAutoConnectBusy) return;

    // If already connected, skip
    const { useSerialStore } = await import('./serialStore');
    const serialStore = useSerialStore();
    if (serialStore.isConnected) return;

    isAutoConnectBusy = true;
    try {
      const detected = await detectPicoWiFi();
      if (detected && lastDetectedPico.value) {
        // Stop scanning temporarily while asking
        stopAutoScan();

        const hostname = lastDetectedPico.value.hostname;
        const batt = lastDetectedPico.value.battery_percent;
        // -1 means unsupported/disabled (Pico W stability fix)
        const batteryMsg = (batt !== undefined && batt >= 0) ? `\nBattery: ${batt}%` : '';

        const ok = await confirmCustom(
          t('common.notice'),
          `${t('editor.wifi_detected_title')} (${hostname})${batteryMsg}\n\n${t('editor.wifi_detected_desc')}`,
          '📡'
        );

        if (ok) {
          try {
            // Small delay to ensure no lingering HTTP connections
            await new Promise(r => setTimeout(r, 500));
            await serialStore.connect({
              type: 'wifi',
              host: '192.168.4.1',
              port: 8266,
              password: '1234'
            });
          } catch (e) {
            console.error("Auto-connect failed", e);
            startAutoScan(); // Resume scan if failed
          }
        } else {
          // User put "Later". Resume scan? 
          startAutoScan();
        }
      }
    } finally {
      isAutoConnectBusy = false;
    }
  };

  const startAutoScan = () => {
    if (scanInterval) clearInterval(scanInterval);
    isScanning.value = true;
    scanInterval = setInterval(attemptAutoConnect, 3000);
  };

  const stopAutoScan = () => {
    if (scanInterval) clearInterval(scanInterval);
    isScanning.value = false;
    scanInterval = null;
    isAutoConnectBusy = false;
  };

  const triggerOneShotScan = async () => {
    console.log('Triggering one-shot WiFi scan...');
    await attemptAutoConnect();
  };

  return { selectedDevice, fwStatusType, scanPicoFWstatus, picoIdSuffix, picoModel, startAutoScan, stopAutoScan, triggerOneShotScan };
});
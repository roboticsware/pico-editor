import { alertCustom } from '@/services/modal-confirm';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogStore } from './logStore';

export const useDeviceStore = defineStore('device', () => {
  // 'new': 펌웨어 설치, 'retry': 단순 연결 확인, 'already': 이미 펌웨어 탑재 상태
  const statusType = ref<'new' | 'retry' | 'already'>('new');
  const logStore = useLogStore();

  const { t } = useI18n();

  const scanPicoStatus = async () => {
    if (!(navigator as any).usb) {
      await alertCustom(t('common.error'), t('msg.serialNotSupported'), '❌');
      return;
    }

    try {
      // 1. 이미 페어링된 장치 목록 가져오기
      let devices = await (navigator as any).usb.getDevices();
      if (devices.length === 0) {
        // 없다면 사용자에게 "기기 찾기" 버튼을 누르게 유도하여 팝업창을 띄움
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x2e8a, productId: 0x0003 }, // 부트로더 모드
            { vendorId: 0x2e8a, productId: 0x0005 }  // MicroPython 모드
          ]
        });
      }
      devices = await (navigator as any).usb.getDevices();

      // 2. BOOTSEL 모드(새 제품)인 장치가 있는지 확인
      const isNewPico = devices.some((d: any) => d.vendorId === 0x2E8A && d.productId === 0x0003);
      // 3. 이미 MicroPython이 깔린 장치가 있는지 확인
      const isReadyPico = devices.some((d: any) => d.vendorId === 0x2E8A && d.productId === 0x0005);

      if (isReadyPico) {
        // 이미 준비된 피코가 있다면 과정 불필요
        statusType.value = 'already';
      } else if (isNewPico) {
        // 새 피코(부트로더 모드)가 감지되면 바로 펌웨어 설치
        statusType.value = 'new';
      } else {
        // 아무것도 감지되지 않는다면 재시도 안내
        statusType.value = 'retry';
      }
    } catch (err) {
      statusType.value = 'retry';
      logStore.addLog('error', t('msg.noDeviceSelected', { error: err }));
    }
  };

  return { statusType, scanPicoStatus };
});
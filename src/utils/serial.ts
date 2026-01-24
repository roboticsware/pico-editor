// Re-export ConnectionManager as the new serial utility
import { connectionManager } from './connection/ConnectionManager';

// Compatibility export
export const serial = connectionManager;

// If anyone imports "PicoSerial" type from here (though unlikely used as value is main export)
export type PicoSerial = typeof connectionManager;

export const checkUsbConnection = async () => {
  try {
    // 이제 설정 덕분에 이전에 승인된 포트뿐만 아니라 
    // 현재 연결된 포트들을 가져올 수 있습니다.
    const ports = await navigator.serial.getPorts();

    // Pico 장치 찾기 (Vendor ID: 0x2e8a)
    const picoPort = ports.find(port => {
      const { usbVendorId } = port.getInfo();
      return usbVendorId === 11914 || usbVendorId === 0x2e8a;
    });

    return !!picoPort;
  } catch (err) {
    console.error("포트 확인 중 오류:", err);
    return false;
  }
};

// Helpers for detecting Pico connectivity by WiFi
export const isWebReplAvailable = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://192.168.4.1:8266');
    ws.binaryType = 'arraybuffer';

    // Set a short timeout (e.g. 1000ms)
    const timer = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 1200);

    ws.onopen = () => {
      clearTimeout(timer);
      ws.close();
      resolve(true);
    };

    ws.onerror = () => {
      clearTimeout(timer);
      // resolve(false) happens on close or we assume failure
      resolve(false);
    };
  });
};

export const getPicoHostname = async (): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('http://192.168.4.1:80', {
      signal: controller.signal,
      method: 'GET',
      cache: 'no-store'
      // mode: 'cors' // Optional depending on server config
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return data.hostname || null;
  } catch {
    return null;
  }
};

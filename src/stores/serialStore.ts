import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serial } from '../utils/serial';
import { AVAILABLE_LIBRARIES, type Library } from '@/constants/libraries';
import type { ConnectionType } from '@/utils/connection/ConnectionManager';

import { useLogStore } from './logStore';
import i18n from '@/i18n';
import { toastController } from '@ionic/vue';

export const useSerialStore = defineStore('serial', () => {
  const { t } = i18n.global;

  // Connection type and state
  const connectionType = ref<ConnectionType>('serial');
  const isConnected = ref(false);
  const isRunning = ref(false); // 실행 상태
  const isUploading = ref(false); // 업로드 상태
  const uploadProgress = ref(0); // 업로드 진행률
  const isInstallingLibrary = ref(false); // 라이브러리 설치 상태
  const libraryInstallProgress = ref(0); // 라이브러리 설치 진행률
  const errorLogs = ref<{ time: string, content: string }[]>([]); // 에러만 따로 보관
  const hasError = ref(false); // UI에서 에러 창을 띄울지 결정하는 플래그
  const installedFiles = ref<string[]>([]);
  const libraries = ref<Library[]>(AVAILABLE_LIBRARIES);
  const isSyncing = ref(false);
  const isManualDisconnect = ref(false);

  // Cache for library versions on the connected Pico
  const remoteLibraryManifest = ref<Record<string, string>>({});

  // WiFi-specific state for UI binding
  const wifiConfig = ref({
    host: '192.168.4.1',
    port: 8266,
    password: '',
  });

  // Listener setup
  serial.setDisconnectListener(() => {
    disconnect(); // Ensure full state cleanup

    const logStore = useLogStore();
    logStore.addLog('system', t('navbar.disconnect'));

    toastController.create({
      message: t('editor.disconnectedFromDevice'),
      duration: 2000,
      color: 'warning'
    }).then(t => t.present());
  });

  // Handle global network offline event (specifically for WiFi connections)
  window.addEventListener('offline', () => {
    if (isConnected.value && connectionType.value === 'wifi') {
      const logStore = useLogStore();
      logStore.addLog('system', t('terminal.networkDisconnected'));
      disconnect();

      toastController.create({
        message: t('terminal.networkDisconnected'),
        duration: 2000,
        color: 'warning'
      }).then(t => t.present());
    }
  });

  serial.setLogListener((data: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Raw]:', data);
    }

    const cleanData = data
      .replace(/\x1b\[[0-9;]*m/g, '') // ANSI 색상 코드 제거
      .replace(/>>>\s*/g, '') // REPL 프롬프트 제거
      .replace(/\r/g, '') // 캐리지 리턴 제거
      .trim();

    // 의미있는 내용이 있으면 사용자 터미널에 표시
    if (cleanData && cleanData.length > 0) {
      if (!cleanData.match(/^(OK|ok|raw REPL)/i)) {
        const logStore = useLogStore();
        logStore.addLog('output', cleanData);
      }
    }

    // 에러 키워드 감지
    const lowerData = data.toLowerCase();
    if (lowerData.includes('error') || lowerData.includes('traceback')) {
      const timestamp = new Date().toLocaleTimeString();
      errorLogs.value.push({ time: timestamp, content: data });
      hasError.value = true;
    }
  });

  // 공용 함수: 연결하기
  async function connect(config?: { type?: ConnectionType; host?: string; port?: number; password?: string, deviceId?: string, device?: any }) {
    try {
      isManualDisconnect.value = false;
      if (config?.type) {
        connectionType.value = config.type;
      }

      if (config?.host) wifiConfig.value.host = config.host;
      if (config?.port) wifiConfig.value.port = config.port;
      if (config?.password) wifiConfig.value.password = config.password;

      // Delegate to ConnectionManager
      const success = await serial.connect({
        type: connectionType.value,
        host: wifiConfig.value.host,
        port: wifiConfig.value.port,
        password: wifiConfig.value.password,
        deviceId: config?.deviceId,
        device: config?.device
      });

      if (success) {
        isConnected.value = true;
        return success;
      }
      return false;

    } catch (e) {
      throw e;
    }
  }

  function clearErrorLogs() {
    errorLogs.value = [];
    hasError.value = false;
  }

  function isVersionLower(v1: string, v2: string): boolean {
    const parse = (v: string) => v.split('.').map(n => parseInt(n) || 0);
    const ver1 = parse(v1);
    const ver2 = parse(v2);

    for (let i = 0; i < 3; i++) {
      if ((ver1[i] || 0) < (ver2[i] || 0)) return true;
      if ((ver1[i] || 0) > (ver2[i] || 0)) return false;
    }
    return false;
  }

  // 라이브러리 자동 설치 확인 로직
  async function checkAndInstallLibraries(code: string) {
    // Lazy load manifest if empty
    if (Object.keys(remoteLibraryManifest.value).length === 0 && isConnected.value) {
      try {
        const manifestStr = await serial.readFile('.lib_manifest.json');
        if (manifestStr) {
          try {
            remoteLibraryManifest.value = JSON.parse(manifestStr);
          } catch (e) {
            console.error('Failed to parse library manifest:', e);
          }
        }
      } catch (e) {
        console.error('Failed to read library manifest:', e);
      }
    }

    const neededLibs = new Set<string>();
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        const parts = trimmed.substring(7).split(',');
        parts.forEach(p => {
          const libName = p.trim().split(' ')[0];
          if (libName) neededLibs.add(libName);
        });
      } else if (trimmed.startsWith('from ')) {
        const libName = trimmed.split(' ')[1];
        if (libName) neededLibs.add(libName);
      }
    }

    for (const libID of neededLibs) {
      const libDef = libraries.value.find(l => l.id === libID || l.fileName === libID + '.py' || l.id === libID.replace('.py', ''));
      if (libDef) {
        const remoteVer = remoteLibraryManifest.value[libDef.id];
        let shouldInstall = false;
        let msg = '';

        if (!remoteVer) {
          shouldInstall = true;
          msg = `Installing library: ${libDef.name} (${libDef.version})...`;
        } else if (isVersionLower(remoteVer, libDef.version || '0.0.0')) {
          shouldInstall = true;
          msg = t('navbar.library_update', {
            name: libDef.name,
            oldVer: remoteVer,
            newVer: libDef.version
          });

          toastController.create({
            message: msg,
            duration: 3000,
            position: 'top',
            color: 'primary'
          }).then(t => t.present());
        }

        if (shouldInstall) {
          const logStore = useLogStore();
          logStore.addLog('system', msg);

          isInstallingLibrary.value = true;
          libraryInstallProgress.value = 0;

          await installLibrary(libDef);

          const newVer = libDef.version || '0.0.0';
          remoteLibraryManifest.value[libDef.id] = newVer;
          const newManifest = JSON.stringify(remoteLibraryManifest.value);

          await serial.uploadFile('.lib_manifest.json', newManifest, undefined, false);
          await new Promise(r => setTimeout(r, 200));

          isInstallingLibrary.value = false;
          libraryInstallProgress.value = 0;
        }
      }
    }
  }

  async function run(code: string) {
    if (!isConnected.value) return;

    if (connectionType.value === 'serial' || connectionType.value === 'wifi') {
      await checkAndInstallLibraries(code);
    }

    isRunning.value = true;
    await serial.runInREPL(code);
  }

  async function stop() {
    if (!isConnected.value) return;
    await serial.write('\x03'); // Ctrl+C
    await new Promise(r => setTimeout(r, 50));
    await serial.write('\x03'); // Double Ctrl+C
    await new Promise(r => setTimeout(r, 50));
    await serial.write('\x02'); // Ctrl+B (Exit Raw REPL)
    isRunning.value = false;
  }

  async function upload(code: string) {
    if (!isConnected.value) return;

    isUploading.value = true;
    uploadProgress.value = 0;
    try {
      await serial.uploadFile('main.py', code, (p) => {
        uploadProgress.value = p;
      }, true); // Reset=true

      isConnected.value = false;
      isRunning.value = false;
      clearErrorLogs();

      await new Promise(r => setTimeout(r, 1000));
      return true;
    } catch (e) {
      console.error("Upload failed:", e);
      return false;
    } finally {
      isUploading.value = false;
    }
  }

  async function disconnect(manual: boolean = false) {
    if (manual) isManualDisconnect.value = true;
    await serial.disconnect();
    isConnected.value = false;
    isRunning.value = false;
    isUploading.value = false;
    clearErrorLogs();
  }

  const syncFileList = async () => {
    if (!isConnected.value) return;
    isSyncing.value = true;
    try {
      installedFiles.value = await serial.getFileList();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      isSyncing.value = false;
    }
  };

  const installLibrary = async (lib: Library) => {
    try {
      let content = lib.content;
      if (!content) {
        try {
          let fileNameToFetch = lib.fileName;

          // Special handling for boot.py
          // If 'ble_uart' is installed, we assume the user wants BLE boot mode.
          // Otherwise, default to WiFi boot mode.
          if (lib.id === 'boot') {
            const hasBle = !!remoteLibraryManifest.value['ble_uart'];
            fileNameToFetch = hasBle ? 'boot_ble.py' : 'boot_wifi.py';
            console.log(`[InstallLibrary] Selected boot script: ${fileNameToFetch} (BLE=${hasBle})`);
          }

          const res = await fetch(`/assets/libs/${fileNameToFetch}`);
          if (!res.ok) throw new Error(`Failed to load library: ${res.statusText}`);
          content = await res.text();
        } catch (e) {
          console.error("Library fetch error:", e);
          return;
        }
      }
      // reset=false for libraries
      let targetPath = `/lib/${lib.fileName}`;
      if (lib.id === 'boot') targetPath = 'boot.py';

      await serial.uploadFile(targetPath, content, (p) => {
        libraryInstallProgress.value = p;
      }, false);
      await syncFileList();
    } catch (e) {
      console.error("Library installation failed:", e);
      throw e;
    }
  };

  const uninstallLibrary = async (fileName: string) => {
    isUploading.value = true;
    try {
      await serial.deleteFile(fileName);
      await syncFileList();
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isConnected, isRunning, isUploading, uploadProgress,
    isInstallingLibrary, libraryInstallProgress,
    errorLogs, hasError, clearErrorsLogs: clearErrorLogs, connect, disconnect, upload, run, stop,
    installedFiles,
    libraries,
    isSyncing,
    syncFileList,
    installLibrary,
    uninstallLibrary,
    isManualDisconnect,
    isInstalled: computed(() => (name: string) => installedFiles.value.includes(name)),
    wifiConfig,
    connectionType
  };
});
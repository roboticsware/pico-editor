import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serial } from '../utils/serial';
import { AVAILABLE_LIBRARIES, type Library } from '@/constants/libraries';
import { ConnectionType } from '@/types/transport';

import { useLogStore } from './logStore';
import i18n from '@/i18n';

export const useSerialStore = defineStore('serial', () => {
  const { t } = i18n.global;

  // Connection type and state
  const connectionType = ref<ConnectionType>(ConnectionType.SERIAL);
  const isConnected = ref(false);
  const isRunning = ref(false); // 실행 상태
  const isUploading = ref(false); // 업로드 상태
  const uploadProgress = ref(0); // 업로드 진행률
  const errorLogs = ref<{ time: string, content: string }[]>([]); // 에러만 따로 보관
  const hasError = ref(false); // UI에서 에러 창을 띄울지 결정하는 플래그
  const installedFiles = ref<string[]>([]);
  const libraries = ref<Library[]>(AVAILABLE_LIBRARIES);
  const isSyncing = ref(false);

  // Cache for library versions on the connected Pico
  const remoteLibraryManifest = ref<Record<string, string>>({});

  // WiFi-specific state
  const wifiConfig = ref({
    host: '192.168.4.1',
    port: 8266,
    password: '',
  });
  const ws = ref<WebSocket | null>(null);
  const lastResponse = ref('');

  // 기기 분리 감지 리스너 설정
  serial.setDisconnectListener(() => {
    if (connectionType.value === ConnectionType.SERIAL) {
      isConnected.value = false;
      isRunning.value = false;
      isUploading.value = false;

      // 로그창에 알림 추가
      const logStore = useLogStore();
      logStore.addLog('system', t('navbar.disconnect'));
    }
  });

  // WiFi WebSocket 설정
  function setupWebSocketListeners() {
    if (!ws.value) return;

    ws.value.onopen = () => {
      console.log('WebREPL connection opened');
    };

    ws.value.onmessage = (event) => {
      const data = event.data;

      if (typeof data === 'string') {
        lastResponse.value += data;

        // Password prompt
        if (data.includes('Password:')) {
          sendWiFiPassword();
        } else if (data.includes('WebREPL connected')) {
          isConnected.value = true;
          console.log('WebREPL authentication successful');

          // Setup log listener for WiFi
          serial.setLogListener((logData: string) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[WiFi Raw]:', logData);
            }

            const lowerData = logData.toLowerCase();
            if (lowerData.includes('error') || lowerData.includes('traceback')) {
              const timestamp = new Date().toLocaleTimeString();
              errorLogs.value.push({ time: timestamp, content: logData });
              hasError.value = true;
            }
          });
        } else {
          // Forward to log listener
          if (serial['logListener']) {
            serial['logListener'](data);
          }
        }
      }
    };

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error);
      hasError.value = true;
    };

    ws.value.onclose = () => {
      console.log('WebSocket connection closed');
      if (connectionType.value === ConnectionType.WIFI) {
        isConnected.value = false;
        ws.value = null;

        const logStore = useLogStore();
        logStore.addLog('system', t('navbar.disconnect'));
      }
    };
  }

  function sendWiFiPassword() {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(wifiConfig.value.password + '\r\n');
    }
  }

  // 공용 함수: 연결하기 (Serial 또는 WiFi)
  async function connect(config?: { type?: ConnectionType; host?: string; port?: number; password?: string }) {
    try {
      // 연결 타입 설정
      if (config?.type) {
        connectionType.value = config.type;
      }

      if (connectionType.value === ConnectionType.WIFI) {
        // WiFi 연결
        if (config?.host) wifiConfig.value.host = config.host;
        if (config?.port) wifiConfig.value.port = config.port;
        if (config?.password) wifiConfig.value.password = config.password;

        const wsUrl = `ws://${wifiConfig.value.host}:${wifiConfig.value.port}/`;
        ws.value = new WebSocket(wsUrl);

        setupWebSocketListeners();

        return new Promise<boolean>((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!isConnected.value) {
              disconnect();
              reject(new Error('Connection timeout'));
            }
          }, 10000);

          const checkConnection = setInterval(() => {
            if (isConnected.value) {
              clearTimeout(timeout);
              clearInterval(checkConnection);
              resolve(true);
            }
          }, 100);
        });
      } else {
        // Serial 연결 (기존 로직)
        const success = await serial.connect();
        if (success) {
          isConnected.value = true;

          serial.setLogListener((data: string) => {
            // 개발자 모드용 전체 로그 출력 (브라우저 콘솔)
            if (process.env.NODE_ENV === 'development') {
              console.log('[Serial Raw]:', data);
            }

            // 에러 키워드 감지 (MicroPython 에러 패턴)
            const lowerData = data.toLowerCase();
            if (lowerData.includes('error') || lowerData.includes('traceback')) {
              const timestamp = new Date().toLocaleTimeString();
              errorLogs.value.push({ time: timestamp, content: data });
              hasError.value = true; // 에러 발생 시 UI 상태 업데이트
            }
          });

          serial.startListening();

          // Initial Sync: Fetch Library Manifest
          try {
            const manifestStr = await serial.readFile('.lib_manifest.json');
            if (manifestStr) {
              try {
                remoteLibraryManifest.value = JSON.parse(manifestStr);
              } catch (jsonErr) {
                console.warn('Invalid JSON in manifest', jsonErr);
                remoteLibraryManifest.value = {};
              }
            } else {
              remoteLibraryManifest.value = {};
            }
          } catch (e) {
            console.warn('Failed to load library manifest:', e);
            remoteLibraryManifest.value = {};
          }
        }
        return success;
      }
    } catch (e) {
      // 에러가 발생한 경우 상위로 전달
      throw e;
    }
  }

  // 에러 확인 후 창을 닫을 때 사용
  function clearErrorLogs() {
    errorLogs.value = [];
    hasError.value = false;
  }

  // 라이브러리 자동 설치 확인 로직
  async function checkAndInstallLibraries(code: string) {
    // 1. 필요한 라이브러리 파악 (import 구문 파싱)
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

    // 2. 검사 및 설치
    for (const libID of neededLibs) {
      const libDef = libraries.value.find(l => l.id === libID || l.fileName === libID + '.py' || l.id === libID.replace('.py', ''));
      if (libDef) {
        const remoteVer = remoteLibraryManifest.value[libDef.id];

        let shouldInstall = false;
        let msg = '';

        if (!remoteVer) {
          shouldInstall = true;
          msg = `Installing library: ${libDef.name} (${libDef.version})...`;
        } else if (remoteVer !== libDef.version) {
          // 단순 문자열 비교 (Semver 비교가 더 좋지만 일단 다르면 업데이트)
          shouldInstall = true;
          msg = `Updating library: ${libDef.name} (${remoteVer} -> ${libDef.version})...`;
        }

        if (shouldInstall) {
          // Toast/Log
          const logStore = useLogStore();
          logStore.addLog('system', msg);
          // TODO: Toast UI (via alertCustom or similar? For now silent + log)

          await installLibrary(libDef);

          // Update Manifest
          const newVer = libDef.version || '0.0.0';
          remoteLibraryManifest.value[libDef.id] = newVer;
          const newManifest = JSON.stringify(remoteLibraryManifest.value);

          // Write manifest back to Pico
          await uploadFile('.lib_manifest.json', newManifest, undefined, false);
          await new Promise(r => setTimeout(r, 200)); // 잠깐 대기
        }
      }
    }
  }

  // 내부용: 파일 업로드 (installLibrary에서 사용하던 로직 분리 또는 재사용)
  // installLibrary가 이미 구현되어 있으니 그걸 쓰면 됨.
  // 단, manifest 저장을 위해 uploadFile을 직접 호출해야 함. 
  // serial.uploadFile을 직접 쓰거나 store의 upload를 쓰는데 store upload는 reset을 함.
  // serial.uploadFile을 직접 쓰는게 나음.

  async function uploadFile(filename: string, content: string, onProgress?: (p: number) => void, reset: boolean = false) {
    if (connectionType.value === ConnectionType.SERIAL) {
      await serial.uploadFile(filename, content, onProgress, reset);
    } else {
      // WiFi support...
      const saveCode = `
with open('${filename}', 'w') as f:
    f.write('''${content.replace(/'/g, "\\'")}''')
`;
      await runInternal(saveCode);
    }
  }

  // run() 호출 시 재귀 방지를 위해 내부 실행용 함수 분리
  async function runInternal(code: string) {
    if (connectionType.value === ConnectionType.WIFI) {
      if (!ws.value) return;
      lastResponse.value = '';
      ws.value.send('\x03');
      await new Promise(resolve => setTimeout(resolve, 100));
      ws.value.send('\x05');
      await new Promise(resolve => setTimeout(resolve, 100));
      ws.value.send(code);
      await new Promise(resolve => setTimeout(resolve, 100));
      ws.value.send('\x04');
    } else {
      await serial.runInREPL(code);
    }
  }


  // 공용 함수: 코드 실행
  async function run(code: string) {
    if (!isConnected.value) return;

    if (connectionType.value === ConnectionType.SERIAL) {
      await checkAndInstallLibraries(code);
    }

    isRunning.value = true;

    await runInternal(code);
  }

  // 공용 함수: 코드 실행 중지
  async function stop() {
    if (!isConnected.value) return;

    if (connectionType.value === ConnectionType.WIFI) {
      // WiFi: Send Ctrl+C to interrupt
      if (ws.value) {
        ws.value.send('\x03');
      }
    } else {
      // Serial: 마이크로파이썬에 Ctrl+C (Keyboard Interrupt) 신호 전송
      await serial.write('\x03');
    }
    isRunning.value = false;
  }

  // 공용 함수: 코드 업로드
  async function upload(code: string) {
    if (!isConnected.value) return;

    isUploading.value = true;
    uploadProgress.value = 0;
    try {
      if (connectionType.value === ConnectionType.WIFI) {
        // WiFi 업로드 (간소화된 버전)
        // WebREPL file transfer protocol would be needed for proper implementation
        // For now, we'll use REPL commands to write the file
        if (!ws.value) return false;

        const saveCode = `
with open('main.py', 'w') as f:
    f.write('''${code.replace(/'/g, "\\'")}''')
import machine
machine.reset()
`;
        await run(saveCode);

        // WiFi 업로드 후 연결 끊김
        isConnected.value = false;
        isRunning.value = false;
        clearErrorLogs();

        await new Promise(r => setTimeout(r, 1000));
        return true;
      } else {
        // Serial 업로드 (기존 로직)
        await serial.uploadFile('main.py', code, (p) => {
          uploadProgress.value = p; // UI에서 0~100 숫자로 활용 가능
        }, true); // 실행 코드이므로 리셋 필요

        // 업로드 성공 후: 기기가 리셋되므로 연결을 끊긴 상태로 변경
        isConnected.value = false;
        isRunning.value = false;
        clearErrorLogs();

        await new Promise(r => setTimeout(r, 1000));
        return true;
      }
    } catch (e) {
      console.error("Upload failed:", e);
      return false;
    } finally {
      isUploading.value = false;
    }
  }

  // 공용 함수: 연결 해제
  async function disconnect() {
    if (connectionType.value === ConnectionType.WIFI) {
      // WiFi 연결 해제
      if (ws.value) {
        ws.value.close();
        ws.value = null;
      }
    } else {
      // Serial 연결 해제
      await serial.disconnect();
      isRunning.value = false;
      isUploading.value = false;
    }
    isConnected.value = false;
    clearErrorLogs();
  }

  // 현재 보드에 설치된 파일 목록 가져오기
  const syncFileList = async () => {
    if (!isConnected.value) return;
    isSyncing.value = true;
    try {
      if (connectionType.value === ConnectionType.WIFI) {
        // WiFi: Get file list via WebREPL
        const code = `
import os
print(os.listdir())
`;
        lastResponse.value = '';
        await run(code);

        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 500));

        // Parse file list from response
        const match = lastResponse.value.match(/\[([^\]]+)\]/);
        if (match && match[1]) {
          installedFiles.value = match[1].split(',').map(f => f.trim().replace(/'/g, ''));
        }
      } else {
        // Serial: Get file list
        installedFiles.value = await serial.getFileList();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      isSyncing.value = false;
    }
  };

  const installLibrary = async (lib: Library) => {
    isUploading.value = true;
    try {
      let content = lib.content;
      if (!content) {
        // Load from Assets
        try {
          const res = await fetch(`/assets/libs/${lib.fileName}`);
          if (!res.ok) throw new Error(`Failed to load library: ${res.statusText}`);
          content = await res.text();
        } catch (e) {
          console.error("Library fetch error:", e);
          // Fallback or abort? Abort seems safer.
          return;
        }
      }

      if (connectionType.value === ConnectionType.WIFI) {
        // WiFi: Upload library file
        const saveCode = `
with open('${lib.fileName}', 'w') as f:
    f.write('''${content.replace(/'/g, "\\'")}''')
`;
        await run(saveCode);
        await syncFileList();
      } else {
        // Serial: Upload library file
        await serial.uploadFile(lib.fileName, content, (p) => {
          uploadProgress.value = p;
        }, false); // 라이브러리 설치 시에는 리셋하지 않음

        await syncFileList();
      }
    } finally {
      isUploading.value = false;
    }
  };

  const uninstallLibrary = async (fileName: string) => {
    isUploading.value = true;
    try {
      if (connectionType.value === ConnectionType.WIFI) {
        // WiFi: Delete file
        const deleteCode = `
import os
os.remove('${fileName}')
`;
        await run(deleteCode);
        await syncFileList();
      } else {
        // Serial: Delete file
        await serial.deleteFile(fileName);
        await syncFileList();
      }
    } finally {
      isUploading.value = false;
    }
  };

  return {
    isConnected, isRunning, isUploading, uploadProgress, errorLogs, hasError, clearErrorsLogs: clearErrorLogs, connect, disconnect, upload, run, stop,
    installedFiles,
    libraries,
    isSyncing,
    syncFileList,
    installLibrary,
    uninstallLibrary,
    isInstalled: computed(() => (name: string) => installedFiles.value.includes(name)),
  };
});
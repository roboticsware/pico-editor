import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serial } from '../utils/serial';
import { AVAILABLE_LIBRARIES, type Library } from '@/constants/libraries';

export const useSerialStore = defineStore('serial', () => {
  const isConnected = ref(false);
  const isRunning = ref(false); // 실행 상태
  const isUploading = ref(false); // 업로드 상태
  const uploadProgress = ref(0); // 업로드 진행률
  const errorLogs = ref<{time: string, content: string}[]>([]); // 에러만 따로 보관
  const hasError = ref(false); // UI에서 에러 창을 띄울지 결정하는 플래그
  const installedFiles = ref<string[]>([]);
  const libraries = ref<Library[]>(AVAILABLE_LIBRARIES);
  const isSyncing = ref(false);

  // 공용 함수: 연결하기
  async function connect() {
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
    }
    return success;
  }

  // 에러 확인 후 창을 닫을 때 사용
  function clearErrorLogs() {
    errorLogs.value = [];
    hasError.value = false;
  }

  // 공용 함수: 코드 업로드
  async function upload(code: string) {
    if (!isConnected.value) return;
    
    isUploading.value = true;
    uploadProgress.value = 0;
    try {
      // 1. 업로드 로직 실행 (serial.ts의 함수 호출)
      await serial.uploadFile('main.py', code, (p) => {
        uploadProgress.value = p; // UI에서 0~100 숫자로 활용 가능
      }, true); // 실행 코드이므로 리셋 필요
      // 업로드 성공 후: 기기가 리셋되므로 연결을 끊긴 상태로 변경
      isConnected.value = false; 
      isRunning.value = false;
      clearErrorLogs();
      // 2. 업로드 완료 후 리셋 시간 동안 잠시 대기 (피코가 재부팅되는 시간)
      await new Promise(r => setTimeout(r, 1000));
      return true;
    } catch (e) {
      console.error("Upload failed:", e);
      return false;
    } finally {
      isUploading.value = false;
    }
  }

  // 공용 함수: 코드 실행
  async function run(code: string) {
    if (!isConnected.value) return;
    isRunning.value = true;
    await serial.runInREPL(code);
  }

  // 공용 함수: 코드 실행 중지
  async function stop() {
    if (!isConnected.value) return;
    // 마이크로파이썬에 Ctrl+C (Keyboard Interrupt) 신호 전송
    await serial.write('\x03'); 
    isRunning.value = false;
  }

  // 공용 함수: 연결 해제
  async function disconnect() {
    await serial.disconnect();
    isConnected.value = false;
    clearErrorLogs();
  }

  // 현재 보드에 설치된 파일 목록 가져오기
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
    isUploading.value = true;
    try {
      await serial.uploadFile(lib.fileName, lib.content, (p) => {
        uploadProgress.value = p; // UI에서 0~100 숫자로 활용 가능
      }, false); // 라이브러리 설치 시에는 리셋하지 않음
      
      await syncFileList();
    } finally {
      isUploading.value = false;
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
// Pico(MicroPython)와의 시리얼 통신을 위한 유틸리티
import i18n from '@/i18n';
import { alertCustom } from '@/services/modal-confirm';

export class PicoSerial {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private logListener: ((data: string) => void) | null = null;
  private disconnectListener: (() => void) | null = null;

  constructor() {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      navigator.serial.addEventListener('disconnect', (event) => {
        // 현재 연결된 포트가 분리되었는지 확인
        if (this.port === (event as any).port || this.port === event.target) {
          console.log('[Serial] Device disconnected unexpectedly.');
          this.handleUnexpectedDisconnect();
        }
      });
    }
  }

  private handleUnexpectedDisconnect() {
    // 내부 상태 초기화 (이미 연결이 끊겼으므로 port.close() 호출은 생략할 수 있음)
    this.reader = null;
    this.writer = null;
    this.port = null;
    if (this.disconnectListener) {
      this.disconnectListener();
    }
  }

  setDisconnectListener(callback: () => void) {
    this.disconnectListener = callback;
  }

  setLogListener(callback: (data: string) => void) {
    this.logListener = callback;
  }

  // 1. 포트 요청 및 연결
  async connect(): Promise<boolean> {
    const { t } = i18n.global;
    try {
      // 1. 브라우저 지원 여부 확인
      if (!('serial' in navigator)) {
        await alertCustom(t('common.error'), t('msg.serialNotSupported'), '❌');
        return false;
      }
      // 2. 포트 요청 (반드시 사용자 클릭 이벤트 내부여야 함)
      // @ts-ignore: Web Serial API 타입 미지원 대비
      this.port = await navigator.serial.requestPort();

      if (!this.port) {
        throw new Error(t('msg.noDeviceSelected'));
      }

      await this.port.open({ baudRate: 115200 });

      if (this.port.readable) {
        this.reader = this.port.readable.getReader();
      }
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }
      return true;

    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new Error(t('msg.noDeviceFound'));
      } else if (error.name === 'SecurityError') {
        throw new Error(t('msg.securityError'));
      } else if (error.message.includes('Failed to open serial port')) {
        throw new Error(t('msg.portAlreadyOpen'));
      } else {
        throw error; // 기타 예상치 못한 에러는 그대로 던짐
      }
    }
  }

  // 리더 자원을 안전하게 해제하는 별도 함수
  async cleanupReader() {
    if (this.reader) {
      try {
        this.reader.releaseLock();
      } catch (e) { /* 이미 잠금 해제된 경우 무시 */ }
      this.reader = null;
    }
  }

  private incomingBuffer: string = "";

  async startListening() {
    if (!this.reader) return;

    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          const text = decoder.decode(value);
          this.incomingBuffer += text; // 버퍼에 누적
          if (this.logListener) {
            this.logListener(text);
          }
        }
      }
    } catch (error: any) {
      // 기기 재부팅을 위한 machine.reset() 등으로 인한 연결 끊김은 정상으로 처리
      if (error.message.includes('lost') || error.name === 'NetworkError') {
        console.log("Device reset detected (Network (lost) Error). Cleaning up...");
      } else {
        console.error("Listening error:", error);
      }
    } finally {
      // 에러가 나든 정상 종료되든 리더를 닫아줌
      await this.cleanupReader();
    }
  }

  // 2. 텍스트 전송 (명령어 전송용)
  async write(text: string) {
    if (!this.writer) return;
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode(text));
  }

  // 3. 코드 실행 명령 (REPL 소프트 리셋 및 실행)
  async runInREPL(code: string) {
    if (!this.writer) return;

    // Ctrl+C: 현재 실행 중인 기존 프로그램 중단
    await this.write('\x03'); // Keyboard Interrupt - 현재 실행 중인 루프를 즉시 멈춥니다.
    await new Promise(r => setTimeout(r, 500)); // 약간의 대기 후 코드 전송

    // Ctrl+A: Raw REPL 모드 진입 (대량의 코드를 보낼 때 안정적임)
    await this.write('\x01');
    await new Promise(r => setTimeout(r, 100));

    // 실제 코드 전송
    await this.write(code);

    // Ctrl+D: 실행 (Soft Reset)
    await this.write('\x04'); // Soft Reset - HW 재부팅없이 새로 시작하는 것처럼 초기화 한 후 전송된 코드 실행
  }

  async uploadFile(filename: string, code: string, onProgress?: (p: number) => void, shouldReset: boolean = false) {
    if (!this.writer) return;

    // 1. 준비 작업: 현재 실행 중인 코드 중단 (Ctrl+C)
    await this.write('\x03');
    await new Promise(r => setTimeout(r, 300));

    // 2. Raw REPL 모드 진입 (Ctrl+A)
    await this.write('\x01');
    await new Promise(r => setTimeout(r, 100));

    // 3. 코드를 Base64로 인코딩 (한글/특수문자 대응 UTF-8)
    const base64Code = btoa(encodeURIComponent(code).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));

    // 4. 저장 스크립트 구성 (전달받은 filename 사용)
    const saveScript = [
      "import ubinascii",
      `b64 = '${base64Code}'`,
      `with open('${filename}', 'wb') as f:`, // 인자로 받은 파일명 적용
      "    f.write(ubinascii.a2b_base64(b64))",
      shouldReset ? "import machine; machine.reset()" : "" // 옵션에 따른 리셋 여부
    ].filter(line => line !== "").join('\n') + '\n\x04';

    // 5. 데이터 쪼개서 보내기 (Chunk 전송)
    const encoder = new TextEncoder();
    const data = encoder.encode(saveScript);
    const chunkSize = 64;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.writer.write(chunk);

      if (onProgress) {
        const progress = Math.round(((i + chunk.length) / data.length) * 100);
        onProgress(progress);
      }

      await new Promise(r => setTimeout(r, 20));
    }

    // 6. 정상 모드 복귀 (Ctrl+B)
    await this.write('\x02');
  }

  async disconnect() {
    try {
      // 1. 읽기 스트림이 있다면 중단시킴
      if (this.reader) {
        await this.reader.cancel(); // 읽기 루프를 즉시 종료시킴
        if (this.reader) {
          this.reader.releaseLock();  // 스트림의 잠금을 해제
          this.reader = null;
        }
      }

      // 2. 출력 스트림(Writer)이 있다면 마찬가지로 처리
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      // 3. 모든 스트림이 해제된 후 포트를 닫음
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      console.log("포트가 안전하게 닫혔습니다.");
    } catch (error) {
      console.error("연결 해제 중 오류:", error);
    }
  }


  // 파이썬 명령을 실행하고 그 출력 결과(stdout)를 반환합니다.
  async executeCommand(command: string): Promise<string> {
    if (!this.port || !this.writer) throw new Error("Not connected");

    try {
      // 1. 명령 전송 (\r\n 필수)
      await this.write(command + "\r\n");

      // 2. 결과 읽기 (startListening에서 누적된 버퍼 사용)
      return await this.readResponse();
    } catch (err) {
      throw err;
    }
  }

  private async readResponse(): Promise<string> {
    this.incomingBuffer = ""; // 버퍼 비우고 대기

    // 최대 1초 동안 MicroPython REPL 종료 기호(>>> )가 나올 때까지 대기
    const startTime = Date.now();
    while (Date.now() - startTime < 1000) {
      if (this.incomingBuffer.includes(">>> ")) {
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    return this.incomingBuffer;
  }

  // 파이썬 리스트 문자열 파싱 로직
  async parsePythonList(str: string): Promise<string[]> {
    const match = str.match(/\[(.*?)\]/);
    if (!match || !match[1]) return [];
    return match[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(s => s);
  };

  // 피코 보드의 파일 목록 가져오기
  async getFileList(): Promise<string[]> {
    const command = "import os; print(os.listdir())\r\n";
    const result = await this.executeCommand(command); // 명령 실행 후 결과 문자열 파싱
    // 결과 예시: "['main.py', 'pico_utils.py']" -> 배열로 변환 로직 필요
    return this.parsePythonList(result);
  }

  // 파일 삭제
  async deleteFile(filename: string) {
    // MicroPython에서 os.remove('파일명') 명령을 실행합니다.
    await this.executeCommand(`import os; os.remove('${filename}')`);
  }
}

export const serial = new PicoSerial();
// Pico(MicroPython)와의 시리얼 통신을 위한 유틸리티
export class PicoSerial {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private logListener: ((data: string) => void) | null = null;

  // 1. 포트 요청 및 연결
  async connect(): Promise<boolean> {
    try {
      // 1. 브라우저 지원 여부 확인
      if (!('serial' in navigator)) {
        alert('이 브라우저는 Web Serial API를 지원하지 않습니다. 크롬/엣지를 사용하세요.');
        return false;
      }
      // 2. 포트 요청 (반드시 사용자 클릭 이벤트 내부여야 함)
      // @ts-ignore: Web Serial API 타입 미지원 대비
      this.port = await navigator.serial.requestPort();
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
        console.log('사용자가 장치 선택을 취소했습니다.');
      } else if (error.name === 'SecurityError') {
        console.error('보안 정책에 의해 차단되었습니다 (HTTPS 확인 필요).');
      } else {
        console.error('연결 중 알 수 없는 에러:', error);
      }
    }

    return false;
  }

  setLogListener(callback: (data: string) => void) {
    this.logListener = callback;
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

  async startListening() {
    if (!this.reader) return;
    
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value && this.logListener) {
          // 데이터를 텍스트로 변환하여 리스너에 전달
          this.logListener(decoder.decode(value));
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

  async uploadAsMainPy(code: string, onProgress: (p: number) => void) {
    if (!this.writer) return;

    // 1. 준비 작업: 중단 및 대기
    await this.write('\x03'); // Ctrl+C
    await new Promise(r => setTimeout(r, 300));

    // 2. Raw REPL 모드 진입 (Ctrl+A)
    // 이 모드에서는 코드가 화면에 에코되지 않아 훨씬 안정적입니다.
    await this.write('\x01'); 
    await new Promise(r => setTimeout(r, 100));

    // 3. 코드를 Base64로 인코딩 (UTF-8 대응)
    // btoa는 기본적으로 latin1을 기대하므로 유니코드 처리를 해줍니다.
    const base64Code = btoa(encodeURIComponent(code).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));

    // 4. 피코에서 실행할 저장 스크립트 구성
    const saveScript = [
      "import ubinascii, machine", // 마이크로파이썬의 ubinascii 모듈을 사용하여 디코딩
      `b64 = '${base64Code}'`,
      "with open('main.py', 'wb') as f:",
      "    f.write(ubinascii.a2b_base64(b64))",
      "machine.reset()"      // 저장 후 즉시 리셋하여 main.py 실행     
    ].join('\n') + '\n\x04'; // 전송되 온 코드의 실행을 위한 Ctrl+D를 마지막에 붙임
    

    // 5. 데이터 쪼개서 보내기 (Chunk 전송)
    const encoder = new TextEncoder();
    const data = encoder.encode(saveScript + '\r\n');
    const chunkSize = 64;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.writer.write(chunk);
      
      // 진행률 콜백
      const progress = Math.round(((i + chunk.length) / data.length) * 100);
      onProgress(progress);
      
      // 시리얼 버퍼 오버플로우 방지를 위한 아주 짧은 지연
      await new Promise(r => setTimeout(r, 30)); 
    }
    // (옵션) 위에 machine.reset()이 있어, 구지 일반 REPL 모드로 복귀는 반드시 필요지 않으나, 
    // machine.reset() 지연에 대비한 일종의 보험용
    await this.write('\x02'); // Ctrl+B
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
}

export const serial = new PicoSerial();
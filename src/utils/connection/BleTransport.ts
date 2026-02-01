import type { Transport } from '../../types/transport';
import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
const TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify

export class BleTransport implements Transport {
    // Web
    private device: any = null;
    private server: any = null;
    private rxChar: any = null;
    private txChar: any = null;

    // Native
    private nativeDeviceId: string | null = null;
    private lastOptions: any = null; // 재연결을 위해 저장

    private dataCallback: ((data: string) => void) | null = null;
    private disconnectCallback: (() => void) | null = null;

    isConnected: boolean = false;
    private isNative = Capacitor.isNativePlatform();
    private isIntentionallyDisconnected = false; // 수동 종료인지 확인

    async connect(options?: any): Promise<boolean> {
        this.lastOptions = options;
        this.isIntentionallyDisconnected = false;

        try {
            if (this.isNative) {
                // --- Native (Android/iOS) ---
                if (!options?.deviceId) {
                    console.error("Device ID required for Native BLE connection");
                    return false;
                }

                await BleClient.initialize();
                this.nativeDeviceId = options.deviceId;

                // Native 세션 청소: 이미 연결되어 있다면 안전하게 끊고 시작
                try {
                    // 특정 기기와의 연결 상태 확인 없이 그냥 disconnect를 시도해도 안전합니다 (에러 시 catch로 넘어감)
                    await BleClient.disconnect(this.nativeDeviceId!);
                    console.log("Cleaned up previous native connection session");
                } catch (e) {
                    // 이미 끊겨있었다면 무시
                }

                // Native 연결 및 단절 리스너 등록
                await BleClient.connect(this.nativeDeviceId!, (id) => this.handleDisconnect());

                await BleClient.startNotifications(
                    this.nativeDeviceId!,
                    NUS_SERVICE_UUID,
                    TX_CHARACTERISTIC_UUID,
                    (value) => this.handleNativeData(value)
                );

                this.isConnected = true;
                return true;

            } else {
                // --- Web ---
                const nav = navigator as any;
                if (!nav.bluetooth) {
                    console.error("WebBluetooth not supported");
                    return false;
                }

                // [기존] Web 세션 청소: 기존에 물려있던 장치가 있다면 강제 연결 해제 시도
                if (this.device?.gatt?.connected) {
                    await this.device.gatt.disconnect();
                }

                // 이미 장치가 있고 gatt가 있다면 재사용 시도
                if (!this.device) {
                    this.device = await nav.bluetooth.requestDevice({
                        filters: [{ namePrefix: 'pico-' }, { services: [NUS_SERVICE_UUID] }],
                        optionalServices: [NUS_SERVICE_UUID]
                    });
                }

                if (!this.device) return false;

                this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

                this.server = await this.device.gatt?.connect() || null;
                if (!this.server) return false;

                const service = await this.server.getPrimaryService(NUS_SERVICE_UUID);
                this.rxChar = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
                this.txChar = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);

                await this.txChar.startNotifications();
                this.txChar.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

                this.isConnected = true;
                return true;
            }
        } catch (error) {
            console.error('BLE Connection Failed', error);
            this.handleDisconnect();

            // Critical: If connection failed (esp. matching device not found or stale), 
            // clear the cached device so the user can re-scan on next attempt.
            // Failing to do this traps the user in a "cannot connect" loop.
            this.device = null;

            return false;
        }
    }

    async disconnect(): Promise<void> {
        this.isIntentionallyDisconnected = true; // 명시적 종료
        try {
            if (this.isNative && this.nativeDeviceId) {
                await BleClient.disconnect(this.nativeDeviceId);
            } else if (this.device && this.device.gatt?.connected) {
                await this.device.gatt.disconnect();
            }
        } catch (e) {
            console.warn("Disconnect Error", e);
        } finally {
            this.handleCleanup();
        }
    }

    private handleDisconnect() {
        if (this.isIntentionallyDisconnected) {
            this.handleCleanup();
            return;
        }

        console.warn("Unexpected BLE disconnection. Attempting reconnect...");
        this.isConnected = false;

        // 2초 후 자동 재연결 시도
        setTimeout(() => {
            if (!this.isConnected && !this.isIntentionallyDisconnected) {
                this.connect(this.lastOptions);
            }
        }, 2000);

        if (this.disconnectCallback) this.disconnectCallback();
    }

    private handleCleanup() {
        this.isConnected = false;
        // Do not clear this.device here, so we can reconnect without re-scanning
        // But if connection fails repeatedly, we might need to.
        this.server = null;
        this.rxChar = null;
        this.txChar = null;
        this.nativeDeviceId = null;

        // Only trigger callback if this was an unexpected disconnection
        if (!this.isIntentionallyDisconnected && this.disconnectCallback) {
            this.disconnectCallback();
        }
    }

    private handleCharacteristicValueChanged(event: Event) {
        const value = (event.target as any).value;
        if (value) this.processData(value);
    }

    private handleNativeData(value: DataView) {
        this.processData(value);
    }

    private processData(value: DataView) {
        console.log("Raw Response from Pico:", value);
        const decoder = new TextDecoder();
        const text = decoder.decode(value);
        if (this.dataCallback) this.dataCallback(text);
    }

    async write(data: string | Uint8Array): Promise<void> {
        if (!this.isConnected) return;

        try {
            const encoder = new TextEncoder();
            const bytes = typeof data === 'string' ? encoder.encode(data) : data;

            // 최적화된 청크 사이즈 (Pico W 버퍼 512에 맞춰 조절 가능)
            // 기본은 안전하게 100바이트씩 쪼개기
            const chunkSize = 100;

            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.slice(i, i + chunkSize);

                if (this.isNative) {
                    // Native: Plugin이 알아서 처리하지만 안전을 위해 쪼갬
                    await BleClient.writeWithoutResponse(
                        this.nativeDeviceId!,
                        NUS_SERVICE_UUID,
                        RX_CHARACTERISTIC_UUID,
                        new DataView(chunk.buffer)
                    );
                } else {
                    if (this.rxChar) {
                        // Web: 응답 없는 쓰기(WithoutResponse)가 훨씬 빠름
                        try {
                            await this.rxChar.writeValueWithoutResponse(chunk);
                        } catch {
                            // 지원하지 않는 기기/브라우저라면 표준 쓰기로 폴백
                            await this.rxChar.writeValue(chunk);
                        }
                    }
                }

                // 피코 측 UART 인터럽트 처리를 위한 짧은 휴식 (병목 방지)
                if (bytes.length > chunkSize) {
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        } catch (err) {
            console.error('BLE Write Failed', err);
        }
    }

    onData(callback: (data: string) => void): void {
        this.dataCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }

    // Fallback methods to satisfy interface if strict
    async read(): Promise<string> { return ""; }
    async runInREPL(code: string): Promise<void> { }
    async uploadFile(f: string, c: string, p?: any, r?: boolean) { }
    async deleteFile(f: string) { }
    async getFileList(): Promise<string[]> { return []; }
    setLogListener(cb: any) { this.onData(cb); }
    setDisconnectListener(cb: any) { this.onDisconnect(cb); }
    startListening() { }
    stopListening() { }
}

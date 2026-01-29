import type { Transport } from '../../types/transport';
import i18n from '@/i18n';
import { alertCustom } from '@/services/modal-confirm';

export class SerialTransport implements Transport {
    private port: SerialPort | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private reader: ReadableStreamDefaultReader | null = null;
    private dataCallback: ((data: string) => void) | null = null;
    private disconnectCallback: (() => void) | null = null;
    public isConnected = false;

    constructor() {
        if (typeof navigator !== 'undefined' && 'serial' in navigator) {
            navigator.serial.addEventListener('disconnect', (event) => {
                if (this.port === (event as any).port || this.port === event.target) {
                    console.log('[Serial] Device disconnected unexpectedly.');
                    this.handleUnexpectedDisconnect();
                }
            });
        }
    }

    private handleUnexpectedDisconnect() {
        this.isConnected = false;
        this.reader = null; // Streams are likely dead
        this.writer = null;
        this.port = null;
        if (this.disconnectCallback) {
            this.disconnectCallback();
        }
    }

    async connect(): Promise<boolean> {
        const { t } = i18n.global;
        if (!('serial' in navigator)) {
            await alertCustom(t('common.error'), t('editor.serialNotSupported'), '❌');
            return false;
        }

        try {
            this.port = await navigator.serial.requestPort();
            if (!this.port) return false;

            await this.port.open({ baudRate: 115200 });

            if (this.port.readable) {
                this.reader = this.port.readable.getReader();
                this.startReading();
            }
            if (this.port.writable) {
                this.writer = this.port.writable.getWriter();
            }

            this.isConnected = true;
            return true;

        } catch (error: any) {
            this.isConnected = false;
            if (error.name === 'NotFoundError') {
                throw new Error(t('terminal.noDeviceFound'));
            } else if (error.name === 'SecurityError') {
                throw new Error(t('terminal.securityError'));
            } else if (error.message.includes('Failed to open serial port')) {
                throw new Error(t('terminal.portAlreadyOpen'));
            } else {
                throw error;
            }
        }
    }

    private async startReading() {
        if (!this.reader) return;
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    const text = decoder.decode(value);
                    if (this.dataCallback) this.dataCallback(text);
                }
            }
        } catch (error) {
            console.error('[Serial] Read error:', error);
        } finally {
            if (this.reader) {
                try { this.reader.releaseLock(); } catch (e) { }
                this.reader = null;
            }
            this.isConnected = false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.reader) {
            await this.reader.cancel();
            try { this.reader.releaseLock(); } catch (e) { }
            this.reader = null;
        }
        if (this.writer) {
            try { this.writer.releaseLock(); } catch (e) { }
            this.writer = null;
        }
        if (this.port) {
            await this.port.close();
            this.port = null;
        }
        this.isConnected = false;
    }

    async write(data: string | Uint8Array): Promise<void> {
        if (!this.writer) throw new Error('Writer is Null');

        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            await this.writer.write(encoder.encode(data));
        } else {
            await this.writer.write(data);
        }
    }

    onData(callback: (data: string) => void): void {
        this.dataCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }
}

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
        let buffer = new Uint8Array(0);
        let inJpeg = false;
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    // Append value to buffer
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;

                    // Parse buffer for JPEG (SOI: FF D8, EOI: FF D9)
                    let i = 0;
                    while (i < buffer.length - 1) {
                        if (!inJpeg) {
                            if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) {
                                // Decode the preceding text
                                if (i > 0) {
                                    const textBytes = buffer.slice(0, i);
                                    if (this.dataCallback) this.dataCallback(decoder.decode(textBytes));
                                }
                                buffer = buffer.slice(i); // keep FFD8 at start
                                inJpeg = true;
                                i = 0;
                            } else {
                                i++;
                            }
                        } else {
                            if (buffer[i] === 0xFF && buffer[i+1] === 0xD9) {
                                const jpegBytes = buffer.slice(0, i + 2);
                                this.emitFrame(jpegBytes);

                                buffer = buffer.slice(i + 2);
                                inJpeg = false;
                                i = 0;
                            } else {
                                i++;
                            }
                        }
                    }

                    // If not in JPEG, decode remaining text, keeping the last byte if it's 0xFF (potential start of FFD8)
                    if (!inJpeg && buffer.length > 0) {
                        if (buffer[buffer.length - 1] === 0xFF) {
                            if (buffer.length > 1) {
                                const textBytes = buffer.slice(0, buffer.length - 1);
                                if (this.dataCallback) this.dataCallback(decoder.decode(textBytes));
                                buffer = buffer.slice(buffer.length - 1);
                            }
                        } else {
                            if (this.dataCallback) this.dataCallback(decoder.decode(buffer));
                            buffer = new Uint8Array(0);
                        }
                    }
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

    private emitFrame(jpegBytes: Uint8Array) {
        let binary = '';
        for (let i = 0; i < jpegBytes.length; i++) {
            binary += String.fromCharCode(jpegBytes[i]);
        }
        const base64Str = window.btoa(binary);
        const event = new CustomEvent('serial-video-frame', { detail: base64Str });
        window.dispatchEvent(event);
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

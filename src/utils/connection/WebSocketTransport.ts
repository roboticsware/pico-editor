import type { Transport } from '../../types/transport';

export class WebSocketTransport implements Transport {
    private ws: WebSocket | null = null;
    private dataCallback: ((data: string) => void) | null = null;
    private disconnectCallback: (() => void) | null = null;
    public isConnected = false;

    async connect(options: { host: string; port: number; password?: string }): Promise<boolean> {
        if (!options) throw new Error('Missing connection options');
        const url = `ws://${options.host}:${options.port}/`;
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        return new Promise((resolve, reject) => {
            if (!this.ws) return reject('WebSocket not initialized');

            const timeout = setTimeout(() => {
                if (!this.isConnected) {
                    this.ws?.close();
                    reject(new Error('Connection timeout'));
                }
            }, 5000);

            this.ws.onopen = () => {
                console.log('[WS] Connected, waiting for handshake...');
            };

            let handshakeBuffer = '';
            let passwordSent = false;
            let buffer = new Uint8Array(0);
            let inJpeg = false;

            this.ws.onmessage = (event) => {
                const data = event.data;
                
                if (typeof data === 'string') {
                    const text = data;
                    if (!this.isConnected) {
                        handshakeBuffer += text;
                        // Handle handshake ...
                    }
                    if (this.dataCallback) this.dataCallback(text);
                    return;
                }

                // If data is binary, we parse it for JPEG just like SerialTransport
                if (data instanceof ArrayBuffer) {
                    const value = new Uint8Array(data);
                    const newBuffer = new Uint8Array(buffer.length + value.length);
                    newBuffer.set(buffer);
                    newBuffer.set(value, buffer.length);
                    buffer = newBuffer;

                    let i = 0;
                    const decoder = new TextDecoder();
                    while (i < buffer.length - 1) {
                        if (!inJpeg) {
                            if (buffer[i] === 0xFF && buffer[i+1] === 0xD8) {
                                if (i > 0) {
                                    const textBytes = buffer.slice(0, i);
                                    if (this.dataCallback) this.dataCallback(decoder.decode(textBytes));
                                }
                                buffer = buffer.slice(i);
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

                    if (!inJpeg && buffer.length > 0) {
                        if (buffer[buffer.length - 1] === 0xFF) {
                            if (buffer.length > 1) {
                                const textBytes = buffer.slice(0, buffer.length - 1);
                                const text = decoder.decode(textBytes);
                                if (!this.isConnected) handshakeBuffer += text;
                                if (this.dataCallback) this.dataCallback(text);
                                buffer = buffer.slice(buffer.length - 1);
                            }
                        } else {
                            const text = decoder.decode(buffer);
                            if (!this.isConnected) handshakeBuffer += text;
                            if (this.dataCallback) this.dataCallback(text);
                            buffer = new Uint8Array(0);
                        }
                    }
                }

                if (!this.isConnected) {
                    if (handshakeBuffer.includes('Password:')) {
                        console.log('[WS] Password prompt received, sending password...');
                        passwordSent = true; 
                        setTimeout(() => {
                            this.ws?.send((options.password || '1234') + '\r');
                        }, 100);
                    }

                    if (handshakeBuffer.includes('WebREPL connected')) {
                        console.log('[WS] Handshake complete.');
                        this.isConnected = true;
                        clearTimeout(timeout);
                        resolve(true);
                    }
                }
            };

            this.ws.onerror = (err) => {
                console.error('[WS] Error:', err);

                // If the error happens during handshake, we should reject.
                // But check if we already resolved? (Promise state is one-way, but logic should be clean)
                if (!this.isConnected) {
                    clearTimeout(timeout);
                    reject(err);
                }
            };

            this.ws.onclose = () => {
                console.log('[WS] Closed');
                this.isConnected = false;
                if (this.disconnectCallback) this.disconnectCallback();
            };
        });
    }

    async disconnect(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    private emitFrame(jpegBytes: Uint8Array) {
        let binary = '';
        for (let i = 0; i < jpegBytes.length; i++) {
            binary += String.fromCharCode(jpegBytes[i]!);
        }
        const base64Str = window.btoa(binary);
        const event = new CustomEvent('serial-video-frame', { detail: base64Str });
        window.dispatchEvent(event);
    }

    async write(data: string | Uint8Array): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(data);
    }

    onData(callback: (data: string) => void): void {
        this.dataCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }
}

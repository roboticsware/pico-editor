import type { Transport } from '../../types/transport';

export class WebSocketTransport implements Transport {
    private ws: WebSocket | null = null;
    private dataCallback: ((data: string) => void) | null = null;
    private disconnectCallback: (() => void) | null = null;
    public isConnected = false;

    async connect(options: { host: string; port: number; password?: string }): Promise<boolean> {
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

            this.ws.onmessage = (event) => {
                const data = event.data;
                let text = '';
                if (typeof data === 'string') {
                    text = data;
                } else if (data instanceof ArrayBuffer) {
                    text = new TextDecoder().decode(data);
                }

                if (!this.isConnected) {
                    handshakeBuffer += text;
                    if (!passwordSent && handshakeBuffer.includes('Password:')) {
                        console.log('[WS] Password prompt received, sending password...');
                        passwordSent = true; // Mark sent immediately to prevent double send
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

                if (this.dataCallback) this.dataCallback(text);
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

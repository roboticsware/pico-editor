import type { Transport } from '../../types/transport';
import { SerialTransport } from './SerialTransport';
import { WebSocketTransport } from './WebSocketTransport';

export type ConnectionType = 'serial' | 'wifi';

export class ConnectionManager {
    private transport: Transport;
    private serialTransport: SerialTransport;
    private wsTransport: WebSocketTransport;
    private activeType: ConnectionType = 'serial';

    private incomingBuffer: string = "";
    private logListener: ((data: string) => void) | null = null;

    constructor() {
        this.serialTransport = new SerialTransport();
        this.wsTransport = new WebSocketTransport();
        this.transport = this.serialTransport; // Default

        // Bind listeners
        this.setupTransportListeners(this.serialTransport);
        this.setupTransportListeners(this.wsTransport);
    }

    private setupTransportListeners(transport: Transport) {
        transport.onData((data) => {
            // Create a virtual "active" check
            if (transport !== this.transport) return;

            this.incomingBuffer += data;
            if (this.logListener) {
                this.logListener(data);
            }
        });

        // disconnect handler...
        // We might bubble this up
    }

    setLogListener(callback: (data: string) => void) {
        this.logListener = callback;
    }

    setDisconnectListener(callback: () => void) {
        this.serialTransport.onDisconnect(callback);
        this.wsTransport.onDisconnect(callback);
    }

    get isConnected() {
        return this.transport.isConnected;
    }

    // API to switch modes
    useTransport(type: ConnectionType) {
        this.activeType = type;
        if (type === 'serial') {
            this.transport = this.serialTransport;
        } else {
            this.transport = this.wsTransport;
        }
    }

    async startListening() {
        // No-op for now, or could trigger transport specific listeners
        // if (this.transport.startListening) this.transport.startListening();
    }

    async connect(options?: any): Promise<boolean> {
        // If switching type dynamically via options
        if (options && options.type) {
            this.useTransport(options.type);
        }
        return this.transport.connect(options);
    }

    async disconnect() {
        await this.transport.disconnect();
    }

    async write(text: string) {
        await this.transport.write(text);
    }

    // --- REPL Protocol Methods (Moved from PicoSerial) ---

    private async readResponse(): Promise<string> {
        this.incomingBuffer = "";
        const startTime = Date.now();
        while (Date.now() - startTime < 2000) {
            if (this.incomingBuffer.includes(">>> ")) {
                break;
            }
            await new Promise(r => setTimeout(r, 50));
        }
        return this.incomingBuffer;
    }

    async runInREPL(code: string) {
        // Ctrl+C
        await this.write('\x03');
        await new Promise(r => setTimeout(r, 500));
        // Ctrl+A (Raw REPL)
        await this.write('\x01');
        await new Promise(r => setTimeout(r, 100));
        // Code
        await this.write(code);
        // Ctrl+D (Soft Reset / Exec)
        await this.write('\x04');
    }

    async executeCommand(command: string): Promise<string> {
        if (!this.isConnected) throw new Error("executeCommand: Not connected");

        try {
            await this.write("\x03\x03");
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.write("\x01");
            await new Promise(resolve => setTimeout(resolve, 50));
            await this.write(command + "\x04");

            let response = await this.readResponse();

            if (response.startsWith("OK")) {
                response = response.substring(2);
            }
            response = (response.split("\x04")[0] || "").trim();

            await this.write("\x02"); // Ctrl+B (Normal REPL)

            return response;
        } catch (err) {
            console.error("Command execution failed:", err);
            throw err;
        }
    }

    async uploadFile(filename: string, code: string, onProgress?: (p: number) => void, shouldReset: boolean = false) {
        try {
            // Enter Raw REPL
            await this.write('\x03\x03\x01');
            await new Promise(r => setTimeout(r, 200));

            // Open file
            await this.write(`f = open('${filename}', 'wb')\nimport ubinascii, os, machine\n\x04`);
            await this.readResponse();

            // Write chunks
            const encoder = new TextEncoder();
            const rawData = encoder.encode(code);
            const chunkSize = 512;

            for (let i = 0; i < rawData.length; i += chunkSize) {
                const chunk = rawData.slice(i, i + chunkSize);
                // We use btoa for binary safety in transfer
                const b64Chunk = btoa(String.fromCharCode(...chunk));

                await this.write(`f.write(ubinascii.a2b_base64('${b64Chunk}'))\n\x04`);
                await this.readResponse();

                if (onProgress) {
                    onProgress(Math.round(((i + chunk.length) / rawData.length) * 100));
                }
            }

            // Sync and Close
            await this.write(`f.flush()\nos.sync()\nf.close()\n\x04`);
            await this.readResponse();

            if (shouldReset) {
                console.log("Reset command...");
                await this.write(`machine.reset()\n\x04`);
            } else {
                await this.write('\x02');
            }

            console.log(`[${filename}] Upload complete!`);
        } catch (err) {
            console.error("Upload failed:", err);
            throw err;
        }
    }

    async getFileList(): Promise<string[]> {
        const command = "import os; print(os.listdir())\r\n";
        const result = await this.executeCommand(command);
        return this.parsePythonList(result);
    }

    async deleteFile(filename: string) {
        await this.executeCommand(`import os; os.remove('${filename}')`);
    }

    async readFile(filename: string): Promise<string | null> {
        const command = `
try:
    with open('${filename}', 'r') as f:
        print(f.read())
except OSError:
    print("##ENOENT##")
`;
        const result = await this.executeCommand(command);
        if (result.includes("##ENOENT##")) {
            return null;
        }
        return result.trim();
    }

    async parsePythonList(str: string): Promise<string[]> {
        const match = str.match(/\[(.*?)\]/);
        if (!match || !match[1]) return [];
        return match[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(s => s);
    };

    stopListening() {
        // No-op
    }
}

// Export singleton
export const connectionManager = new ConnectionManager();

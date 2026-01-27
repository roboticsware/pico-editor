
import type { Transport } from '../../types/transport';
import { alertCustom } from '@/services/modal-confirm';

declare const Serial: any; // Cordova plugin global interface

export class AndroidSerialTransport implements Transport {
    public isConnected = false;
    private dataCallback: ((data: string) => void) | null = null;
    private disconnectCallback: (() => void) | null = null;
    private buffer: Uint8Array = new Uint8Array(0);

    constructor() {
        // Register for error/disconnect events if possible through the plugin's API
        // Typically the plugin handles this via callbacks in open() or dedicated listeners.
        // For cordovarduino, we rely on the error callback in open/register.
    }

    async connect(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (typeof Serial === 'undefined') {
                console.error('Cordova Serial plugin not loaded.');
                alertCustom('Error', 'Serial plugin not loaded', '❌');
                resolve(false);
                return;
            }

            Serial.requestPermission(
                (success: any) => {
                    // Permission granted
                    Serial.open(
                        {
                            baudRate: 115200,
                            dataBits: 8,
                            stopBits: 1,
                            parity: 0,
                            dtr: true,
                            rts: true,
                            sleepOnPause: false
                        },
                        (successOpen: any) => {
                            this.isConnected = true;
                            console.log('Serial connection opened:', successOpen);
                            
                            // Start reading loop or register read callback.
                            // The cordovarduino plugin usually requires a helper to read data 
                            // or it sends it via a registered read callback.
                            // Checking documentation: Serial.registerReadCallback
                            
                            Serial.registerReadCallback(
                                (data: any) => {
                                    // data is ArrayBuffer or similar
                                    if (this.dataCallback) {
                                        // Convert to string
                                        const view = new Uint8Array(data);
                                        const decoder = new TextDecoder();
                                        const text = decoder.decode(view);
                                        this.dataCallback(text);
                                    }
                                },
                                (err: any) => {
                                    console.error('Read callback error:', err);
                                    this.disconnect();
                                }
                            );

                            resolve(true);
                        },
                        (err: any) => {
                            console.error('Failed to open serial:', err);
                            alertCustom('Connection Failed', 'Could not open serial port: ' + err, '❌');
                            resolve(false);
                        }
                    );
                },
                (err: any) => {
                    console.log('Permission rejected:', err);
                    if (err === 'No device found') {
                         alertCustom('No Device', 'No serial device connected.', '⚠️');
                    } else {
                         alertCustom('Permission Denied', 'USB permission is required.', '🔒');
                    }
                    resolve(false);
                }
            );
        });
    }

    async disconnect(): Promise<void> {
        return new Promise((resolve) => {
            if (typeof Serial !== 'undefined' && this.isConnected) {
                Serial.close(
                    () => {
                        this.isConnected = false;
                        if (this.disconnectCallback) this.disconnectCallback();
                        resolve();
                    },
                    (err: any) => {
                        console.error('Error closing serial:', err);
                        this.isConnected = false;
                        resolve();
                    }
                );
            } else {
                this.isConnected = false;
                resolve();
            }
        });
    }

    async write(data: string | Uint8Array): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || typeof Serial === 'undefined') {
                reject(new Error('Not connected'));
                return;
            }

            // Plugin typically expects string or hex or native byte array.
            // Using write(data, success, error)
            // If data is Uint8Array, we might need to convert it or pass it directly if supported.
            // The plugin often handles strings well, or hex strings.
            // Let's assume it handles string. For binary, we might need hex.
            // Documentation says: write takes string. For binary, writeHex is often used or basic write with utf8.
            
            // For safety with Pico (MicroPython often talks UTF8), let's send string.
            // If we receive Uint8Array, decode it to string.
            
            let payload: string;
            if (data instanceof Uint8Array) {
                const decoder = new TextDecoder();
                payload = decoder.decode(data);
            } else {
                payload = data;
            }

            Serial.write(
                payload,
                () => resolve(),
                (err: any) => reject(err)
            );
        });
    }

    onData(callback: (data: string) => void): void {
        this.dataCallback = callback;
    }

    onDisconnect(callback: () => void): void {
        this.disconnectCallback = callback;
    }
}

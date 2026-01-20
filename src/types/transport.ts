/**
 * Transport interface for different connection methods (Serial, WiFi)
 */
export interface IPicoTransport {
    /**
     * Connect to the device
     */
    connect(config?: any): Promise<boolean>;

    /**
     * Disconnect from the device
     */
    disconnect(): Promise<void>;

    /**
     * Check if connected
     */
    isConnected(): boolean;

    /**
     * Write raw data to the device
     */
    write(data: string | Uint8Array): Promise<void>;

    /**
     * Read data from the device (for compatibility)
     */
    read(): Promise<string>;

    /**
     * Execute Python code in REPL
     */
    runInREPL(code: string): Promise<void>;

    /**
     * Upload a file to the device
     */
    uploadFile(
        filename: string,
        content: string,
        onProgress?: (progress: number) => void,
        reboot?: boolean
    ): Promise<void>;

    /**
     * Delete a file from the device
     */
    deleteFile(filename: string): Promise<void>;

    /**
     * Get list of files on the device
     */
    getFileList(): Promise<string[]>;

    /**
     * Set log listener for receiving output
     */
    setLogListener(callback: (data: string) => void): void;

    /**
     * Set disconnect listener
     */
    setDisconnectListener(callback: () => void): void;

    /**
     * Start listening for data
     */
    startListening(): void;

    /**
     * Stop listening for data
     */
    stopListening(): void;
}

export enum ConnectionType {
    SERIAL = 'serial',
    WIFI = 'wifi',
}

export interface ConnectionConfig {
    type: ConnectionType;
    // For WiFi
    host?: string;
    port?: number;
    password?: string;
}

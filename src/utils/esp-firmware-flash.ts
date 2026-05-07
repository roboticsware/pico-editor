import { ESPLoader, Transport } from 'esptool-js';
import type { FlashProgress } from './firmware-flash';

export async function flashEspFirmware(
  firmwareName: string,
  onProgress: (p: FlashProgress) => void
): Promise<void> {
  let device: SerialPort | null = null;
  let transport: Transport | null = null;
  let esploader: ESPLoader | null = null;

  try {
    // 1. Download Firmware (10%)
    onProgress({ progress: 0.05, status: 'common.progress' });
    const res = await fetch(`/assets/firmwares/${firmwareName}`);
    if (!res.ok) throw new Error(`Download failed: ${firmwareName}`);
    const firmwareBuffer = await res.arrayBuffer();
    onProgress({ progress: 0.1, status: 'common.progress' });

    // 2. Request Port
    onProgress({ progress: 0.15, status: 'setup.select_drive' }); // Reusing text for "Select Device"
    device = await navigator.serial.requestPort();
    if (!device) throw new Error('No device selected');

    // 3. Initialize Transport and Loader
    transport = new Transport(device);
    
    // Terminal object for esptool-js logs (optional but helpful for debug)
    const terminal = {
      clean: () => {},
      writeLine: (data: string) => console.log('[EspTool]', data),
      write: (data: string) => console.log('[EspTool]', data),
    };

    esploader = new ESPLoader({
        transport,
        baudrate: 115200,
        terminal: terminal as any
    });

    // 4. Connect and Sync (20%)
    onProgress({ progress: 0.2, status: 'setup.flashing' });
    const chip = await esploader.main();
    console.log('[EspTool] Connected to chip:', chip);

    // 5. Erase and Flash (merged binary at 0x0)
    onProgress({ progress: 0.3, status: 'setup.flashing' });

    await esploader.writeFlash({
      fileArray: [{ data: new Uint8Array(firmwareBuffer), address: 0x0 }],
      flashSize: 'keep',
      flashMode: 'keep',
      flashFreq: 'keep',
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex: number, written: number, total: number) => {
        const filePct = written / total;
        // Map 0.3 -> 0.9 range
        const globalPct = 0.3 + (filePct * 0.6);
        onProgress({ progress: globalPct, status: 'setup.flashing' });
      }
    });

    // 6. Complete and Reset
    onProgress({ progress: 0.95, status: 'setup.rebooting' });
    await esploader.after('hard_reset');
    
    // Cleanup
    await transport.disconnect();
    await device.close();

    onProgress({ progress: 1.0, status: 'setup.f_complete' });

  } catch (err: any) {
    console.error('[EspTool] Error during flashing:', err);
    
    // Cleanup on error
    if (transport) {
        try { await transport.disconnect(); } catch (e) {}
    }
    if (device) {
        try { await device.close(); } catch (e) {}
    }

    if (err.name === 'NotFoundError' || err.name === 'AbortError') {
      throw new Error('setup.drive_error'); // User cancelled
    }
    throw err;
  }
}

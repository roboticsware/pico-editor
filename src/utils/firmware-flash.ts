export interface FlashProgress {
  progress: number;
  status: string;
}

interface ModelInfo {
  id: string;
  isWireless: boolean; // pico_w or pico2_w
}

export async function flashFirmware(
  firmwareName: string,
  onProgress: (p: FlashProgress) => void
): Promise<void> {
  const picoOps = (window as any).PicoOps;

  // Step 1: Download Firmware (10%)
  onProgress({ progress: 0.1, status: 'setup.progress' });

  try {
    const response = await fetch(`/assets/firmwares/${firmwareName}`);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    onProgress({ progress: 0.2, status: 'setup.progress' });

    // Step 2: Flash UF2 Firmware (20% - 50%)
    if (picoOps) { // --- Electron(Direct Copy via IPC) ---
      onProgress({ progress: 0.3, status: 'setup.flashing' });

      const result = await picoOps.flashFirmware(arrayBuffer, firmwareName);

      if (!result.success) {
        if (result.error && result.error.includes('drive not found')) {
          throw new Error('setup.drive_error');
        }
        throw new Error(result.error);
      }

      onProgress({ progress: 0.5, status: 'setup.flashing' });

      // Step 3: Wait for Pico to reboot and enumerate (50% - 60%)
      onProgress({ progress: 0.55, status: 'setup.rebooting' });
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for device

      // Stop at 60% - return control to modal for intermediate confirm screen
      onProgress({ progress: 0.6, status: 'setup.f_complete' });

    } else { // --- Web (FileSystem Access API) ---
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported');
      }

      onProgress({ progress: 0.3, status: 'setup.select_drive' });

      const dirHandle = await (window as any).showDirectoryPicker({
        id: 'pico-firmware-install',
        mode: 'readwrite',
        startIn: 'desktop'
      });

      if (!dirHandle) throw new Error('setup.drive_error');

      onProgress({ progress: 0.4, status: 'setup.flashing' });

      // Flash UF2
      const fileHandle = await dirHandle.getFileHandle(firmwareName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();

      onProgress({ progress: 0.5, status: 'setup.flashing' });

      // Step 3: Wait for reboot (50% - 60%)
      onProgress({ progress: 0.55, status: 'setup.rebooting' });
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stop at 60% - return control to modal for port selection guidance
      onProgress({ progress: 0.6, status: 'setup.fcomplete' });
    }
  } catch (err: any) {
    // Check for AbortError (cancelled) or NotFoundError (drive disconnected/not found)
    if (err.name === 'AbortError' || err.name === 'NotFoundError') {
      throw new Error('setup.drive_error');
    }
    throw err;
  }
}

// Helper: Inject libraries via Serial - exported for manual invocation
// isElectron: true for Electron (auto-connect by select-serial-port event in setup.ts), 
// false for Web (Need manual connect)
export async function injectLibraries(
  modelInfo: ModelInfo,
  onProgress: (p: FlashProgress) => void,
  isElectron: boolean = false
) {
  try {
    // Import serial utilities
    const { serial } = await import('@/utils/serial');

    onProgress({ progress: 0.65, status: 'setup.library_installing' });

    if (isElectron) {
      const connected = await serial.connect();
      if (!connected) {
        console.warn('Could not reconnect to inject libraries. They will be installed on first run.');
        return;
      }
    }

    onProgress({ progress: 0.7, status: 'setup.library_installing' });

    // Create /lib directory
    await serial.executeCommand('import os');
    await serial.executeCommand(`
try:
    os.mkdir('/lib')
except:
    pass
`);

    onProgress({ progress: 0.75, status: 'setup.library_installing' });

    // Fetch and upload picozero
    const picozeroRes = await fetch('/assets/libs/picozero.py');
    const picozeroCode = await picozeroRes.text();

    await serial.uploadFile('/lib/picozero.py', picozeroCode, (p) => {
      onProgress({ progress: 0.75 + (p / 100) * 0.1, status: 'setup.library_installing' });
    }, false);

    onProgress({ progress: 0.85, status: 'setup.library_installing' });

    // If wireless model, inject boot.py and webrepl_cfg.py additionally
    if (modelInfo.isWireless) {
      const bootRes = await fetch('/assets/libs/boot.py');
      const bootCode = await bootRes.text();

      await serial.uploadFile('boot.py', bootCode, undefined, false);

      const webreplRes = await fetch('/assets/libs/webrepl_cfg.py');
      const webreplCode = await webreplRes.text();

      await serial.uploadFile('webrepl_cfg.py', webreplCode, undefined, true); // Need reboot
    }

    onProgress({ progress: 0.9, status: 'setup.library_installing' });

    // Disconnect
    await serial.disconnect();

  } catch (err) {
    console.error('Library injection failed (non-critical):', err);
    // Non-critical: libraries will be installed on first run
  }
}
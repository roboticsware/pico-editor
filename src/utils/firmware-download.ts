export interface FlashProgress {
  progress: number;
  status: string;
}

export async function flashFirmware(
  firmwareName: string,
  onProgress: (p: FlashProgress) => void
): Promise<void> {
  const picoOps = (window as any).PicoOps;

  // Download Firmware (Common)
  // Note: Localization keys usually handled by caller, but we send status keys/text
  onProgress({ progress: 0.1, status: 'setup.downloading' });

  try {
    const response = await fetch(`/assets/firmwares/${firmwareName}`);
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

    // We get the blob/buffer first
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    onProgress({ progress: 0.3, status: 'setup.downloading' });

    if (picoOps) { // --- Electron (Direct Copy via IPC) ---
      onProgress({ progress: 0.4, status: 'setup.flashing' });

      const result = await picoOps.flashFirmware(arrayBuffer, firmwareName);

      if (!result.success) {
        if (result.error && result.error.includes('drive not found')) {
          throw new Error('setup.drive_error'); // Key for UI
        }
        throw new Error(result.error);
      }

    } else { // --- Web (FileSystem Access API) ---
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported');
      }

      // We can't auto-detect drive in Web, asking user to pick it
      onProgress({ progress: 0.4, status: 'setup.select_drive' });

      const dirHandle = await (window as any).showDirectoryPicker({
        id: 'pico-firmware-install',
        mode: 'readwrite',
        startIn: 'desktop'
      });

      if (!dirHandle) throw new Error('setup.drive_error');

      onProgress({ progress: 0.6, status: 'setup.flashing' });

      const fileHandle = await dirHandle.getFileHandle(firmwareName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();
    }

    onProgress({ progress: 1.0, status: 'setup.complete' });

  } catch (err: any) {
    // If user cancelled picker
    if (err.name === 'AbortError') throw new Error('setup.drive_error');
    throw err;
  }
}
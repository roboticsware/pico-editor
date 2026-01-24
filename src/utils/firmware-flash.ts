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
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait for device

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
): Promise<string | undefined> {
  let uniqueIdSuffix: string | undefined;

  try {
    // Import serial utilities
    const { serial } = await import('@/utils/serial');

    onProgress({ progress: 0.65, status: 'setup.library_installing' });

    if (isElectron) {
      // Retry connection loop
      let connected = false;
      let attempts = 0;
      while (!connected && attempts < 5) {
        try {
          connected = await serial.connect();
        } catch (ignore) {
          console.log("Connection attempt failed, retrying...");
        }
        if (!connected) {
          attempts++;
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (!connected) {
        throw new Error('Msg.serialConnectionFailed');
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

    // Prepare Manifest
    let currentManifest: Record<string, string> = {};
    try {
      const manifestStr = await serial.readFile('.lib_manifest.json');
      if (manifestStr) {
        currentManifest = JSON.parse(manifestStr);
        console.log("Loaded existing library manifest:", currentManifest);
      } else {
        console.log("No library manifest found, creating new one.");
      }
    } catch (e) {
      console.warn("Failed to read manifest (or invalid), starting fresh.", e);
      // No manifest or invalid JSON, ignore -> initialized to {}
    }

    const { AVAILABLE_LIBRARIES } = await import('@/constants/libraries');

    // Version limit Checker: Returns true if targetVersion > currentVersion
    // If missing, we treat currentVersion as "0.0.0" (undefined) and install.
    const isHigherVersion = (targetVer: string, currentVer?: string): boolean => {
      if (!currentVer) return true;
      const parse = (v: string) => v.split('.').map(n => parseInt(n) || 0);
      const t = parse(targetVer);
      const c = parse(currentVer);
      for (let i = 0; i < 3; i++) {
        if ((t[i] || 0) > (c[i] || 0)) return true;
        if ((t[i] || 0) < (c[i] || 0)) return false;
      }
      return false; // Equal = false (no update)
    };

    // 1. Install PicoZero
    const picoLib = AVAILABLE_LIBRARIES.find(l => l.id === 'picozero');
    if (picoLib) {
      const needsUpdate = isHigherVersion(picoLib.version, currentManifest['picozero']);

      if (needsUpdate) {
        console.log(`Updating PicoZero: ${currentManifest['picozero'] || 'None'} -> ${picoLib.version}`);
        const picozeroRes = await fetch('/assets/libs/picozero.py');
        const picozeroCode = await picozeroRes.text();

        await serial.uploadFile('/lib/picozero.py', picozeroCode, (p) => {
          onProgress({ progress: 0.75 + (p / 100) * 0.1, status: 'setup.library_installing' });
        }, false);

        currentManifest['picozero'] = picoLib.version;
      } else {
        console.log(`PicoZero is up to date (${picoLib.version}). Skipping.`);
        onProgress({ progress: 0.85, status: 'setup.library_installing' });
      }
    }

    onProgress({ progress: 0.85, status: 'setup.library_installing' });

    // If wireless model, inject boot.py and webrepl_cfg.py additionally
    if (modelInfo.isWireless) {
      // 1. Fetch Unique ID first
      try {
        const cmd = "import machine, binascii; print(binascii.hexlify(machine.unique_id()).decode()[-4:])";
        const result = await serial.executeCommand(cmd);
        if (result && result.length === 4) {
          uniqueIdSuffix = result;
        }
      } catch (e) {
        console.warn("Failed to fetch unique ID", e);
      }

      // Boot.py
      const bootLib = AVAILABLE_LIBRARIES.find(l => l.id === 'boot');
      if (bootLib) {
        const needsUpdate = isHigherVersion(bootLib.version, currentManifest['boot']);

        if (needsUpdate) {
          console.log(`Updating boot.py: ${currentManifest['boot'] || 'None'} -> ${bootLib.version}`);
          const bootRes = await fetch('/assets/libs/boot.py');
          const bootCode = await bootRes.text();
          await serial.uploadFile('boot.py', bootCode, undefined, false);
          currentManifest['boot'] = bootLib.version;

          // Only reboot if boot.py changed or forced
        } else {
          console.log(`boot.py is up to date (${bootLib.version}). Skipping.`);
        }
      } else {
        // Fallback if not found in AVAILABLE_LIBRARIES
      }

      // Webrepl is static config usually
      const webreplRes = await fetch('/assets/libs/webrepl_cfg.py');
      const webreplCode = await webreplRes.text();
      await serial.uploadFile('webrepl_cfg.py', webreplCode, undefined, false);
    }

    // Write Manifest (Ensure it is created/updated)
    console.log("Saving library manifest...", currentManifest);
    await serial.uploadFile('.lib_manifest.json', JSON.stringify(currentManifest), undefined, false);

    if (modelInfo.isWireless) {
      // Reboot only for wireless to apply boot.py
      console.log("Rebooting Pico...");
      try {
        await serial.executeCommand('import machine; machine.reset()');
      } catch (e) {
        // Expected behavior: Device disconnects immediately after reset
        console.log("Pico reboot command sent.");
      }
    }

    onProgress({ progress: 0.9, status: 'setup.library_installing' });

    // Disconnect
    try {
      await serial.disconnect();
    } catch (e) {
      // Ignore if already disconnected
    }

    return uniqueIdSuffix;

  } catch (err) {
    console.error('Library injection failed:', err);
    throw err; // Propagate error so Modal shows failure
  }
}
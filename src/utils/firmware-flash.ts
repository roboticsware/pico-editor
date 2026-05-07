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
  onProgress: (p: FlashProgress) => void,
  actions?: { getNextDriveHandle?: () => Promise<any> }
): Promise<void> {
  const picoOps = (window as any).PicoOps;
  const nukeName = 'flash_nuke.uf2';

  // Step 1: Download Nuke and Target Firmware (10%)
  onProgress({ progress: 0.05, status: 'common.progress' });

  let nukeBuffer: ArrayBuffer;
  let firmwareBuffer: ArrayBuffer;

  try {
    const [nukeRes, firmRes] = await Promise.all([
      fetch(`/assets/firmwares/${nukeName}`),
      fetch(`/assets/firmwares/${firmwareName}`)
    ]);

    if (!nukeRes.ok) throw new Error(`Download failed: ${nukeName}`);
    if (!firmRes.ok) throw new Error(`Download failed: ${firmwareName}`);

    nukeBuffer = await nukeRes.arrayBuffer();
    firmwareBuffer = await firmRes.arrayBuffer();

    onProgress({ progress: 0.1, status: 'common.progress' });

    // --- Electron Flow (Direct Copy via IPC) ---
    if (picoOps) {
      // 1. Flash Nuke
      onProgress({ progress: 0.15, status: 'setup.nuking' });
      let result = await picoOps.flashFirmware(nukeBuffer, nukeName);
      if (!result.success) {
        if (result.error && result.error.includes('drive not found')) {
          throw new Error('setup.drive_error');
        }
        throw new Error(result.error);
      }

      // 2. Wait for Nuke Reboot and Re-enumeration
      onProgress({ progress: 0.25, status: 'setup.rebooting' });
      // Nuke reboots quickly, but we need to wait for drive to reappear.
      // Give it extra time (e.g. 5-7 seconds)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // 3. Flash Actual Firmware
      onProgress({ progress: 0.35, status: 'setup.flashing' });

      // We might need to retry if the drive hasn't mounted yet
      let retries = 3;
      while (retries > 0) {
        result = await picoOps.flashFirmware(firmwareBuffer, firmwareName);
        if (result.success) break;
        if (result.error && result.error.includes('drive not found')) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 2000));
          retries--;
        } else {
          throw new Error(result.error);
        }
      }

      if (!result.success) throw new Error('setup.drive_error');

      onProgress({ progress: 0.5, status: 'setup.flashing' });

      // 4. Wait for Final Reboot
      onProgress({ progress: 0.55, status: 'setup.rebooting' });
      await new Promise(resolve => setTimeout(resolve, 8000));

      onProgress({ progress: 0.6, status: 'setup.f_complete' });

    } else {
      // --- Web Flow (FileSystem Access API) ---
      if (!('showDirectoryPicker' in window)) {
        throw new Error('File System Access API not supported');
      }

      // 1. Select Drive for Nuke
      onProgress({ progress: 0.15, status: 'setup.select_drive' });
      let dirHandle = await (window as any).showDirectoryPicker({
        id: 'pico-firmware-install',
        mode: 'readwrite',
        startIn: 'desktop'
      });
      if (!dirHandle) throw new Error('setup.drive_error');

      // 2. Flash Nuke
      onProgress({ progress: 0.20, status: 'setup.nuking' });
      try {
        let fileHandle = await dirHandle.getFileHandle(nukeName, { create: true });
        let writable = await fileHandle.createWritable();
        await writable.write(nukeBuffer);
        await writable.close();
      } catch (e: any) {
        // Nuke causes immediate reboot, so write/close might fail with NotFoundError.
        // We consider this a success if we wrote the buffer.
        console.log('Nuke write ended (expected reboot):', e);
      }

      // 3. Wait for Reboot
      onProgress({ progress: 0.30, status: 'setup.rebooting' });
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 4. Request Re-selection via Callback (Crucial for User Gesture)
      onProgress({ progress: 0.35, status: 'setup.reselect_drive' }); // Update status text

      if (actions?.getNextDriveHandle) {
        dirHandle = await actions.getNextDriveHandle();
      } else {
        // Fallback (likely fails security check, but keeps type safety)
        dirHandle = await (window as any).showDirectoryPicker({
          id: 'pico-firmware-install',
          mode: 'readwrite',
          startIn: 'desktop'
        });
      }

      if (!dirHandle) throw new Error('setup.drive_error');

      // 6. Flash Firmware
      onProgress({ progress: 0.45, status: 'setup.flashing' });
      let fileHandle = await dirHandle.getFileHandle(firmwareName, { create: true });
      let writable = await fileHandle.createWritable();
      await writable.write(firmwareBuffer);
      try {
        await writable.close();
      } catch (e) {
        console.log('Firmware write closed (rebooting):', e);
      }

      // 7. Wait for Final Reboot
      onProgress({ progress: 0.55, status: 'setup.rebooting' });
      await new Promise(resolve => setTimeout(resolve, 5000));

      onProgress({ progress: 0.6, status: 'setup.f_complete' });
    }
  } catch (err: any) {
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
  isElectron: boolean = false,
  connectionType: 'wifi' | 'ble' = 'wifi'
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

    // We treat 'null' as missing file. Errors should propagate to prevent data loss.
    const manifestStr = await serial.readFile('.lib_manifest.json');
    if (manifestStr !== null) {
      try {
        currentManifest = JSON.parse(manifestStr);
        console.log("Loaded existing library manifest:", currentManifest);
      } catch (jsonErr) {
        console.warn("Manifest corrupted, starting fresh.", jsonErr);
      }
    } else {
      console.log("No library manifest found, creating new one.");
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

    // Fetch Unique ID if wireless (needed for UI return)
    if (modelInfo.isWireless) {
      try {
        const cmd = "import machine, ubinascii; print(ubinascii.hexlify(machine.unique_id()).decode()[-4:])";
        const result = await serial.executeCommand(cmd);
        console.log(`[Unique ID Fetch] Raw result: '${result}'`);

        const cleanId = (result || '').trim();
        if (cleanId.match(/^[0-9a-f]{4}$/i)) {
          uniqueIdSuffix = cleanId.toLowerCase();
          console.log(`[Unique ID Fetch] Parsed: ${uniqueIdSuffix}`);
        } else {
          console.warn(`[Unique ID Fetch] Invalid format: ${cleanId}`);
        }
      } catch (e) {
        console.warn("Failed to fetch unique ID", e);
      }
    }

    // Iterate and Install Libraries
    // We spread progress from 0.75 to 0.88 approx
    const progressStart = 0.75;
    const progressTotal = 0.13;
    const step = progressTotal / AVAILABLE_LIBRARIES.length;

    let index = 0;
    for (const lib of AVAILABLE_LIBRARIES) {
      // Loop is 0-indexed for calculation
      const currentStepStart = progressStart + (index * step);

      // Skip libraries not meant for this device family
      if (lib.targetFamily && lib.targetFamily !== 'all') {
        const family = modelInfo.family || (modelInfo.id.startsWith('esp32') ? 'esp32' : 'pico');
        if (lib.targetFamily !== family) {
          index++;
          continue;
        }
      }

      // Skip boot if not wireless
      if (lib.id === 'boot' && !modelInfo.isWireless) {
        index++;
        continue;
      }

      // Skip BLE-only libraries if not BLE
      if (lib.id === 'ble_uart' && connectionType !== 'ble') {
        index++;
        continue;
      }

      let needsUpdate = isHigherVersion(lib.version, currentManifest[lib.id]);

      // Special check for boot.py variant (wifi vs ble)
      if (lib.id === 'boot') {
        // ALWAYS update boot script when running Setup Wizard (injectLibraries)
        // This ensures the user gets the selected mode (WiFi/BLE) even if versions match.
        // It also allows repairing a corrupted boot script by re-running setup.
        needsUpdate = true;

        const storedVer = currentManifest[lib.id] || '';
        if (!storedVer.includes(`+${connectionType}`)) {
          console.log(`Boot script switching mode. Stored: ${storedVer} -> +${connectionType}`);
        }
      }

      if (needsUpdate) {
        console.log(`Updating ${lib.name}: ${currentManifest[lib.id] || 'None'} -> ${lib.version}`);

        try {
          if (lib.isPackage && lib.packageFiles) {
            // Handle Multi-file Package
            await serial.executeCommand(`
try:
    os.mkdir('/lib/${lib.fileName}')
except:
    pass
`);
            
            for (let i = 0; i < lib.packageFiles.length; i++) {
              const pFile = lib.packageFiles[i];
              const fileNameToFetch = `${lib.fileName}/${pFile}`;
              const targetPath = `/lib/${lib.fileName}/${pFile}`;
              
              if (pFile.includes('/')) {
                const parts = pFile.split('/');
                let currentPath = `/lib/${lib.fileName}`;
                for (let j = 0; j < parts.length - 1; j++) {
                  currentPath += '/' + parts[j];
                  await serial.executeCommand(`
try:
    os.mkdir('${currentPath}')
except:
    pass
`);
                }
              }

              const res = await fetch(`/assets/libs/${fileNameToFetch}`);
              if (!res.ok) throw new Error(`Failed to fetch ${fileNameToFetch}`);
              const code = await res.text();

              const fileStep = step / lib.packageFiles.length;
              const subStepStart = currentStepStart + (i * fileStep);

              await serial.uploadFile(targetPath, code, (filePct) => {
                const globalPct = subStepStart + ((filePct / 100) * fileStep);
                onProgress({ progress: globalPct, status: 'setup.library_installing' });
              }, false);
            }
            
            currentManifest[lib.id] = lib.version;

          } else {
            // Handle Single File Library (Original Logic)
            let fileNameToFetch = lib.fileName;

            if (lib.id === 'boot') {
              const family = modelInfo.family || (modelInfo.id.startsWith('esp32') ? 'esp32' : 'pico');
              if (family === 'esp32') {
                fileNameToFetch = 'boot_esp32_wifi.py'; // ESP32 WiFi AP + WebREPL
              } else if (connectionType === 'ble') {
                fileNameToFetch = 'boot_ble.py';
              } else {
                fileNameToFetch = 'boot_wifi.py'; // Pico WiFi (Default)
              }
            }

            const res = await fetch(`/assets/libs/${fileNameToFetch}`);
            if (!res.ok) throw new Error(`Failed to fetch ${fileNameToFetch}`);
            const code = await res.text();

            let targetPath = `/lib/${lib.fileName}`;
            if (lib.id === 'boot') targetPath = 'boot.py';

            if (targetPath.startsWith('/lib/')) {
              try {
                await serial.executeCommand(`
try:
    os.remove('${targetPath}')
except:
    pass
`);
              } catch (e) { /* ignore */ }
            }

            await serial.uploadFile(targetPath, code, (filePct) => {
              const globalPct = currentStepStart + ((filePct / 100) * step);
              onProgress({ progress: globalPct, status: 'setup.library_installing' });
            }, false);

            if (lib.id === 'boot') {
              // Append variant to version string for tracking
              currentManifest[lib.id] = `${lib.version}+${connectionType}`;
            } else {
              currentManifest[lib.id] = lib.version;
            }
          }

        } catch (fetchErr) {
          console.error(`Failed to install ${lib.name}`, fetchErr);
        }
      } else {
        console.log(`${lib.name} is up to date (${lib.version}). Skipping.`);
      }

      index++;
      // Ensure we hit the exact step end
      onProgress({ progress: progressStart + (index * step), status: 'setup.library_installing' });
    }

    // If wireless (WiFi), install webrepl_cfg.py (static config)
    // For BLE we don't need webrepl_cfg
    if (modelInfo.isWireless && connectionType === 'wifi') {
      try {
        const webreplRes = await fetch('/assets/libs/webrepl_cfg.py');
        if (webreplRes.ok) {
          const webreplCode = await webreplRes.text();
          await serial.uploadFile('webrepl_cfg.py', webreplCode, undefined, false);
        }
      } catch (e) {
        console.warn("Skipping webrepl_cfg.py (not found or error)", e);
      }
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
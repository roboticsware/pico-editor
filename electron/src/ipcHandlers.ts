import { ipcMain } from 'electron';
import { findPicoDrive } from './services/firmwareService';
import * as path from 'path';
import * as fs from 'fs';

export function registerIpcHandlers() {
  ipcMain.handle('flash-firmware', async (event, arrayBuffer: ArrayBuffer, filename: string) => {
    try {
      const drivePath = await findPicoDrive();
      if (!drivePath) {
        throw new Error('RPI-RP2 drive not found');
      }

      const destPath = path.join(drivePath, filename);
      const buffer = Buffer.from(arrayBuffer);

      await fs.promises.writeFile(destPath, buffer);
      return { success: true };
    } catch (error) {
      console.error('Flash error:', error);
      return { success: false, error: error.message };
    }
  });
}
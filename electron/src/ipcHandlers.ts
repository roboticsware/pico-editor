import { ipcMain, dialog } from 'electron';
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

  ipcMain.handle('save-project-file', async (event, data: string, defaultName: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: defaultName,
      filters: [
        { name: 'Pico Project', extensions: ['json'] }
      ]
    });

    if (canceled || !filePath) {
      return { canceled: true };
    }

    try {
      await fs.promises.writeFile(filePath, data, 'utf-8');
      return { success: true, filePath };
    } catch (error) {
      console.error('File save error:', error);
      return { success: false, error: error.message };
    }
  });
}
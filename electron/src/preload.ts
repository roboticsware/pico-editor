import { contextBridge, ipcRenderer } from 'electron';
require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

contextBridge.exposeInMainWorld('ElectronUpdater', {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    checkForUpdatesSilent: () => ipcRenderer.invoke('check-for-updates-silent'),
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
    onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, info) => callback(info)),
    onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, err) => callback(err)),
    onDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_event, progress) => callback(progress)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
});

contextBridge.exposeInMainWorld('PicoOps', {
    flashFirmware: (buffer: ArrayBuffer, filename: string) => ipcRenderer.invoke('flash-firmware', buffer, filename),
});

contextBridge.exposeInMainWorld('FileOps', {
    saveProject: (data: string, defaultName: string) => ipcRenderer.invoke('save-project-file', data, defaultName),
});

contextBridge.exposeInMainWorld('ElectronBLE', {
    onDeviceList: (callback: (devices: any[]) => void) => ipcRenderer.on('ble-device-list', (_event, devices) => callback(devices)),
    selectDevice: (deviceId: string) => ipcRenderer.send('ble-device-selected', deviceId),
    removeListener: () => ipcRenderer.removeAllListeners('ble-device-list'),
});

import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { getCapacitorElectronConfig, setupElectronDeepLinking } from '@capacitor-community/electron';
import type { MenuItemConstructorOptions } from 'electron';
import { app, MenuItem, ipcMain, protocol } from 'electron';
import electronIsDev from 'electron-is-dev';
import unhandled from 'electron-unhandled';
import { autoUpdater } from 'electron-updater';

import { ElectronCapacitorApp, setupContentSecurityPolicy, setupReloadWatcher } from './setup';
import { registerIpcHandlers } from './ipcHandlers';

// Enable Web Bluetooth & Experimental Features (Must be applied before app.whenReady)
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
app.commandLine.appendSwitch('enable-web-bluetooth', 'true');

// Graceful handling of unhandled errors.
unhandled();

// Define our menu templates (these are optional)
const trayMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
const appMenuBarMenuTemplate: (MenuItemConstructorOptions | MenuItem)[] = [
  { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
  { role: 'viewMenu' },
];

// Get Config options from capacitor.config
const capacitorFileConfig: CapacitorElectronConfig = getCapacitorElectronConfig();

// Initialize our app. You can pass menu templates into the app here.
const myCapacitorApp = new ElectronCapacitorApp(capacitorFileConfig, trayMenuTemplate, appMenuBarMenuTemplate);

// If deeplinking is enabled then we will set it up here.
if (capacitorFileConfig.electron?.deepLinkingEnabled) {
  setupElectronDeepLinking(myCapacitorApp, {
    customProtocol: capacitorFileConfig.electron.deepLinkingCustomProtocol ?? 'mycapacitorapp',
  });
}

// Register our custom scheme as privileged (Secure Context) so Web Bluetooth works
const myScheme = capacitorFileConfig.electron?.customUrlScheme ?? 'capacitor-electron';
protocol.registerSchemesAsPrivileged([
  {
    scheme: myScheme,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      allowServiceWorkers: true,
      corsEnabled: true
    }
  }
]);

// If we are in Dev mode, use the file watcher components.
if (electronIsDev) {
  setupReloadWatcher(myCapacitorApp);
}

// Run Application
(async () => {
  // Wait for electron app to be ready.
  await app.whenReady();
  // Security - Set Content-Security-Policy based on whether or not we are in dev mode.
  setupContentSecurityPolicy(myCapacitorApp.getCustomURLScheme());
  // Register IPC handlers
  registerIpcHandlers();
  // Initialize our app, build windows, and load content.
  await myCapacitorApp.init();
  // USB device permission and selection automation settings
  const mainWindow = myCapacitorApp.getMainWindow();
  const session = mainWindow.webContents.session;

  // Consolidated Permission Check Handler
  session.setPermissionCheckHandler((_webContents, permission, _requestingOrigin, details) => {
    // 1. Serial Permission (Always allow)
    if (permission === 'serial') return true;

    // 2. USB Permission (Allow specific Vendor ID for Pico)
    if (permission === 'usb' && (details as any).device?.vendorId === 11914) {
      return true;
    }

    // 3. Bluetooth Permission
    if ((permission as string) === 'bluetooth') return true;

    return false;
  });

  // Consolidated Device Permission Handler
  session.setDevicePermissionHandler((details) => {
    // 1. Serial Device (Always allow)
    if (details.deviceType === 'serial') return true;

    // 2. USB Device (Allow specific Vendor ID for Pico)
    if (details.deviceType === 'usb' && (details.device as any).vendorId === 11914) {
      return true;
    }

    return false;
  });
})();

// Handle when all of our windows are close (platforms have their own expectations).
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// When the dock icon is clicked.
app.on('activate', async function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (myCapacitorApp.getMainWindow().isDestroyed()) {
    await myCapacitorApp.init();
  }
});

// Place all ipc or other electron api calls and custom functionality under this line

ipcMain.handle('check-for-updates', async () => {
  if (electronIsDev) {
    return { status: 'dev-mode', message: 'Update check is disabled in development mode.' };
  }
  try {
    const result = await autoUpdater.checkForUpdatesAndNotify();
    return { status: 'success', result };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
});

autoUpdater.on('update-available', (info) => {
  myCapacitorApp.getMainWindow().webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  myCapacitorApp.getMainWindow().webContents.send('update-not-available', info);
});

autoUpdater.on('error', (err) => {
  myCapacitorApp.getMainWindow().webContents.send('update-error', err.message);
});

autoUpdater.on('download-progress', (progressObj) => {
  myCapacitorApp.getMainWindow().webContents.send('update-download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  myCapacitorApp.getMainWindow().webContents.send('update-downloaded', info);
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall();
});
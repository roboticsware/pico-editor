import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roboticsware.picoeditor',
  appName: 'Pico Editor',
  webDir: 'dist',
  server: {
    allowNavigation: ['192.168.4.1']
  }
};

export default config;

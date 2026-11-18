import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.seiamrbijoy.grimoiremanga',
  appName: 'grimoire-manga',
  webDir: 'dist',
  server: {
    url: 'https://grimoire-manga-1.onrender.com',
    cleartext: false
  }
};

export default config;

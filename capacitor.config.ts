import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9c63e22898864d0491ab1e60a8b46615',
  appName: 'daily-nova-glow',
  webDir: 'dist',
  server: {
    cleartext: true
  },
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-1017007756363897~9648031243',
      iosAppId: 'ca-app-pub-1017007756363897~9648031243',
    }
  }
};

export default config;

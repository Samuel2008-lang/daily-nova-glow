import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9c63e22898864d0491ab1e60a8b46615',
  appName: 'Daily Nova',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-1017007756363897~9648031243',
      iosAppId: 'ca-app-pub-1017007756363897~9648031243',
      initializeForTesting: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#ff69b4',
    },
    SpeechRecognition: {
      // Permissions auto-requested at runtime
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;

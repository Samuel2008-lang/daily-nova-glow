import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samuelegbon.dailynova',
  appName: 'Daily Nova',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-1017007756363897~9648031243',
      iosAppId: 'ca-app-pub-1017007756363897~9648031243',
      initializeForTesting: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#ff69b4',
      sound: 'dailynova_alarm_short.wav',
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

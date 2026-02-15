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
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#ff69b4",
    },
  },
  android: {
    // Ensures AdMob App ID is injected into AndroidManifest.xml
    // You must also add this to android/app/src/main/AndroidManifest.xml manually:
    // <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-1017007756363897~9648031243"/>
  },
};

export default config;

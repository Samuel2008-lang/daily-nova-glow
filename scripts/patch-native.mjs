#!/usr/bin/env node
/**
 * Auto-patches native Android (and iOS) files after `npx cap add` / `npx cap sync`.
 * Runs automatically via the `postinstall` and `cap:sync` npm scripts.
 *
 * Idempotent — safe to run multiple times. No-ops if android/ios folders don't exist yet.
 *
 * Injects:
 *  - AdMob APPLICATION_ID meta-data into AndroidManifest.xml
 *  - INTERNET, RECORD_AUDIO, VIBRATE, POST_NOTIFICATIONS, WAKE_LOCK, AD_ID permissions
 *  - iOS Info.plist usage descriptions (microphone, speech, tracking)
 *  - Generates launcher icons + splash screens from public/app-icon.png via @capacitor/assets
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ADMOB_APP_ID = 'ca-app-pub-1017007756363897~9648031243';
const ROOT = process.cwd();

const ANDROID_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.RECORD_AUDIO',
  'android.permission.VIBRATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.USE_FULL_SCREEN_INTENT',
  'android.permission.USE_BIOMETRIC',
  'android.permission.USE_FINGERPRINT',
  'android.permission.CAMERA',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'com.google.android.gms.permission.AD_ID',
];


function patchAndroidManifest() {
  const manifestPath = join(ROOT, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!existsSync(manifestPath)) return false;

  let xml = readFileSync(manifestPath, 'utf8');
  let changed = false;

  // 1. AdMob APPLICATION_ID inside <application>
  if (!xml.includes('com.google.android.gms.ads.APPLICATION_ID')) {
    const metaTag = `\n        <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${ADMOB_APP_ID}"/>\n    `;
    xml = xml.replace(/(<\/application>)/, `${metaTag}$1`);
    changed = true;
  }

  // 2. Permissions before <application>
  for (const perm of ANDROID_PERMISSIONS) {
    if (!xml.includes(`android:name="${perm}"`)) {
      const tag = `    <uses-permission android:name="${perm}" />\n`;
      xml = xml.replace(/(<application )/, `${tag}$1`);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(manifestPath, xml, 'utf8');
    console.log('✓ Patched AndroidManifest.xml (AdMob ID + permissions)');
  }
  return changed;
}

function patchIosInfoPlist() {
  const iosAppDir = join(ROOT, 'ios', 'App');
  if (!existsSync(iosAppDir)) return false;

  // Find Info.plist
  let plistPath = join(iosAppDir, 'App', 'Info.plist');
  if (!existsSync(plistPath)) return false;

  let xml = readFileSync(plistPath, 'utf8');
  let changed = false;

  const usages = {
    NSMicrophoneUsageDescription: 'DailyNova needs microphone access for voice capture.',
    NSSpeechRecognitionUsageDescription: 'DailyNova converts your voice to text on-device.',
    NSFaceIDUsageDescription: 'DailyNova uses Face ID to unlock the app.',
    NSCameraUsageDescription: 'DailyNova uses the camera to attach photos to your reminders.',
    NSPhotoLibraryUsageDescription: 'DailyNova lets you attach photos from your library to reminders.',
    NSPhotoLibraryAddUsageDescription: 'DailyNova saves attached reminder photos to your library.',
    GADApplicationIdentifier: ADMOB_APP_ID,
  };


  for (const [key, value] of Object.entries(usages)) {
    if (!xml.includes(`<key>${key}</key>`)) {
      const entry = `\t<key>${key}</key>\n\t<string>${value}</string>\n`;
      xml = xml.replace(/(<\/dict>\s*<\/plist>)/, `${entry}$1`);
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(plistPath, xml, 'utf8');
    console.log('✓ Patched iOS Info.plist (permissions + AdMob ID)');
  }
  return changed;
}

function writeWav(file, seconds, frequency = 880) {
  const sampleRate = 44100;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 800, (samples - i) / 800);
    const sample = Math.round(Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 15000 * fade);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  writeFileSync(file, buffer);
}

function patchNotificationPlugin() {
  const managerPath = join(ROOT, 'node_modules', '@capacitor', 'local-notifications', 'android', 'src', 'main', 'java', 'com', 'capacitorjs', 'plugins', 'localnotifications', 'LocalNotificationManager.java');
  const publisherPath = join(ROOT, 'node_modules', '@capacitor', 'local-notifications', 'android', 'src', 'main', 'java', 'com', 'capacitorjs', 'plugins', 'localnotifications', 'TimedNotificationPublisher.java');
  let changed = false;

  if (existsSync(managerPath)) {
    let java = readFileSync(managerPath, 'utf8');
    if (!java.includes('DN_FULLSCREEN_PATCH')) {
      java = java.replace(
        '        createActionIntents(localNotification, mBuilder);',
        `        createActionIntents(localNotification, mBuilder);\n        // DN_FULLSCREEN_PATCH: Samsung-style Daily Nova reminder behavior.\n        JSObject dnExtra = localNotification.getExtra();\n        if (dnExtra != null) {\n            Boolean dnFullScreen = dnExtra.getBoolean("fullScreen", false);\n            Boolean dnInsistent = dnExtra.getBoolean("insistent", false);\n            Integer dnImportance = dnExtra.getInteger("importance", 3);\n            Integer dnTimeout = dnExtra.getInteger("timeoutAfterMs", null);\n            if (dnImportance != null && dnImportance >= 5) {\n                mBuilder.setPriority(NotificationCompat.PRIORITY_MAX);\n                mBuilder.setCategory(NotificationCompat.CATEGORY_ALARM);\n            } else if (dnImportance != null && dnImportance >= 4) {\n                mBuilder.setPriority(NotificationCompat.PRIORITY_HIGH);\n            }\n            if (dnTimeout != null && dnTimeout > 0) {\n                mBuilder.setTimeoutAfter(dnTimeout.longValue());\n            }\n            if (Boolean.TRUE.equals(dnInsistent)) {\n                mBuilder.setOnlyAlertOnce(false);\n            }\n            if (Boolean.TRUE.equals(dnFullScreen)) {\n                Intent fsIntent = buildIntent(localNotification, DEFAULT_PRESS_ACTION);\n                PendingIntent fsPendingIntent = PendingIntent.getActivity(context, localNotification.getId() + 900000, fsIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);\n                mBuilder.setFullScreenIntent(fsPendingIntent, true);\n            }\n        }`
      );
      java = java.replace(
        '        Notification buildNotification = mBuilder.build();',
        `        Notification buildNotification = mBuilder.build();\n        if (dnExtra != null && Boolean.TRUE.equals(dnExtra.getBoolean("insistent", false))) {\n            buildNotification.flags |= Notification.FLAG_INSISTENT;\n        }`
      );
      java = java.replace(
        '                long interval = at.getTime() - new Date().getTime();\n                alarmManager.setRepeating(AlarmManager.RTC, at.getTime(), interval, pendingIntent);',
        `                long interval = at.getTime() - new Date().getTime();\n                try {\n                    JSObject dnRepeatExtra = request.getExtra();\n                    if (dnRepeatExtra != null && dnRepeatExtra.has("repeatEveryMs") && !dnRepeatExtra.isNull("repeatEveryMs")) {\n                        interval = dnRepeatExtra.getLong("repeatEveryMs");\n                    }\n                } catch (Exception ignored) {}\n                alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, at.getTime(), interval, pendingIntent);`
      );
      writeFileSync(managerPath, java, 'utf8');
      changed = true;
    }
  }

  if (existsSync(publisherPath)) {
    let java = readFileSync(publisherPath, 'utf8');
    if (!java.includes('DN_VISIBLE_ID_PATCH')) {
      java = java.replace(
        '        notificationManager.notify(id, notification);',
        `        // DN_VISIBLE_ID_PATCH: use a stable visible notification id so repeats replace instead of stacking.\n        int visibleId = id;\n        if (notificationJson != null) {\n            JSObject extra = notificationJson.getJSObject("extra");\n            if (extra != null && extra.getInteger("visibleId") != null) {\n                visibleId = extra.getInteger("visibleId");\n            }\n            if (extra != null && Boolean.TRUE.equals(extra.getBoolean("insistent", false))) {\n                notification.flags |= Notification.FLAG_INSISTENT;\n            }\n        }\n        notificationManager.notify(visibleId, notification);`
      );
      writeFileSync(publisherPath, java, 'utf8');
      changed = true;
    }
  }

  const rawDir = join(ROOT, 'android', 'app', 'src', 'main', 'res', 'raw');
  if (existsSync(join(ROOT, 'android'))) {
    mkdirSync(rawDir, { recursive: true });
    writeWav(join(rawDir, 'dailynova_alarm_short.wav'), 0.45, 880);
    writeWav(join(rawDir, 'dailynova_alarm_classic.wav'), 0.55, 1040);
    changed = true;
  }
  if (changed) console.log('✓ Patched local notifications (replace repeats + full-screen alerts + sounds)');
  return changed;
}

/**
 * Generates a native Android home-screen widget that renders the next
 * reminders straight from Capacitor Preferences (fully offline).
 */
function generateAndroidWidget() {
  const androidMain = join(ROOT, 'android', 'app', 'src', 'main');
  if (!existsSync(androidMain)) return false;

  const gradlePath = join(ROOT, 'android', 'app', 'build.gradle');
  let appId = 'app.lovable.dailynova';
  if (existsSync(gradlePath)) {
    const m = readFileSync(gradlePath, 'utf8').match(/applicationId\s+["']([^"']+)["']/);
    if (m) appId = m[1];
  }
  const pkgPath = appId.split('.').join('/');
  const javaDir = join(androidMain, 'java', ...appId.split('.'));
  mkdirSync(javaDir, { recursive: true });
  mkdirSync(join(androidMain, 'res', 'layout'), { recursive: true });
  mkdirSync(join(androidMain, 'res', 'xml'), { recursive: true });
  mkdirSync(join(androidMain, 'res', 'drawable'), { recursive: true });

  const provider = `package ${appId};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** DN_WIDGET: renders upcoming Daily Nova reminders from Capacitor Preferences. */
public class DailyNovaWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_TEXT = { R.id.dn_row1_text, R.id.dn_row2_text, R.id.dn_row3_text, R.id.dn_row4_text };
    private static final int[] ROW_TIME = { R.id.dn_row1_time, R.id.dn_row2_time, R.id.dn_row3_time, R.id.dn_row4_time };
    private static final int[] ROW = { R.id.dn_row1, R.id.dn_row2, R.id.dn_row3, R.id.dn_row4 };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(context, manager, id);
    }

    private void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.dailynova_widget);
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String raw = prefs.getString("dn_widget_reminders", null);

        int shown = 0;
        try {
            if (raw != null) {
                JSONArray items = new JSONObject(raw).optJSONArray("items");
                if (items != null) {
                    for (int i = 0; i < items.length() && i < ROW.length; i++) {
                        JSONObject item = items.getJSONObject(i);
                        views.setTextViewText(ROW_TEXT[i], item.optString("text", ""));
                        views.setTextViewText(ROW_TIME[i], item.optString("when", ""));
                        views.setViewVisibility(ROW[i], View.VISIBLE);
                        shown++;
                    }
                }
            }
        } catch (Exception ignored) {}

        for (int i = shown; i < ROW.length; i++) views.setViewVisibility(ROW[i], View.GONE);
        views.setViewVisibility(R.id.dn_empty, shown == 0 ? View.VISIBLE : View.GONE);

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            PendingIntent pi = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.dn_widget_root, pi);
        }
        manager.updateAppWidget(widgetId, views);
    }
}
`;

  const row = (n) => `
        <LinearLayout
            android:id="@+id/dn_row${n}"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:paddingTop="6dp"
            android:visibility="gone">
            <TextView
                android:id="@+id/dn_row${n}_text"
                android:layout_width="0dp"
                android:layout_weight="1"
                android:layout_height="wrap_content"
                android:maxLines="1"
                android:ellipsize="end"
                android:textColor="#F5F5FF"
                android:textSize="13sp" />
            <TextView
                android:id="@+id/dn_row${n}_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:paddingStart="8dp"
                android:textColor="#FF69B4"
                android:textSize="12sp" />
        </LinearLayout>`;

  const layout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/dn_widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/dailynova_widget_bg"
    android:padding="14dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Daily Nova"
        android:textColor="#FF69B4"
        android:textSize="12sp"
        android:textStyle="bold" />
${[1, 2, 3, 4].map(row).join('\n')}

    <TextView
        android:id="@+id/dn_empty"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:paddingTop="8dp"
        android:text="No upcoming reminders"
        android:textColor="#9AA0B5"
        android:textSize="12sp"
        android:visibility="gone" />
</LinearLayout>
`;

  const bg = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#0A0A0F" />
    <corners android:radius="20dp" />
    <stroke android:width="1dp" android:color="#33FF69B4" />
</shape>
`;

  const info = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:initialLayout="@layout/dailynova_widget"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen|keyguard" />
`;

  writeFileSync(join(javaDir, 'DailyNovaWidgetProvider.java'), provider, 'utf8');
  writeFileSync(join(androidMain, 'res', 'layout', 'dailynova_widget.xml'), layout, 'utf8');
  writeFileSync(join(androidMain, 'res', 'drawable', 'dailynova_widget_bg.xml'), bg, 'utf8');
  writeFileSync(join(androidMain, 'res', 'xml', 'dailynova_widget_info.xml'), info, 'utf8');

  // Register the provider in the manifest.
  const manifestPath = join(androidMain, 'AndroidManifest.xml');
  if (existsSync(manifestPath)) {
    let xml = readFileSync(manifestPath, 'utf8');
    if (!xml.includes('DailyNovaWidgetProvider')) {
      const receiver = `
        <receiver
            android:name=".DailyNovaWidgetProvider"
            android:exported="false">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/dailynova_widget_info" />
        </receiver>
    `;
      xml = xml.replace(/(<\/application>)/, `${receiver}$1`);
      writeFileSync(manifestPath, xml, 'utf8');
    }
  }
  console.log(`✓ Generated Android home-screen widget (${pkgPath})`);
  return true;
}

function generateAppAssets() {
  const sourceIcon = join(ROOT, 'public', 'app-icon.png');
  const sourceForeground = join(ROOT, 'public', 'app-icon-foreground.png');
  if (!existsSync(sourceIcon)) return false;
  if (!existsSync(join(ROOT, 'android')) && !existsSync(join(ROOT, 'ios'))) return false;
  try {
    const assetsDir = join(ROOT, 'assets');
    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });

    // Standard icon
    copyFileSync(sourceIcon, join(assetsDir, 'icon.png'));
    
    // Notification icon (grayscale/alpha for Android)
    // If we have a dedicated one use it, otherwise use main icon
    if (existsSync(join(ROOT, 'public', 'notification-icon.png'))) {
      copyFileSync(join(ROOT, 'public', 'notification-icon.png'), join(assetsDir, 'notification-icon.png'));
    } else {
      copyFileSync(sourceIcon, join(assetsDir, 'notification-icon.png'));
    }

    // Adaptive icon for modern Android
    copyFileSync(sourceIcon, join(assetsDir, 'icon-background.png'));
    if (existsSync(sourceForeground)) {
      copyFileSync(sourceForeground, join(assetsDir, 'icon-foreground.png'));
    } else {
      copyFileSync(sourceIcon, join(assetsDir, 'icon-foreground.png'));
    }

    execSync('npx @capacitor/assets generate --iconBackgroundColor "#7c3aed" --iconBackgroundColorDark "#7c3aed" --splashBackgroundColor "#0a0a0f" --splashBackgroundColorDark "#0a0a0f"', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('✓ Generated full-bleed launcher icons + splash + notification icons');
    return true;
  } catch (err) {
    console.warn('⚠ Icon generation skipped:', err.message);
    return false;
  }
}

try {
  const a = patchAndroidManifest();
  const i = patchIosInfoPlist();
  patchNotificationPlugin();
  generateAndroidWidget();
  generateAppAssets();
  if (!a && !i) console.log('✓ Native files already up to date (or platforms not added yet).');
} catch (err) {
  console.warn('⚠ Native auto-patch skipped:', err.message);
}

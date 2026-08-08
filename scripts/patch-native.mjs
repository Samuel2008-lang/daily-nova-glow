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
  generateAppAssets();
  if (!a && !i) console.log('✓ Native files already up to date (or platforms not added yet).');
} catch (err) {
  console.warn('⚠ Native auto-patch skipped:', err.message);
}

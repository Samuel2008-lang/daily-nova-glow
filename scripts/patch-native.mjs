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

function generateAppAssets() {
  const sourceIcon = join(ROOT, 'public', 'app-icon.png');
  if (!existsSync(sourceIcon)) return false;
  if (!existsSync(join(ROOT, 'android')) && !existsSync(join(ROOT, 'ios'))) return false;
  try {
    // @capacitor/assets reads from ./assets/icon.png (or icon-only.png) by default
    const assetsDir = join(ROOT, 'assets');
    if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true });
    const target = join(assetsDir, 'icon.png');
    copyFileSync(sourceIcon, target);
    execSync('npx @capacitor/assets generate --iconBackgroundColor "#0a0a0f" --iconBackgroundColorDark "#0a0a0f" --splashBackgroundColor "#0a0a0f" --splashBackgroundColorDark "#0a0a0f"', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('✓ Generated launcher icons + splash from public/app-icon.png');
    return true;
  } catch (err) {
    console.warn('⚠ Icon generation skipped:', err.message);
    return false;
  }
}

try {
  const a = patchAndroidManifest();
  const i = patchIosInfoPlist();
  generateAppAssets();
  if (!a && !i) console.log('✓ Native files already up to date (or platforms not added yet).');
} catch (err) {
  console.warn('⚠ Native auto-patch skipped:', err.message);
}

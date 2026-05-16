# Plan — Fix bugs + UX upgrades

I'll tackle this in priority order. The app-restart bug is the most disruptive, so that goes first.

## 1. App keeps restarting on navigation (CRITICAL)
Every page change re-shows the splash screen and "restarts" the app. Most likely cause: the splash logic in `App.tsx` or `Index.tsx` re-mounts on route change, OR the interstitial ad manager is forcing reloads. I'll:
- Audit `App.tsx`, `SplashScreen.tsx`, `InterstitialAdManager.tsx`, and the routing setup
- Ensure splash only runs once per cold start (guard with a session flag)
- Make sure interstitials don't unmount the app shell

## 2. Tasks page microphone not transcribing
Mic stays "Listening" forever on Tasks. I'll wire the same toggle/stop pattern already used on Diary/Journal/Notes/Habits into `Tasks.tsx`.

## 3. Quotes page fixes
- Change "Watch Ad for 2 Quotes" → match actual reward (1 quote). I'll check `use-admob` / `Quotes.tsx` for the real reward count first.
- Fix counter lag: re-read from storage on focus + after reward.
- Offline: detect `navigator.onLine`; when offline, hide/disable the Watch Ad button (or label it "Offline — using cached quotes").

## 4. Share quote
- Remove the quote text from the share `text` field (image only — no redundant caption).
- Background customization: **I need you to upload the 3 background images first**, then I'll add a picker in the share flow. I'll skip this step for now and pick it up once you send them.

## 5. Diary & Journal AI → dedicated page
Replace the inline AI assistant card with a button that navigates to a new full page:
- New routes: `/diary/ai` and `/journal/ai`
- The page has: "New chat" button, list of past chats, and the chat surface
- Tapping a past chat opens that conversation directly in the chat surface (no extra screen)
- Existing chat session storage (`ai-chat-sessions.ts`) is reused

## 6. Samsung-style reminders
You sent the alarm-screen screenshot + screen recordings. From what I can see, you want:
- Full-screen alarm-style activity when the reminder fires (large title, time, Snooze/Dismiss/Complete buttons), instead of a small banner
- Repeating reminder until dismissed

On Android this needs the **full-screen intent** flag + a high-importance notification channel. I'll update `notifications.ts` and add the required permission (`USE_FULL_SCREEN_INTENT`) to the Capacitor config / android manifest patch script. **Note:** because we use `@capacitor/local-notifications`, true full-screen takeover only works after a native rebuild (`npx cap sync` + reinstall APK). I'll set everything up so it works on the next native build.

## 7. App icon not updating on device
The icon is bundled into the native Android project (`android/app/src/main/res/mipmap-*`). The web project can't change it directly — you must:
1. Run `npx cap sync android` after icon files are placed
2. Uninstall the old APK from the device (Android caches icons aggressively)
3. Reinstall

I'll add a note in the patch script to log a reminder, but the actual icon swap has to happen in your local native folder. **Tell me where the new icon PNG lives in the repo** and I'll wire the script to copy it to all `mipmap-*` densities on `cap sync`.

## 8. Reduce ad frequency
Current: interstitial every 3 page changes. I'll bump to every 8 page changes and add a 2-minute minimum gap between interstitials.

---

## Order of execution
1. App restart bug (blocks everything else)
2. Tasks mic
3. Quote button text + counter + offline
4. Ad frequency
5. Diary/Journal AI dedicated page
6. Samsung full-screen reminders (config + code; needs native rebuild to fully take effect)
7. Share caption removal
8. *Wait for you:* 3 share-background images + new app icon location

Sound good? Reply "go" and I'll start with #1, or tell me to reorder/skip anything.
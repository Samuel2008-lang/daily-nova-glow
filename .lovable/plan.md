# Reminder System Rebuild

This is a large rebuild. I want to confirm scope before touching code — several pieces (location triggers, home-screen widgets, cloud sync) have real platform limits inside a Capacitor + local-storage app, and I want your call on where to spend effort first.

## What I will build (Phase 1 — core, high confidence)

### Data model (`src/lib/storage.ts`)
Extend `Task` into a real `Reminder` shape:
- `memo` (rich title/body), `important: boolean`, `color?: string`, `category?: string`
- `checklist?: {id, text, done}[]`
- `images?: {id, dataUrl, thumb}[]` (local, base64 in IndexedDB via a new `src/lib/reminder-images.ts` — localStorage is too small)
- `time?: { date, time, repeat, duration }`
- `alertLevel: 'light' | 'medium' | 'strong'`
- `sound`, `snoozeMinutes`, `completed`, `completedAt`

Migration keeps old tasks working (maps `title`→`memo`, existing fields unchanged).

### Creation flow (`src/pages/ReminderEditor.tsx`, replaces current inline editor)
Full-screen editor matching your spec:
- Header: back • "New reminder" • star (Important)
- Auto-focused memo textarea with mic button
- Row: 📷 attach • ☑ checklist toggle
- Horizontal thumbnail strip (tap = fullscreen zoom, X to remove, max 10)
- "Add time" row → expands Time panel (date/time, quick presets, repeat, duration, alert style)
- "Category" selector (chips)
- Bottom bar: Cancel | Save (disabled until memo has text)

### Time panel
Date/time picker, presets (1h from now, Today 6pm, Tomorrow 9am, etc.), repeat (none/minute/hour/day/week/month/year × N), duration (forever / N times / until date), alert style picker with plain-language descriptions.

### Alert engine (`src/lib/notifications.ts`, `scripts/patch-native.mjs`)
Three channels on Android, each with correct importance + sound:
- **Light**: `IMPORTANCE_DEFAULT`, short sound, no full-screen intent
- **Medium**: `IMPORTANCE_HIGH`, full-screen intent, short sound, action buttons (Complete/Snooze/Dismiss)
- **Strong**: `IMPORTANCE_HIGH` + `CATEGORY_ALARM` + `FLAG_INSISTENT` + `setFullScreenIntent`, loops sound until dismissed

Foreground: existing `FullScreenReminderOverlay` gains image + checklist rendering and Medium/Strong takeover styling. Web fallback uses Notification API + in-app overlay.

Reboot persistence: `BOOT_COMPLETED` receiver already exists via the plugin; `rescheduleAllTaskNotifications()` runs on app launch.

### Smart views (`src/pages/Tasks.tsx` → `src/pages/Reminders.tsx`)
Tabs/segmented control: **Today • Scheduled • Important • Completed** (+ search icon).
- Card shows: color stripe, memo, time chip, repeat chip, first image thumbnail, checklist progress, star.
- Swipe/long-press → Complete / Edit / Delete.
- Completed view groups by date with easy restore.

### Images (`src/lib/reminder-images.ts`)
- Capacitor Camera plugin for take/pick (fallback: `<input type=file accept="image/*" capture>` on web).
- Compress to ≤2 MB via canvas resize (max 1600px long edge, JPEG q0.82) before storing.
- Store in IndexedDB keyed by imageId; only IDs + thumbs in the reminder record.
- Fullscreen zoomable viewer component.
- Notification `attachments` populated with first image (Medium/Strong).

### Polish
- Framer-motion enter/exit on cards, editor, image strip.
- Haptics on save/complete/delete.
- Dark theme already default; refine tokens if needed (no purple — use existing app palette).

## What I want your call on (Phase 2 — costly or platform-limited)

1. **Location triggers (arrive/leave, "every time")** — needs `@capacitor/geolocation` + background location permission + geofence plugin. Doable but heavy and drains battery. Skip for v1?
2. **Home-screen widget & rich lock-screen widget** — requires native Android widget code (Kotlin/XML) outside the JS layer. Not something I can ship purely from this codebase without you adding native module files. Skip for v1?
3. **Cloud sync ("Samsung Cloud style")** — memory says zero-cost, offline-first, no accounts. I'll keep it fully local. Confirm?
4. **Rich text in memo** — full RTF (bold/lists/etc.) or just plain multi-line with checklists as a separate feature? I'd recommend plain memo + checklists to stay fast and reliable.

## Files touched (Phase 1)
Create: `src/pages/Reminders.tsx`, `src/pages/ReminderEditor.tsx`, `src/lib/reminder-images.ts`, `src/components/reminders/ImageStrip.tsx`, `src/components/reminders/ImageViewer.tsx`, `src/components/reminders/TimePanel.tsx`, `src/components/reminders/AlertStylePicker.tsx`, `src/components/reminders/ReminderCard.tsx`.
Rewrite: `src/lib/storage.ts` (Reminder type + migration), `src/lib/task-reminders.ts` → `src/lib/reminder-scheduler.ts`, `src/lib/notifications.ts` (three channels), `src/pages/Tasks.tsx` (thin redirect to Reminders), `scripts/patch-native.mjs` (channel + full-screen intent patches).
Edit: `src/App.tsx` (route + overlay updates), `src/components/Navigation.tsx` (label).

## Please confirm before I build
- **Phase 2 items 1–3**: skip for v1, or include any? (Widgets need you to accept native code additions.)
- **Rich text**: plain memo + checklists OK?
- Anything you want renamed or dropped from Phase 1?

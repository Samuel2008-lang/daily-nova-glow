
# Plan — 3 upgrades

## 1. App icon too small (full-bleed fix)

**Cause:** Your `public/app-icon.png` has transparent padding around the gradient square. Android One UI then shrinks it inside its adaptive-icon safe zone, so it looks tiny next to MTN/PowerPoint icons that fill their tile edge-to-edge.

**Fix:**
- Regenerate `public/app-icon.png` as a **1024×1024 full-bleed** image — the purple/blue gradient must touch all four edges (no transparent margin).
- Update `scripts/patch-native.mjs` to also generate `assets/icon-foreground.png` (the same icon scaled to ~75% with transparent margin for adaptive foreground) so Android uses our gradient as the **background** layer — meaning the tile is filled edge-to-edge.
- Pass `--iconBackgroundColor` matching the gradient's dominant color (`#7c3aed`) so the legacy/round icon still looks correct.
- After `npx cap sync android` + uninstall/reinstall, the icon will match the size of MTN, PowerPoint, etc.

I'll generate the new full-bleed icon with imagegen (premium quality, no transparent background) and overwrite `public/app-icon.png`.

## 2. Samsung-style reminder editor (full feature parity)

From your screenshots + recordings, the Samsung Reminder screen has:
- **Memo field** (multi-line, optional)
- **Add time** → opens inline time picker with quick presets ("1 hour from now", "Today 07:00", "Today 15:00", "Today 22:00")
- **Repeat** sub-screen: Don't repeat / Every minute / Every hour / Everyday / Every week / Every month / Every year — with **number input** (Every `N` minutes)
- **Duration**: Forever / Specific number of times / Until `<date>` (with calendar picker)
- **Alert level**: Light (notification + short sound) / Medium (full-screen alert + short sound) / Strong (full-screen alert + long sound)
- **My reminders** colored category dot
- Bottom **Cancel / Save** bar

I'll build this as a new component `ReminderEditor.tsx` and wire it into Tasks (and a new "Reminders" entry point on Dashboard). Storage: extend the existing `Task` type with `repeat: { unit, every }`, `duration: { type, count?, until? }`, `alertLevel: 'light'|'medium'|'strong'`. Notification scheduler uses these to schedule the right cadence and channel importance (Light = default, Medium/Strong = alarms channel with `fullScreen: true`, Strong = looping long-sound).

The repeat sub-screen and date picker will be inline panels (no separate routes), mirroring Samsung's look on a black background with rounded cards — fits your neon/cyberpunk theme.

## 3. Voice AI chat — mic-to-text + Call mode

**Free, no paid backend.** Uses Web Speech API (STT) + speechSynthesis (TTS) — both built into Chrome/Android WebView. AI replies still go through the existing Lovable AI edge function you already have.

**Two modes added to `AiChatPage.tsx`:**

**a) Voice note → transcribed message (like ChatGPT mic)**
- Mic button next to the chat textarea.
- Tap → starts listening (existing `useSpeechRecognition` hook, with `autoEnhance`).
- Tap again or 1.4s silence → stops, fills the textarea, user can edit then send.

**b) Call mode (phone-call-style live conversation)**
- "Phone" icon next to mic → opens full-screen Call overlay.
- Animated orb that pulses when listening / glows when AI is speaking.
- Loop: listen → transcribe → send to AI → speak reply via `speechSynthesis` → listen again. Hands-free.
- "End call" button stops everything; transcript is saved to the current chat session so the user can read it later.
- Works fully offline-friendly for STT/TTS (uses device voices). Only the AI reply itself needs network (existing chat-stream function).

No new backend, no new paid services.

---

## Order
1. Full-bleed app icon (quick)
2. Voice mic + Call mode in AI chat
3. Samsung-style reminder editor (biggest piece)

Reply **"go"** and I'll start, or tell me to reorder/skip.

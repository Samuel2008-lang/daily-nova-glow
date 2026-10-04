# DailyNova bug fixes and requested features

## Goal
Complete the requested fixes across reminders, content workflows, data handling, privacy, ads, and navigation while preserving the app's local-first behavior.

## Work plan
1. **Reminders and native Android behavior** — repair notification setup and sound mapping; implement the provided dark strong-alarm screen; block past reminder times; request location permission on Add Place; replace custom sound options with the native picker where Android supports it; make alert style selection reliably tappable.
2. **Tasks, notes, quotes, habits, and voice** — fix task category/overdue visibility; lock note dates while editing and improve PDF/image sharing; unify the daily quote and improve rotation, labels, and ad reward handling; add habit Recently Deleted/restore; follow the requested online-only Web Speech transcription and text cleanup.
3. **Deletion and tags** — apply a shared confirmation to destructive actions except the habit soft-delete flow; support tag assignment across notes, tasks, habits, diary, and journal, with aggregate counts, filtering, and confirmed tag removal.
4. **Data management** — save native JSON exports to a user-accessible location; improve PDF/text export structure; import Daily Nova JSON with deduplication and merge behavior.
5. **Settings, ads, performance, and privacy** — update copyright, remove ad test settings/logging, lazy-load non-active pages where safe, add the in-app privacy policy and standalone HTML policy.
6. **Verification** — check project diagnostics, run the project build/lint checks, and exercise public app flows in the preview; distinguish Android-native behavior that cannot be proven in a browser preview.

## Technical notes
- Preserve local storage and existing data formats; migration must be additive and deduplicate by stable IDs/content keys.
- Android-only capabilities (exact alarms, boot rescheduling, native full-screen intents, location permission prompt, ringtone picker, and Downloads access) must be implemented through the existing Capacitor/native patch path; browser preview can only verify the fallback UI.
- Use the supplied reminder screenshots as the visual reference for the alarm actions, while honoring the new request for a pure dark background.
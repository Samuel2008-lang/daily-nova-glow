import { storage, type Task } from "@/lib/storage";
import { notificationService } from "@/lib/notifications";
import { getTaskNotificationId } from "@/lib/task-reminders";

/**
 * Fully offline, device-GPS-only geofencing for reminders.
 * No cloud, no third-party geocoding — coordinates stay on the device.
 */

const FIRED_KEY = "dailynova_geo_state";
const RETRIGGER_MS = 5 * 60 * 1000; // avoid re-firing on GPS jitter

type GeoState = Record<string, { inside: boolean; lastFired?: number }>;

const readState = (): GeoState => {
  try { return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}"); } catch { return {}; }
};
const writeState = (s: GeoState) => localStorage.setItem(FIRED_KEY, JSON.stringify(s));

export const distanceMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

export const getCurrentPosition = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") return null;
      }
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
  } catch { /* fall through to web */ }

  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
};

const fire = async (task: Task, kind: "arrive" | "leave") => {
  const label = task.location?.label || "your saved place";
  await notificationService.scheduleTaskAlarm({
    id: getTaskNotificationId(task.id, 5000),
    title: task.title,
    body: kind === "arrive" ? `You arrived at ${label}` : `You left ${label}`,
    at: new Date(Date.now() + 1000),
    alertLevel: task.alertLevel || "light",
    notificationSound: task.notificationSound || "gentle",
    taskId: task.id,
    snoozeMinutes: task.snoozeMinutes || 10,
    route: "/tasks",
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dailynova:reminder-alert", {
      detail: {
        taskId: task.id,
        visibleId: getTaskNotificationId(task.id, 5000),
        title: task.title,
        alertLevel: task.alertLevel || "light",
        notificationSound: task.notificationSound || "gentle",
        snoozeMinutes: task.snoozeMinutes || 10,
      },
    }));
  }
};

/** Evaluate all location reminders against a single position fix. */
export const evaluateGeofences = async (pos: { lat: number; lng: number }) => {
  const tasks = storage.getTasks().filter((t) => !t.completed && t.location);
  if (!tasks.length) return;
  const state = readState();
  const now = Date.now();

  for (const task of tasks) {
    const loc = task.location!;
    const dist = distanceMeters(pos.lat, pos.lng, loc.lat, loc.lng);
    const inside = dist <= (loc.radius || 150);
    const prev = state[task.id];
    const wasInside = prev?.inside ?? inside;
    const entered = inside && !wasInside;
    const exited = !inside && wasInside;
    const shouldFire = (loc.trigger === "arrive" && entered) || (loc.trigger === "leave" && exited);
    const cooledDown = !prev?.lastFired || now - prev.lastFired > RETRIGGER_MS;
    const allowed = loc.everyTime !== false || !prev?.lastFired;

    if (shouldFire && cooledDown && allowed) {
      await fire(task, loc.trigger);
      state[task.id] = { inside, lastFired: now };
      if (loc.everyTime === false) {
        const next = storage.getTasks().map((t) =>
          t.id === task.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
        );
        storage.saveTasks(next);
      }
    } else {
      state[task.id] = { inside, lastFired: prev?.lastFired };
    }
  }
  writeState(state);
};

let watchId: string | number | null = null;
let intervalId: number | null = null;

/** Start watching the device position while any location reminder exists. */
export const startGeofenceEngine = async () => {
  if (watchId !== null || intervalId !== null) return;
  const hasLocationReminders = storage.getTasks().some((t) => !t.completed && t.location);
  if (!hasLocationReminders) return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") return;
      }
      watchId = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
        if (pos) evaluateGeofences({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
      return;
    }
  } catch { /* fall back to polling */ }

  const tick = async () => {
    const pos = await getCurrentPosition();
    if (pos) await evaluateGeofences(pos);
  };
  tick();
  intervalId = window.setInterval(tick, 60000);
};

export const stopGeofenceEngine = async () => {
  if (intervalId !== null) { window.clearInterval(intervalId); intervalId = null; }
  if (watchId !== null) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      await Geolocation.clearWatch({ id: String(watchId) });
    } catch { /* ignore */ }
    watchId = null;
  }
};

export const restartGeofenceEngine = async () => {
  await stopGeofenceEngine();
  await startGeofenceEngine();
};

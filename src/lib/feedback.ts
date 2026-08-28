import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

const QUEUE_KEY = "dailynova_feedback_queue";
const LOG_KEY = "dailynova_feedback_log";

export interface FeedbackEntry {
  id: string;
  message: string;
  createdAt: string;
  delivered: boolean;
}

const read = (key: string): FeedbackEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const write = (key: string, items: FeedbackEntry[]) =>
  localStorage.setItem(key, JSON.stringify(items.slice(-100)));

export const getFeedbackLog = () => read(LOG_KEY).slice().reverse();

const deliver = async (entry: FeedbackEntry) => {
  const { error } = await supabase.from("feedback").insert({
    message: entry.message,
    platform: Capacitor.getPlatform(),
    app_version: "1.0.0",
  });
  return !error;
};

/** Retries anything that failed while the device was offline. */
export const flushFeedbackQueue = async () => {
  const queue = read(QUEUE_KEY);
  if (!queue.length) return;
  const remaining: FeedbackEntry[] = [];
  for (const entry of queue) {
    const ok = await deliver(entry).catch(() => false);
    if (ok) {
      const log = read(LOG_KEY).map((e) => (e.id === entry.id ? { ...e, delivered: true } : e));
      write(LOG_KEY, log);
    } else {
      remaining.push(entry);
    }
  }
  write(QUEUE_KEY, remaining);
};

/**
 * Sends feedback silently in the background. Never opens a mail app.
 * If the device is offline the message is stored and retried later.
 */
export const sendFeedback = async (message: string): Promise<"sent" | "queued"> => {
  const entry: FeedbackEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: message.trim(),
    createdAt: new Date().toISOString(),
    delivered: false,
  };

  const ok = await deliver(entry).catch(() => false);
  write(LOG_KEY, [...read(LOG_KEY), { ...entry, delivered: ok }]);
  if (!ok) write(QUEUE_KEY, [...read(QUEUE_KEY), entry]);
  return ok ? "sent" : "queued";
};

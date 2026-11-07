import type { ReminderSound } from "@/lib/storage";

/**
 * In-app sound playback for reminder previews and the full-screen alarm.
 * Only one sound plays at a time: starting a new one stops the previous one.
 * App sounds are synthesized to match the native WAV tones; phone tones
 * (`system_*`) can only be played by Android itself, so in-app they fall
 * back to the matching app tone.
 */

const TONES: Record<ReminderSound, { freq: number; beep: number; gap: number }> = {
  gentle: { freq: 880, beep: 0.45, gap: 0.35 },
  classic: { freq: 1040, beep: 0.55, gap: 0.25 },
  system_notification: { freq: 880, beep: 0.3, gap: 0.5 },
  system_ringtone: { freq: 660, beep: 0.6, gap: 0.3 },
  system_alarm: { freq: 1200, beep: 0.25, gap: 0.15 },
};

let ctx: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;
let vibTimer: number | null = null;

export const stopSound = () => {
  stopCurrent?.();
  stopCurrent = null;
};

export const playSound = (sound: ReminderSound = "gentle", loop = false): (() => void) => {
  stopSound();
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return () => {};
    ctx = ctx || new AC();
    void ctx.resume();
    const tone = TONES[sound] || TONES.gentle;
    let stopped = false;
    let timer: number | null = null;
    const nodes: OscillatorNode[] = [];

    const beep = () => {
      if (stopped || !ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = tone.freq;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.beep);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + tone.beep + 0.05);
      nodes.push(osc);
      if (loop) timer = window.setTimeout(beep, (tone.beep + tone.gap) * 1000);
    };
    beep();

    const stop = () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    };
    stopCurrent = stop;
    return stop;
  } catch {
    return () => {};
  }
};

export const startVibration = () => {
  stopVibration();
  if (!("vibrate" in navigator)) return;
  const pulse = () => navigator.vibrate([600, 400]);
  pulse();
  vibTimer = window.setInterval(pulse, 1000);
};

export const stopVibration = () => {
  if (vibTimer) window.clearInterval(vibTimer);
  vibTimer = null;
  if ("vibrate" in navigator) navigator.vibrate(0);
};

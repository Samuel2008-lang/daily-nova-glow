// Personal Speech Corrections Dictionary.
// Learns how the user fixes their own transcription (e.g. "forgex" → "ForgeX",
// personal names, slang, dialect) and applies those fixes to future mic input.
// 100% on-device: IndexedDB (with localStorage fallback), no network, zero cost.

export interface SpeechCorrection {
  heard_phrase: string;    // what the engine heard (normalized, lowercase)
  corrected_phrase: string; // what the user actually wrote
  count: number;           // times the user made this same correction
  updated_at: string;
}

const DB_NAME = "dailynova_speech";
const DB_VERSION = 1;
const STORE = "speech_user_corrections";
const LS_KEY = "dailynova_speech_corrections";
const MAX_ENTRIES = 500;

// ---------- storage ----------

function idbAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function idbGetAll(): Promise<SpeechCorrection[]> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "heard_phrase" });
        store.createIndex("count", "count");
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(STORE, "readonly");
        const store = tx.objectStore(STORE);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          resolve((getAll.result || []) as SpeechCorrection[]);
        };
        getAll.onerror = () => {
          db.close();
          reject(getAll.error);
        };
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  });
}

function idbPut(entry: SpeechCorrection): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "heard_phrase" });
        store.createIndex("count", "count");
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(entry);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  });
}

function lsLoad(): SpeechCorrection[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SpeechCorrection[]) : [];
  } catch {
    return [];
  }
}

function lsSave(list: SpeechCorrection[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* storage full — ignore */
  }
}

// ---------- pure text helpers (also used by tests) ----------

/** Split into raw whitespace tokens, keeping original case and punctuation. */
export function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Comparison form of a token: lowercase letters/digits/apostrophes only. */
export function normToken(tok: string): string {
  return tok
    .toLowerCase()
    .replace(/[^a-z0-9'’]/g, "")
    .replace(/’/g, "'");
}

/** True when the only change is plain first-letter capitalization (no signal). */
export function isTrivialCaseFix(heard: string, corrected: string): boolean {
  const h = normToken(heard);
  const c = normToken(corrected);
  if (h !== c) return false;
  const lower = corrected.toLowerCase();
  return corrected === lower.charAt(0).toUpperCase() + lower.slice(1);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Apply a dictionary to text: longest phrases first, higher counts win ties. */
export function applyCorrectionsToText(text: string, corrections: SpeechCorrection[]): string {
  if (!text || corrections.length === 0) return text;
  const sorted = [...corrections].sort((a, b) => {
    const lenDiff = b.heard_phrase.length - a.heard_phrase.length;
    if (lenDiff !== 0) return lenDiff;
    return b.count - a.count;
  });
  const valid = sorted.filter((c) => c.heard_phrase);
  if (valid.length === 0) return text;
  const map = new Map<string, string>();
  for (const c of valid) {
    const k = c.heard_phrase.toLowerCase();
    if (!map.has(k)) map.set(k, c.corrected_phrase);
  }
  // Single pass so a replacement is never re-matched by a shorter phrase.
  const re = new RegExp(
    `(?<![\\w'’])(${valid.map((c) => escapeRegex(c.heard_phrase)).join("|")})(?![\\w'’])`,
    "gi"
  );
  return text.replace(re, (m) => map.get(m.toLowerCase()) ?? m);
}

/**
 * Diff what the mic produced against what the user actually saved and extract
 * learned phrase mappings. Word-level LCS alignment; conservative — only short
 * replaced runs (1–4 words each side) are recorded.
 */
export function extractCorrections(
  micText: string,
  editedText: string
): Array<{ heard: string; corrected: string }> {
  if (!micText || !editedText) return [];
  const mic = tokenizeWords(micText);
  const edit = tokenizeWords(editedText);
  const micN = mic.map(normToken);
  const editN = edit.map(normToken);

  // LCS table.
  const m = micN.length;
  const n = editN.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = micN[i] === editN[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk the LCS path, collecting unmatched runs between matches.
  const out: Array<{ heard: string; corrected: string }> = [];
  let i = 0;
  let j = 0;
  const flush = (mi: number, mj: number) => {
    const heardWords = mic.slice(mi, i);
    const correctedWords = edit.slice(mj, j);
    if (
      heardWords.length >= 1 &&
      heardWords.length <= 4 &&
      correctedWords.length >= 1 &&
      correctedWords.length <= 4
    ) {
      const heard = heardWords.join(" ");
      const corrected = correctedWords.join(" ");
      if (normToken(heard) && normToken(corrected) && !isTrivialCaseFix(heard, corrected)) {
        out.push({ heard, corrected });
      }
    }
  };
  let runMi = 0;
  let runMj = 0;
  while (i < m && j < n) {
    if (micN[i] === editN[j]) {
      flush(runMi, runMj);
      // Same word, different casing mid-sentence → personal name/brand.
      const heardW = mic[i].replace(/^[^\w'’]+|[^\w'’]+$/g, "");
      const corrW = edit[j].replace(/^[^\w'’]+|[^\w'’]+$/g, "");
      const sentenceStart = j === 0 || /[.!?]$/.test(edit[j - 1]);
      if (heardW && heardW !== corrW && !(sentenceStart && isTrivialCaseFix(heardW, corrW))) {
        out.push({ heard: heardW, corrected: corrW });
      }
      i++;
      j++;
      runMi = i;
      runMj = j;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  // Tail runs (end of either text).
  while (i < m && j >= n) i++;
  flush(runMi, runMj);
  return out;
}

// ---------- dictionary access ----------

let cache: SpeechCorrection[] | null = null;

export async function getSpeechCorrections(): Promise<SpeechCorrection[]> {
  if (cache) return cache;
  if (idbAvailable()) {
    try {
      cache = await idbGetAll();
      return cache;
    } catch {
      /* fall through to localStorage */
    }
  }
  cache = lsLoad();
  return cache;
}

/** Record (or reinforce) a learned correction. Returns true when newly learned. */
export async function recordSpeechCorrection(heard: string, corrected: string): Promise<boolean> {
  const key = heard.toLowerCase().trim();
  if (!key || !corrected.trim()) return false;
  const list = await getSpeechCorrections();
  const existing = list.find((c) => c.heard_phrase === key);
  if (existing) {
    // Only store the newest phrasing when it actually differs.
    if (existing.corrected_phrase === corrected) {
      existing.count += 1;
      existing.updated_at = new Date().toISOString();
      await persist(existing, false);
      return false;
    }
    existing.corrected_phrase = corrected;
    existing.count += 1;
    existing.updated_at = new Date().toISOString();
    await persist(existing, false);
    return false;
  }
  const entry: SpeechCorrection = {
    heard_phrase: key,
    corrected_phrase: corrected,
    count: 1,
    updated_at: new Date().toISOString(),
  };
  if (list.length >= MAX_ENTRIES) {
    // Drop the least-reinforced entries to make room.
    list.sort((a, b) => b.count - a.count);
    list.length = MAX_ENTRIES - 1;
  }
  list.push(entry);
  await persist(entry, true);
  return true;
}

async function persist(entry: SpeechCorrection, isNew: boolean) {
  cache = null; // invalidate so the next read sees the update
  if (idbAvailable()) {
    try {
      if (isNew && lsLoad().length > 0) {
        // Migrate any fallback data into IndexedDB once it works.
        for (const old of lsLoad()) {
          try {
            await idbPut(old);
          } catch {
            /* ignore */
          }
        }
        try {
          localStorage.removeItem(LS_KEY);
        } catch {
          /* ignore */
        }
      }
      await idbPut(entry);
      return;
    } catch {
      /* fall through */
    }
  }
  const list = lsLoad();
  const idx = list.findIndex((c) => c.heard_phrase === entry.heard_phrase);
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  lsSave(list);
}

/** Run the learned dictionary over a fresh transcript. */
export async function applySpeechCorrections(text: string): Promise<string> {
  if (!text) return text;
  const corrections = await getSpeechCorrections();
  if (!corrections.length) return text;
  return applyCorrectionsToText(text, corrections);
}

/** Forget everything the user taught (used by Settings data controls). */
export async function clearSpeechCorrections(): Promise<void> {
  cache = [];
  if (idbAvailable()) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const store = db.createObjectStore(STORE, { keyPath: "heard_phrase" });
            store.createIndex("count", "count");
          }
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).clear();
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

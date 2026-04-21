// Local on-device learning for QuickCapture auto-detection.
// Stores user corrections (text → chosen type) and uses them to bias future
// classification. 100% offline, no network calls, fully zero-cost.

export type EntryType = "note" | "task" | "diary" | "journal";

interface LearningRecord {
  text: string;          // original text user wrote
  predicted: EntryType;  // what AI/regex picked
  chosen: EntryType;     // what the user actually selected
  at: string;
}

interface KeywordWeights {
  // word → { type → score }
  [word: string]: Partial<Record<EntryType, number>>;
}

const RECORDS_KEY = "dailynova_quickcapture_corrections";
const WEIGHTS_KEY = "dailynova_quickcapture_keyword_weights";
const MAX_RECORDS = 200;
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","is","am","are","was","were","be","been","being",
  "i","you","he","she","it","we","they","me","my","your","his","her","our","their",
  "to","of","in","on","at","for","with","by","from","as","that","this","these","those",
  "do","does","did","have","has","had","can","could","will","would","should","may","might",
  "so","if","then","than","not","no","yes",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function loadRecords(): LearningRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadWeights(): KeywordWeights {
  try {
    const raw = localStorage.getItem(WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWeights(w: KeywordWeights) {
  try {
    localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

/** Save a correction; reinforce keywords toward `chosen`, weaken toward `predicted`. */
export function recordCorrection(text: string, predicted: EntryType, chosen: EntryType) {
  if (predicted === chosen) return;

  // Append to records (bounded)
  const records = loadRecords();
  records.push({ text: text.slice(0, 500), predicted, chosen, at: new Date().toISOString() });
  if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }

  // Update keyword weights
  const weights = loadWeights();
  const tokens = Array.from(new Set(tokenize(text)));
  for (const tok of tokens) {
    const entry = weights[tok] || {};
    entry[chosen] = (entry[chosen] || 0) + 1;
    entry[predicted] = Math.max(0, (entry[predicted] || 0) - 0.5);
    weights[tok] = entry;
  }
  saveWeights(weights);
}

/** Score each type based on learned keyword weights. Returns null if no learning yet. */
export function suggestFromLearning(text: string): EntryType | null {
  const weights = loadWeights();
  if (Object.keys(weights).length === 0) return null;

  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const scores: Record<EntryType, number> = { note: 0, task: 0, diary: 0, journal: 0 };
  let matched = 0;
  for (const tok of tokens) {
    const w = weights[tok];
    if (!w) continue;
    matched++;
    (Object.keys(w) as EntryType[]).forEach((t) => {
      scores[t] += w[t] || 0;
    });
  }

  // Need at least 2 keyword matches with a clear winner to override regex/AI
  if (matched < 2) return null;
  const sorted = (Object.entries(scores) as [EntryType, number][]).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] <= 0) return null;
  if (sorted[0][1] - sorted[1][1] < 1) return null;
  return sorted[0][0];
}

export function getCorrectionRecords(): LearningRecord[] {
  return loadRecords();
}

export function clearLearning() {
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(WEIGHTS_KEY);
  } catch {
    /* ignore */
  }
}

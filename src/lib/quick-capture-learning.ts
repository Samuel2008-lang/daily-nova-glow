// Local on-device learning for Quick Capture auto-detection.
// Stores user corrections (text → chosen type) and uses them to bias future
// classification. 100% offline, no network calls, fully zero-cost.

export type EntryType = "note" | "task" | "diary" | "journal" | "habit";

interface LearningRecord {
  text: string;          // original text user wrote
  predicted: EntryType;  // what local rules picked
  chosen: EntryType;     // what the user actually selected
  at: string;
}

interface KeywordWeights {
  // word → { type → score }
  [word: string]: Partial<Record<EntryType, number>>;
}

interface PhraseRule {
  text: string;
  chosen: EntryType;
  at: string;
}

const RECORDS_KEY = "dailynova_quickcapture_corrections";
const WEIGHTS_KEY = "dailynova_quickcapture_keyword_weights";
const PHRASE_RULES_KEY = "dailynova_quickcapture_phrase_rules";
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

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function loadPhraseRules(): PhraseRule[] {
  try {
    const raw = localStorage.getItem(PHRASE_RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a correction; reinforce keywords toward `chosen`, weaken toward `predicted`. */
export function recordCorrection(text: string, predicted: EntryType, chosen: EntryType) {
  if (predicted === chosen) return;
  const normalizedText = normalizeText(text).slice(0, 500);
  if (!normalizedText) return;

  // Append to records (bounded)
  const records = loadRecords();
  records.push({ text: text.slice(0, 500), predicted, chosen, at: new Date().toISOString() });
  if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS);
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }

  // Exact/near repeat memory so corrections work immediately on the same kind of prompt.
  const rules = loadPhraseRules().filter((r) => r.text !== normalizedText);
  rules.push({ text: normalizedText, chosen, at: new Date().toISOString() });
  if (rules.length > MAX_RECORDS) rules.splice(0, rules.length - MAX_RECORDS);
  try {
    localStorage.setItem(PHRASE_RULES_KEY, JSON.stringify(rules));
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
  const normalizedText = normalizeText(text);
  const phraseMatch = loadPhraseRules()
    .slice()
    .reverse()
    .find((r) => normalizedText === r.text || (normalizedText.length > 12 && (normalizedText.includes(r.text) || r.text.includes(normalizedText))));
  if (phraseMatch) return phraseMatch.chosen;

  const weights = loadWeights();
  if (Object.keys(weights).length === 0) return null;

  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const scores: Record<EntryType, number> = { note: 0, task: 0, diary: 0, journal: 0, habit: 0 };
  let matched = 0;
  for (const tok of tokens) {
    const w = weights[tok];
    if (!w) continue;
    matched++;
    (Object.keys(w) as EntryType[]).forEach((t) => {
      scores[t] += w[t] || 0;
    });
  }

  // A single strong learned keyword should be enough; otherwise require a clear winner.
  if (matched < 1) return null;
  const sorted = (Object.entries(scores) as [EntryType, number][]).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] <= 0) return null;
  if (sorted[0][1] < 1.5 && sorted[0][1] - sorted[1][1] < 1) return null;
  return sorted[0][0];
}

export function getCorrectionRecords(): LearningRecord[] {
  return loadRecords();
}

export function clearLearning() {
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(WEIGHTS_KEY);
    localStorage.removeItem(PHRASE_RULES_KEY);
  } catch {
    /* ignore */
  }
}

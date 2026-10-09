export interface Quote {
  text: string;
  author: string;
  category: string;
}

export const ALL_QUOTES_KEY = "daily-quotes-all";
export const QUOTES_DATE_KEY = "daily-quotes-date";
export const QUOTE_INDEX_KEY = "daily-quote-index";
export const QUOTE_DAILY_FETCHED_KEY = "daily-quotes-fetched-date";
export const QUOTE_STATE_EVENT = "dailynova:quote-state-changed";

export const fallbackQuotes: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Purpose" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "Courage" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "Perseverance" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", category: "Success" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James", category: "Purpose" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi", category: "Action" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "Action" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh", category: "Perseverance" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "Courage" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "Action" },
  { text: "Difficult roads often lead to beautiful destinations.", author: "Zig Ziglar", category: "Resilience" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin", category: "Habits" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman", category: "Hope" },
];

export function getTodayKey(date = new Date()): string {
  return date.toDateString();
}

export function getDailyFallbackQuote(date = new Date()): Quote {
  return fallbackQuotes[date.getDate() % fallbackQuotes.length];
}

export function getQuoteAtIndex(quotes: Quote[], index: number): Quote | null {
  if (quotes.length === 0) return null;
  const safeIndex = Math.max(0, Math.min(Number.isFinite(index) ? Math.trunc(index) : 0, quotes.length - 1));
  return quotes[safeIndex] ?? null;
}

export function appendSingleBonusQuote(quotes: Quote[], bonus: Quote): Quote[] {
  return [...quotes, bonus];
}

export function saveQuoteState(quotes: Quote[], index: number): void {
  if (typeof window === "undefined") return;
  const safeIndex = quotes.length === 0 ? 0 : Math.max(0, Math.min(Math.trunc(index), quotes.length - 1));
  window.localStorage.setItem(ALL_QUOTES_KEY, JSON.stringify(quotes));
  window.localStorage.setItem(QUOTES_DATE_KEY, getTodayKey());
  window.localStorage.setItem(QUOTE_INDEX_KEY, String(safeIndex));
  window.dispatchEvent(new Event(QUOTE_STATE_EVENT));
}

export function readActiveQuote(): Quote {
  if (typeof window === "undefined") return getDailyFallbackQuote();
  try {
    if (window.localStorage.getItem(QUOTES_DATE_KEY) === getTodayKey()) {
      const stored = window.localStorage.getItem(ALL_QUOTES_KEY);
      const index = Number.parseInt(window.localStorage.getItem(QUOTE_INDEX_KEY) || "0", 10);
      if (stored) {
        const quotes = JSON.parse(stored) as Quote[];
        const activeQuote = Array.isArray(quotes) ? getQuoteAtIndex(quotes, index) : null;
        if (activeQuote?.text) return { ...activeQuote, category: activeQuote.category || "Inspiration" };
      }
    }
  } catch {
    // Fall back to the same date-based quote used by the Quotes page.
  }
  return getDailyFallbackQuote();
}
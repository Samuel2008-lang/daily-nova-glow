// Expressive on-device formatter for voice transcription.
// 100% offline. Keeps the user's exact wording — never rephrases — while:
//  1) turning spoken punctuation into symbols (period, comma, question mark…)
//  2) honoring spoken layout commands (new line, new paragraph)
//  3) preserving interjections and contractions exactly as spoken
//  4) applying clean sentence capitalization
//  5) fixing spacing and boundaries

export function formatVoiceText(input: string): string {
  if (!input) return input;
  let t = input.trim();
  if (!t) return t;

  // Step 1 — spoken punctuation → symbols (word-boundary safe).
  t = t.replace(/\b(full stop|period)\b/gi, ".");
  t = t.replace(/\bcomma\b/gi, ",");
  t = t.replace(/\bquestion mark\b/gi, "?");
  t = t.replace(/\bexclamation (mark|point)\b/gi, "!");
  t = t.replace(/\bcolon\b/gi, ":");
  t = t.replace(/\bsemicolon\b/gi, ";");

  // Step 2 — spoken layout commands → line breaks.
  t = t.replace(/\bnew paragraph\b/gi, "\n\n");
  t = t.replace(/\b(new line|next line)\b/gi, "\n");

  // Step 5a — spacing/boundary cleanup (keep intentional line breaks).
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\s+([,.!?;:])/g, "$1");
  t = t.replace(/([,.!?;:])(?=[^\s\n])/g, "$1 ");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  // Step 4 — sentence capitalization (paragraph starts + after . ? !).
  t = t.replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_m, pre, ch) => pre + ch.toUpperCase());
  t = t.replace(/\bi\b/g, "I");
  t = t.replace(/\bi'(m|ve|ll|d|re)\b/gi, (_m, suf) => "I'" + suf.toLowerCase());

  // Close a sentence before a spoken paragraph break.
  t = t.replace(/([A-Za-z0-9])\n\n/g, "$1.\n\n");

  // Step 5b — end punctuation: close bare sentences, never duplicate.
  if (/[A-Za-z0-9]$/.test(t)) t += ".";

  return t;
}

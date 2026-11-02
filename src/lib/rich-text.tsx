import { Fragment, type ReactNode } from "react";

/**
 * Lightweight, fully offline rich-text layer for reminder/task memos.
 * Memos are stored as plain text with markdown-ish markers so they stay
 * searchable, notification-friendly and safe (no HTML is ever rendered).
 *
 * Supported: **bold**, _italic_, ~~strike~~, `- ` bullets, `1. ` numbers, `# ` heading.
 */

const INLINE = /(\*\*[^*\n]+\*\*|~~[^~\n]+~~|(?<!\w)_(?!\s)[^_\n]+?(?<!\s)_(?!\w))/g;

const renderInline = (text: string, keyPrefix: string): ReactNode[] =>
  text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <s key={key} className="opacity-70">{part.slice(2, -2)}</s>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return <Fragment key={key}>{part}</Fragment>;
  });

export const RichText = ({ text, className = "" }: { text: string; className?: string }) => {
  const lines = (text || "").split("\n");
  return (
    <div className={className}>
      {lines.map((line, i) => {
        if (line.startsWith("# ")) {
          return <p key={i} className="text-base font-bold leading-snug">{renderInline(line.slice(2), `h${i}`)}</p>;
        }
        if (/^[-*]\s+/.test(line)) {
          return (
            <p key={i} className="flex gap-2 leading-snug">
              <span className="text-primary">•</span>
              <span>{renderInline(line.replace(/^[-*]\s+/, ""), `b${i}`)}</span>
            </p>
          );
        }
        const numbered = line.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) {
          return (
            <p key={i} className="flex gap-2 leading-snug">
              <span className="text-primary tabular-nums">{numbered[1]}.</span>
              <span>{renderInline(numbered[2], `n${i}`)}</span>
            </p>
          );
        }
        if (!line.trim()) return <p key={i} className="h-2" />;
        return <p key={i} className="leading-snug">{renderInline(line, `p${i}`)}</p>;
      })}
    </div>
  );
};

/** Strip markers for notification bodies, cards previews and search. */
export const plainText = (text: string) =>
  (text || "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/~~([^~\n]+)~~/g, "$1")
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")
    .replace(/^#\s+/gm, "")
    .replace(/^[-*]\s+/gm, "• ");

export type RichAction = "bold" | "italic" | "strike" | "bullet" | "number" | "heading";

/** Apply a formatting action to a textarea selection; returns new text + caret. */
export const applyRichAction = (
  value: string,
  selStart: number,
  selEnd: number,
  action: RichAction
): { text: string; start: number; end: number } => {
  const start = Math.min(selStart, selEnd);
  const end = Math.max(selStart, selEnd);

  const unwrapAround = (marker: string) => {
    const len = marker.length;
    // Markers sit just outside the selection: **|sel|**
    if (value.slice(start - len, start) === marker && value.slice(end, end + len) === marker) {
      const text = value.slice(0, start - len) + value.slice(start, end) + value.slice(end + len);
      return { text, start: start - len, end: end - len };
    }
    // Markers are inside the selection: |**sel**|
    if (value.slice(start, start + len) === marker && value.slice(end - len, end) === marker) {
      const text = value.slice(0, start) + value.slice(start + len, end - len) + value.slice(end);
      return { text, start, end: end - 2 * len };
    }
    return null;
  };

  const wrap = (marker: string) => {
    const existing = unwrapAround(marker);
    if (existing) return existing;
    const selected = value.slice(start, end);
    const text = value.slice(0, start) + marker + selected + marker + value.slice(end);
    return { text, start: start + marker.length, end: start + marker.length + selected.length };
  };

  const prefixLines = (make: (i: number) => string) => {
    const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
    const lineEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const allPrefixed = lines.every((l) => /^(\d+\.\s|[-*]\s|#\s)/.test(l));
    const next = lines
      .map((l, i) => (allPrefixed ? l.replace(/^(\d+\.\s|[-*]\s|#\s)/, "") : make(i) + l))
      .join("\n");
    const text = value.slice(0, lineStart) + next + value.slice(lineEnd);
    return { text, start: lineStart, end: lineStart + next.length };
  };

  switch (action) {
    case "bold": return wrap("**");
    case "italic": return wrap("_");
    case "strike": return wrap("~~");
    case "bullet": return prefixLines(() => "- ");
    case "number": return prefixLines((i) => `${i + 1}. `);
    case "heading": return prefixLines(() => "# ");
  }
};

/**
 * Pressing Enter inside a list continues it: "1. item" + Enter → "2. " on the
 * next line; "- item" + Enter → "- ". Pressing Enter on an empty list line
 * exits the list (removes the dangling prefix). Returns null for plain text.
 */
export const continueListOnEnter = (
  value: string,
  selStart: number,
  selEnd: number
): { text: string; caret: number } | null => {
  const start = Math.min(selStart, selEnd);
  const end = Math.max(selStart, selEnd);
  // Drop any selected text first, like a normal editor would.
  const base = end > start ? value.slice(0, start) + value.slice(end) : value;
  const lineStart = base.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
  const line = base.slice(lineStart, start);

  const num = line.match(/^(\s*)(\d+)\.(\s*)(.*)$/);
  if (num) {
    if (!num[4].trim()) {
      // Empty numbered line: exit the list.
      const text = base.slice(0, lineStart) + base.slice(start);
      return { text, caret: lineStart };
    }
    const next = `${num[1]}${Number(num[2]) + 1}. `;
    const text = base.slice(0, start) + "\n" + next + base.slice(start);
    return { text, caret: start + 1 + next.length };
  }

  const bullet = line.match(/^(\s*)([-*])(\s*)(.*)$/);
  if (bullet) {
    if (!bullet[4].trim()) {
      const text = base.slice(0, lineStart) + base.slice(start);
      return { text, caret: lineStart };
    }
    const next = `${bullet[1]}${bullet[2]} `;
    const text = base.slice(0, start) + "\n" + next + base.slice(start);
    return { text, caret: start + 1 + next.length };
  }

  return null;
};

/** Which formatting actions are active at the current caret/selection. */
export const activeRichActions = (value: string, selStart: number, selEnd: number): RichAction[] => {
  const start = Math.min(selStart, selEnd);
  const end = Math.max(selStart, selEnd);
  const lineStart = value.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
  const currentLine = value.slice(lineStart, value.indexOf("\n", lineStart) === -1 ? value.length : value.indexOf("\n", lineStart));
  const active: RichAction[] = [];
  if (value.slice(start - 2, start) === "**" && value.slice(end, end + 2) === "**") active.push("bold");
  if (value.slice(start - 1, start) === "_" && value.slice(end, end + 1) === "_" && end > start) active.push("italic");
  if (value.slice(start - 2, start) === "~~" && value.slice(end, end + 2) === "~~") active.push("strike");
  if (currentLine.startsWith("# ")) active.push("heading");
  if (/^[-*]\s/.test(currentLine)) active.push("bullet");
  if (/^\d+\.\s/.test(currentLine)) active.push("number");
  return active;
};

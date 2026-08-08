import { Fragment, type ReactNode } from "react";

/**
 * Lightweight, fully offline rich-text layer for reminder memos.
 * Memos are stored as plain text with markdown-ish markers so they stay
 * searchable, notification-friendly and safe (no HTML is ever rendered).
 *
 * Supported: **bold**, _italic_, ~~strike~~, `- ` bullets, `1. ` numbers, `# ` heading.
 */

const INLINE = /(\*\*[^*\n]+\*\*|_[^_\n]+_|~~[^~\n]+~~)/g;

const renderInline = (text: string, keyPrefix: string): ReactNode[] =>
  text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <s key={key} className="opacity-70">{part.slice(2, -2)}</s>;
    if (part.startsWith("_") && part.endsWith("_")) return <em key={key}>{part.slice(1, -1)}</em>;
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
    .replace(/_([^_\n]+)_/g, "$1")
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
  const wrap = (marker: string) => {
    const selected = value.slice(selStart, selEnd) || "text";
    const already = value.slice(selStart - marker.length, selStart) === marker &&
      value.slice(selEnd, selEnd + marker.length) === marker;
    if (already) {
      const text = value.slice(0, selStart - marker.length) + selected + value.slice(selEnd + marker.length);
      return { text, start: selStart - marker.length, end: selEnd - marker.length };
    }
    const text = value.slice(0, selStart) + marker + selected + marker + value.slice(selEnd);
    return { text, start: selStart + marker.length, end: selStart + marker.length + selected.length };
  };

  const prefixLines = (make: (i: number) => string) => {
    const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
    const lineEnd = value.indexOf("\n", selEnd) === -1 ? value.length : value.indexOf("\n", selEnd);
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

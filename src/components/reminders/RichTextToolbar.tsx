import { Bold, Italic, Strikethrough, List, ListOrdered, Heading } from "lucide-react";
import { applyRichAction, activeRichActions, type RichAction } from "@/lib/rich-text";
import { haptics } from "@/lib/haptics";

interface Props {
  targetRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
  caret?: [number, number];
  onCaretChange?: (start: number, end: number) => void;
}

const ACTIONS: { id: RichAction; icon: typeof Bold; label: string }[] = [
  { id: "bold", icon: Bold, label: "Bold" },
  { id: "italic", icon: Italic, label: "Italic" },
  { id: "strike", icon: Strikethrough, label: "Strikethrough" },
  { id: "heading", icon: Heading, label: "Heading" },
  { id: "bullet", icon: List, label: "Bullet list" },
  { id: "number", icon: ListOrdered, label: "Numbered list" },
];

const RichTextToolbar = ({ targetRef, value, onChange, caret, onCaretChange }: Props) => {
  const currentCaret = (): [number, number] => {
    const el = targetRef.current;
    if (caret) return caret;
    if (el) return [el.selectionStart ?? 0, el.selectionEnd ?? 0];
    return [value.length, value.length];
  };

  const run = (action: RichAction) => {
    haptics.light();
    const [start, end] = currentCaret();
    const res = applyRichAction(value, start, end, action);
    onChange(res.text);
    onCaretChange?.(res.start, res.end);
    requestAnimationFrame(() => {
      const el = targetRef.current;
      el?.focus();
      el?.setSelectionRange(res.start, res.end);
    });
  };

  const active = activeRichActions(value, ...currentCaret());

  return (
    <div className="flex items-center gap-1 mt-2 rounded-lg border border-border/40 p-1 w-fit">
      {ACTIONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          aria-pressed={active.includes(id)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(id)}
          className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
            active.includes(id)
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          }`}
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

export default RichTextToolbar;

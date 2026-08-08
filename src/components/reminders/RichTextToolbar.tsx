import { Bold, Italic, Strikethrough, List, ListOrdered, Heading } from "lucide-react";
import { applyRichAction, type RichAction } from "@/lib/rich-text";
import { haptics } from "@/lib/haptics";

interface Props {
  targetRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

const ACTIONS: { id: RichAction; icon: typeof Bold; label: string }[] = [
  { id: "bold", icon: Bold, label: "Bold" },
  { id: "italic", icon: Italic, label: "Italic" },
  { id: "strike", icon: Strikethrough, label: "Strikethrough" },
  { id: "heading", icon: Heading, label: "Heading" },
  { id: "bullet", icon: List, label: "Bullet list" },
  { id: "number", icon: ListOrdered, label: "Numbered list" },
];

const RichTextToolbar = ({ targetRef, value, onChange }: Props) => {
  const run = (action: RichAction) => {
    haptics.light();
    const el = targetRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const res = applyRichAction(value, start, end, action);
    onChange(res.text);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(res.start, res.end);
    });
  };

  return (
    <div className="flex items-center gap-1 mt-2 rounded-lg border border-border/40 p-1 w-fit">
      {ACTIONS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(id)}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
};

export default RichTextToolbar;

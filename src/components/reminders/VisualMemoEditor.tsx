import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Strikethrough, Heading, List, ListOrdered, Minus, CaseLower, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import { markdownToHtml, htmlToMarkdown, type ListStyle } from "@/lib/rich-text-html";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const LIST_OPTIONS: { style: ListStyle; label: string; sample: string; icon: typeof List }[] = [
  { style: "disc", label: "Dots", sample: "•", icon: List },
  { style: "decimal", label: "Numbers", sample: "1.", icon: ListOrdered },
  { style: "alpha", label: "Letters", sample: "a.", icon: CaseLower },
  { style: "dash", label: "Dashes", sample: "–", icon: Minus },
];

/** Live formatting editor: what you see is what is saved. No symbols, no preview. */
const VisualMemoEditor = ({ value, onChange, placeholder, autoFocus, className = "" }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [listOpen, setListOpen] = useState(false);
  const { toast } = useToast();

  // Sync external changes (initial load, voice input) into the editor.
  useEffect(() => {
    if (!ref.current || value === lastEmitted.current) return;
    ref.current.innerHTML = markdownToHtml(value);
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const emit = () => {
    if (!ref.current) return;
    const md = htmlToMarkdown(ref.current);
    lastEmitted.current = md;
    onChange(md);
  };

  const inEditor = (node: Node | null) => !!node && !!ref.current?.contains(node);

  const refreshActive = () => {
    const sel = window.getSelection();
    if (!sel || !inEditor(sel.anchorNode)) return;
    savedRange.current = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    const block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    setActive({
      bold: document.queryCommandState("bold") && !/h\d/.test(block),
      italic: document.queryCommandState("italic"),
      strike: document.queryCommandState("strikeThrough"),
      heading: /h\d/.test(block),
      list: document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList"),
    });
  };

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  });

  const restoreSelection = () => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    return sel;
  };

  const needSelection = () => {
    const sel = restoreSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      haptics.light();
      toast({ title: "Highlight some text first", description: "Select the words you want to format, then tap the button." });
      return true;
    }
    return false;
  };

  const inline = (cmd: "bold" | "italic" | "strikeThrough") => {
    if (needSelection()) return;
    haptics.light();
    document.execCommand(cmd);
    emit();
    refreshActive();
  };

  const heading = () => {
    if (needSelection()) return;
    haptics.light();
    const block = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    document.execCommand("formatBlock", false, /h\d/.test(block) ? "div" : "h3");
    emit();
    refreshActive();
  };

  const applyList = (style: ListStyle | "none") => {
    setListOpen(false);
    const sel = restoreSelection();
    if (!sel) return;
    haptics.light();
    const ordered = style === "decimal" || style === "alpha";
    const findList = () => {
      let n: Node | null = sel.anchorNode;
      while (n && n !== ref.current) {
        if (n.nodeName === "UL" || n.nodeName === "OL") return n as HTMLElement;
        n = n.parentNode;
      }
      return null;
    };
    let list = findList();
    const wantTag = ordered ? "OL" : "UL";
    const removeCurrent = () => {
      if (!list) return;
      document.execCommand(list.nodeName === "OL" ? "insertOrderedList" : "insertUnorderedList");
    };
    if (style === "none") {
      removeCurrent();
    } else if (list && list.nodeName === wantTag && list.dataset.style === style) {
      // Same style tapped again: remove the list for these lines.
      removeCurrent();
    } else {
      // Different style: take these lines out of the old list, then start a new one,
      // so other lines keep their own bullet style.
      if (list) removeCurrent();
      document.execCommand(ordered ? "insertOrderedList" : "insertUnorderedList");
      list = findList();
      if (list) list.dataset.style = style;
    }
    emit();
    refreshActive();
  };

  /** Turn the current list item into a normal line (stops the bullets). */
  const exitListItem = (li: HTMLElement) => {
    const list = li.parentElement!;
    const div = document.createElement("div");
    div.innerHTML = li.innerHTML.trim() ? li.innerHTML : "<br>";
    const after = Array.from(list.children).slice(Array.from(list.children).indexOf(li) + 1);
    if (after.length) {
      const tail = list.cloneNode(false) as HTMLElement;
      after.forEach((n) => tail.appendChild(n));
      list.after(tail);
    }
    list.after(div);
    li.remove();
    if (!list.children.length) list.remove();
    const r = document.createRange();
    r.setStart(div, 0);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    emit();
    refreshActive();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== "Backspace") return;
    if (e.shiftKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed) return;
    let n: Node | null = sel.anchorNode;
    while (n && n !== ref.current && n.nodeName !== "LI") n = n.parentNode;
    if (!n || n.nodeName !== "LI") return;
    const li = n as HTMLElement;
    const empty = !(li.textContent || "").replace(/\u00a0/g, "").trim();
    if (e.key === "Enter" && empty) {
      e.preventDefault();
      exitListItem(li);
    } else if (e.key === "Backspace") {
      const r = sel.getRangeAt(0).cloneRange();
      r.selectNodeContents(li);
      r.setEnd(sel.anchorNode!, sel.anchorOffset);
      if (!r.toString().length) {
        e.preventDefault();
        exitListItem(li);
      }
    }
  };

  const btn = (on: boolean | undefined) =>
    `h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${on ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`;
  const keep = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onKeyDown={onKeyDown}
        onKeyUp={refreshActive}
        onMouseUp={refreshActive}
        onTouchEnd={refreshActive}
        className={`memo-editor min-h-[110px] text-lg leading-relaxed rounded-md border border-border/40 bg-background px-3 py-2 pr-12 outline-none ${className}`}
      />
      <div className="mt-2 inline-flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
        <button type="button" aria-label="Bold" className={btn(active.bold)} onMouseDown={keep} onClick={() => inline("bold")}><Bold className="w-4 h-4" /></button>
        <button type="button" aria-label="Italic" className={btn(active.italic)} onMouseDown={keep} onClick={() => inline("italic")}><Italic className="w-4 h-4" /></button>
        <button type="button" aria-label="Strikethrough" className={btn(active.strike)} onMouseDown={keep} onClick={() => inline("strikeThrough")}><Strikethrough className="w-4 h-4" /></button>
        <button type="button" aria-label="Heading" className={btn(active.heading)} onMouseDown={keep} onClick={heading}><Heading className="w-4 h-4" /></button>
        <Popover open={listOpen} onOpenChange={setListOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="List style" className={`${btn(active.list)} w-auto px-2 gap-0.5`} onMouseDown={keep}>
              <List className="w-4 h-4" /><ChevronDown className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
            {LIST_OPTIONS.map((o) => (
              <button
                key={o.style}
                type="button"
                onMouseDown={keep}
                onClick={() => applyList(o.style)}
                className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span className="w-5 text-primary font-semibold text-center">{o.sample}</span>
                <span>{o.label}</span>
              </button>
            ))}
            <button
              type="button"
              onMouseDown={keep}
              onClick={() => applyList("none")}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 border-t border-border/40 mt-1"
            >
              <span className="w-5 text-center">✕</span>
              <span>No list</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default VisualMemoEditor;

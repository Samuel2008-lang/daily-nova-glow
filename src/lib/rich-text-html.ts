/**
 * Converts between the stored memo format (plain text with light markers)
 * and the HTML shown live in the visual editor. Users never see the markers.
 */
export type ListStyle = "disc" | "decimal" | "alpha" | "dash";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inlineToHtml = (s: string) =>
  esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/~~([^~\n]+)~~/g, "<s>$1</s>")
    .replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?!\w)/g, "$1<i>$2</i>");

const lineList = (line: string): { style: ListStyle; text: string } | null => {
  let m = line.match(/^\d+\.\s+(.*)$/);
  if (m) return { style: "decimal", text: m[1] };
  m = line.match(/^[a-z]\.\s+(.*)$/);
  if (m) return { style: "alpha", text: m[1] };
  m = line.match(/^–\s+(.*)$/);
  if (m) return { style: "dash", text: m[1] };
  m = line.match(/^[-*]\s+(.*)$/);
  if (m) return { style: "disc", text: m[1] };
  return null;
};

export const markdownToHtml = (md: string): string => {
  const lines = (md || "").split("\n");
  let html = "";
  let open: ListStyle | null = null;
  const close = () => {
    if (open) html += open === "decimal" || open === "alpha" ? "</ol>" : "</ul>";
    open = null;
  };
  for (const line of lines) {
    const li = lineList(line);
    if (li) {
      if (open !== li.style) {
        close();
        const tag = li.style === "decimal" || li.style === "alpha" ? "ol" : "ul";
        html += `<${tag} data-style="${li.style}">`;
        open = li.style;
      }
      html += `<li>${inlineToHtml(li.text) || "<br>"}</li>`;
      continue;
    }
    close();
    if (line.startsWith("# ")) html += `<h3>${inlineToHtml(line.slice(2)) || "<br>"}</h3>`;
    else html += `<div>${inlineToHtml(line) || "<br>"}</div>`;
  }
  close();
  return html;
};

const inlineFromNode = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "").replace(/\u00a0/g, " ");
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "";
  const inner = Array.from(node.childNodes).map(inlineFromNode).join("");
  if (!inner.trim()) return inner;
  const st = node.style;
  let out = inner;
  const tag = node.tagName;
  if (tag === "S" || tag === "STRIKE" || tag === "DEL" || st.textDecoration.includes("line-through")) out = `~~${out}~~`;
  if (tag === "I" || tag === "EM" || st.fontStyle === "italic") out = `_${out}_`;
  if (tag === "B" || tag === "STRONG" || st.fontWeight === "bold" || Number(st.fontWeight) >= 600) out = `**${out}**`;
  return out;
};

const BLOCK = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI"]);

export const htmlToMarkdown = (root: HTMLElement): string => {
  const lines: string[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) lines.push(buffer);
    buffer = "";
  };
  const walk = (el: Node) => {
    for (const child of Array.from(el.childNodes)) {
      if (child instanceof HTMLElement && BLOCK.has(child.tagName)) {
        flush();
        if (child.tagName === "UL" || child.tagName === "OL") {
          const style = (child.dataset.style as ListStyle) || (child.tagName === "OL" ? "decimal" : "disc");
          Array.from(child.children).forEach((li, i) => {
            const text = inlineFromNode(li).trim();
            const prefix =
              style === "decimal" ? `${i + 1}. ` : style === "alpha" ? `${String.fromCharCode(97 + (i % 26))}. ` : style === "dash" ? "– " : "- ";
            lines.push(prefix + text);
          });
        } else if (/^H\d$/.test(child.tagName)) {
          const t = Array.from(child.childNodes).map(inlineFromNode).join("").replace(/\*\*/g, "");
          lines.push(t.trim() ? `# ${t}` : "");
        } else if (Array.from(child.childNodes).some((n) => n instanceof HTMLElement && BLOCK.has(n.tagName))) {
          walk(child);
        } else {
          lines.push(Array.from(child.childNodes).map(inlineFromNode).join(""));
        }
      } else if (child instanceof HTMLElement && child.tagName === "BR") {
        lines.push(buffer);
        buffer = "";
      } else {
        buffer += inlineFromNode(child);
      }
    }
    flush();
  };
  walk(root);
  return lines.join("\n").replace(/\n+$/, "");
};

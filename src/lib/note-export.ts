import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

export type NoteExportFormat = "pdf" | "text" | "image";

export interface NoteExportData {
  topic: string;
  content: string;
  dateLabel: string;
  fileBaseName: string;
}

const safeName = (name: string) => (name || "note").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "note";
const textContent = (note: NoteExportData) => `${note.topic}\n\nDate: ${note.dateLabel}\n\n${note.content}`;
const isShareCancel = (err: unknown) => {
  const e = err as { name?: string; message?: string };
  return e?.name === "AbortError" || /cancel/i.test(e?.message || "");
};

const blobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const makeTextBlob = (note: NoteExportData) => new Blob([textContent(note)], { type: "text/plain;charset=utf-8" });

const makePdfBlob = (note: NoteExportData) => {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = textContent(note).split(/\n/).flatMap((line) => {
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += 74) chunks.push(line.slice(i, i + 74));
    return chunks.length ? chunks : [""];
  }).slice(0, 46);
  // 50pt top padding (y=730 on a 792pt page) so the title is never cut off;
  // 46 lines * 15pt leading = 690pt, which fits within the page.
  const stream = [`BT`, `/F1 16 Tf`, `50 730 Td`, `15 TL`, ...lines.map((l) => `(${esc(l)}) Tj T*`), `ET`].join("\n");
  const objects = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) { offsets.push(pdf.length); pdf += obj + "\n"; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `).join("\n") + `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
};

const makeImageBlob = async (note: NoteExportData): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = "#ff69b4"; ctx.lineWidth = 5; ctx.strokeRect(54, 54, 972, 1242);
  ctx.fillStyle = "#f8fbff"; ctx.font = "700 58px Arial"; ctx.textAlign = "left";
  ctx.fillText(note.topic || "Note", 110, 150);
  ctx.fillStyle = "#ff9acb"; ctx.font = "28px Arial"; ctx.fillText(note.dateLabel, 110, 205);
  ctx.fillStyle = "#eef6ff"; ctx.font = "38px Arial";
  const words = note.content.split(/\s+/); let line = ""; let y = 300;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > 860) { ctx.fillText(line, 110, y); line = word; y += 58; if (y > 1170) break; } else line = test;
  }
  if (line && y <= 1170) ctx.fillText(line, 110, y);
  ctx.fillStyle = "#ff69b4"; ctx.font = "700 30px Arial"; ctx.textAlign = "center"; ctx.fillText("Daily Nova", 540, 1240);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/png"));
};

const blobFor = async (note: NoteExportData, format: NoteExportFormat) => format === "pdf" ? makePdfBlob(note) : format === "image" ? makeImageBlob(note) : makeTextBlob(note);
const extFor = (format: NoteExportFormat) => format === "pdf" ? "pdf" : format === "image" ? "png" : "txt";

export const saveNoteFile = async (note: NoteExportData, format: NoteExportFormat) => {
  const blob = await blobFor(note, format);
  const ext = extFor(format);
  const name = `${safeName(note.fileBaseName)}.${ext}`;
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({ path: name, data, directory: Directory.Documents });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

export const shareNoteFile = async (note: NoteExportData, format: NoteExportFormat) => {
  const blob = await blobFor(note, format);
  const ext = extFor(format);
  const name = `${safeName(note.fileBaseName)}.${ext}`;
  try {
    if (Capacitor.isNativePlatform()) {
      const data = await blobToBase64(blob);
      await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
      const uri = await Filesystem.getUri({ path: name, directory: Directory.Cache });
      await Share.share({ title: note.topic, url: uri.uri, dialogTitle: "Share Note" });
      return "shared";
    }
    const file = new File([blob], name, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: note.topic, files: [file] });
      return "shared";
    }
    if (format === "text" && navigator.share) {
      await navigator.share({ title: note.topic, text: textContent(note) });
      return "shared";
    }
    await navigator.clipboard.writeText(textContent(note));
    return "copied";
  } catch (err) {
    if (isShareCancel(err)) return "cancelled";
    throw err;
  }
};
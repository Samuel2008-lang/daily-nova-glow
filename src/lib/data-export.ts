import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export type DataExportFormat = "pdf" | "text" | "json";

const safeName = (name: string) =>
  name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "dailynova-export";

const makePdf = (text: string) => {
  const escapePdf = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = text.split(/\r?\n/).flatMap((line) => {
    const chunks: string[] = [];
    for (let i = 0; i < line.length; i += 86) chunks.push(line.slice(i, i + 86));
    return chunks.length ? chunks : [""];
  }).slice(0, 46);
  const stream = ["BT", "/F1 12 Tf", "50 780 Td", "18 TL", ...lines.map((line) => `(${escapePdf(line)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  pdf += `\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
};

const writeOrDownload = async (blob: Blob, filename: string) => {
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    await Filesystem.writeFile({ path: filename, data, directory: Directory.Documents });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportData = async (data: unknown, format: DataExportFormat, baseName: string) => {
  const json = JSON.stringify(data, null, 2);
  const text = typeof data === "string" ? data : json;
  const blob = format === "pdf"
    ? makePdf(text)
    : new Blob([format === "json" ? json : text], { type: format === "json" ? "application/json" : "text/plain" });
  const extension = format === "pdf" ? "pdf" : format === "json" ? "json" : "txt";
  await writeOrDownload(blob, `${safeName(baseName)}.${extension}`);
};
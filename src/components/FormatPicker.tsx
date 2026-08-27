import { useEffect, useState } from "react";
import { FileText, FileType, Image as ImageIcon, Braces } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { haptics } from "@/lib/haptics";

export type ExportFormat = "pdf" | "text" | "image" | "json";

const META: Record<ExportFormat, { label: string; icon: typeof FileText }> = {
  pdf: { label: "PDF", icon: FileType },
  text: { label: "Plain Text", icon: FileText },
  image: { label: "Image", icon: ImageIcon },
  json: { label: "JSON", icon: Braces },
};

interface Request {
  title: string;
  formats: ExportFormat[];
  resolve: (value: ExportFormat | null) => void;
}

const EVENT = "dailynova:pick-format";

/**
 * Imperative, tappable format picker. Replaces window.prompt() everywhere.
 * Usage: const fmt = await pickFormat(["pdf","text","image"]);
 */
export const pickFormat = (
  formats: ExportFormat[] = ["pdf", "text", "image"],
  title = "Choose a format"
): Promise<ExportFormat | null> =>
  new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<Request>(EVENT, { detail: { title, formats, resolve } }));
  });

/** Mount once (in App). Renders the bottom sheet for any pickFormat() call. */
export const FormatPickerHost = () => {
  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    const onPick = (e: Event) => setReq((e as CustomEvent<Request>).detail);
    window.addEventListener(EVENT, onPick);
    return () => window.removeEventListener(EVENT, onPick);
  }, []);

  const close = (value: ExportFormat | null) => {
    req?.resolve(value);
    setReq(null);
  };

  return (
    <Sheet open={!!req} onOpenChange={(open) => { if (!open) close(null); }}>
      <SheetContent side="bottom" className="rounded-t-2xl z-[210]">
        <SheetHeader className="mb-4">
          <SheetTitle>{req?.title || "Choose a format"}</SheetTitle>
        </SheetHeader>
        <div className={`grid gap-3 pb-8 ${(req?.formats.length || 3) > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
          {(req?.formats || []).map((f) => {
            const { label, icon: Icon } = META[f];
            return (
              <Button
                key={f}
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => { haptics.light(); close(f); }}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm">{label}</span>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FormatPickerHost;

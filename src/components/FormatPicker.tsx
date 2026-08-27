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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  formats?: ExportFormat[];
  onSelect: (format: ExportFormat) => void;
}

/** Tappable bottom-sheet format picker — replaces text prompts everywhere. */
const FormatPicker = ({ open, onOpenChange, title = "Choose a format", formats = ["pdf", "text", "image"], onSelect }: Props) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="rounded-t-2xl z-[210]">
      <SheetHeader className="mb-4">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      <div className={`grid gap-3 pb-8 ${formats.length > 2 ? "grid-cols-3" : "grid-cols-2"}`}>
        {formats.map((f) => {
          const { label, icon: Icon } = META[f];
          return (
            <Button
              key={f}
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => {
                haptics.light();
                onOpenChange(false);
                onSelect(f);
              }}
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

export default FormatPicker;

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { reminderImages, StoredImage } from "@/lib/reminder-images";
import { Button } from "@/components/ui/button";
import ImageViewer from "./ImageViewer";

interface Props {
  ids: string[];
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  maxCount?: number;
  compact?: boolean;
}

const ImageStrip = ({ ids, onRemove, onAdd, maxCount = 10, compact = false }: Props) => {
  const [images, setImages] = useState<StoredImage[]>([]);
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    reminderImages.getMany(ids).then(setImages);
  }, [ids.join(",")]);

  if (!ids.length && !onAdd) return null;

  const size = compact ? "w-14 h-14" : "w-20 h-20";

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {images.map((img, idx) => (
          <div key={img.id} className={`relative ${size} shrink-0 rounded-lg overflow-hidden border border-border/40 group`}>
            <button
              type="button"
              onClick={() => setViewer(idx)}
              className="absolute inset-0"
              aria-label="Open image"
            >
              <img src={img.thumb} alt="attachment" className="w-full h-full object-cover" />
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 text-foreground flex items-center justify-center opacity-90"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {onAdd && ids.length < maxCount && (
          <Button
            type="button"
            variant="outline"
            onClick={onAdd}
            className={`${size} shrink-0 p-0 border-dashed border-border/60 flex items-center justify-center`}
            aria-label="Add image"
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}
      </div>
      {viewer !== null && images[viewer] && (
        <ImageViewer image={images[viewer]} onClose={() => setViewer(null)} />
      )}
    </>
  );
};

export default ImageStrip;

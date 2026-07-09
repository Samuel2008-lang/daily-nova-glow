import { X } from "lucide-react";
import { StoredImage } from "@/lib/reminder-images";
import { Button } from "@/components/ui/button";

interface Props { image: StoredImage; onClose: () => void }

const ImageViewer = ({ image, onClose }: Props) => (
  <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={onClose}>
    <Button
      size="icon"
      variant="ghost"
      className="absolute top-4 right-4 z-10"
      onClick={onClose}
      aria-label="Close"
    >
      <X className="w-6 h-6" />
    </Button>
    <img
      src={image.dataUrl}
      alt="attachment"
      className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg"
      onClick={(e) => e.stopPropagation()}
    />
  </div>
);

export default ImageViewer;

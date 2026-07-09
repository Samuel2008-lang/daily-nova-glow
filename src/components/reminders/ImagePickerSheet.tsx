import { Camera, Image as ImageIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { pickImages, StoredImage } from "@/lib/reminder-images";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPicked: (images: StoredImage[]) => void;
}

const ImagePickerSheet = ({ open, onOpenChange, onPicked }: Props) => {
  const handle = async (source: "camera" | "library") => {
    onOpenChange(false);
    const imgs = await pickImages(source);
    if (imgs.length) onPicked(imgs);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4"><SheetTitle>Add photo</SheetTitle></SheetHeader>
        <div className="grid grid-cols-2 gap-3 pb-6">
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handle("camera")}>
            <Camera className="w-6 h-6" />
            <span>Take photo</span>
          </Button>
          <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handle("library")}>
            <ImageIcon className="w-6 h-6" />
            <span>From gallery</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ImagePickerSheet;

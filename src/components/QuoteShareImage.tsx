import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

export const useQuoteShareImage = () => {
  const { toast } = useToast();

  const generateImage = useCallback(async (text: string, author: string): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const size = 1080;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Deep navy background (matches reference)
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#0a0d3d");
    grad.addColorStop(1, "#06083a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Purple border frame
    const PURPLE = "#8b5cf6";
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 4;
    const inset = 50;
    ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

    // Safe content padding so nothing crosses the border
    const PAD = 130;
    const contentWidth = size - PAD * 2;

    // Wrap quote text
    const fontSize = text.length > 180 ? 40 : text.length > 110 ? 48 : 56;
    ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > contentWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineHeight = fontSize * 1.4;
    const blockHeight = lines.length * lineHeight;
    const startY = (size - blockHeight) / 2 - 40;

    // Opening quote mark (top-left, well inside border)
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 110px Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("\u201C", PAD - 20, startY - 30);

    // Quote text (centered, white)
    ctx.fillStyle = "#f1f1ff";
    ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      const prefix = i === 0 ? "\u201C" : "";
      const suffix = i === lines.length - 1 ? "\u201D" : "";
      ctx.fillText(`${prefix}${l}${suffix}`, size / 2, startY + i * lineHeight + lineHeight / 2);
    });

    // Closing quote mark (right side, below text)
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 110px Georgia, serif`;
    ctx.textAlign = "right";
    ctx.fillText("\u201D", size - PAD + 20, startY + blockHeight + 20);

    // Author
    ctx.fillStyle = "#b794f4";
    ctx.font = `400 32px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`— ${author}`, size / 2, startY + blockHeight + 110);

    // Branding (well above bottom border)
    const brandY = size - PAD - 10;
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 32px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("\u2726  DailyNova  \u2726", size / 2, brandY);
    ctx.fillStyle = "rgba(183, 148, 244, 0.7)";
    ctx.font = `14px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("Your Daily Inspiration", size / 2, brandY + 28);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const shareAsImage = useCallback(async (text: string, author: string) => {
    const blob = await generateImage(text, author);
    if (!blob) {
      toast({ title: "Error", description: "Could not generate image.", variant: "destructive" });
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(blob);
        await Filesystem.writeFile({
          path: "quote.png",
          data: base64Data,
          directory: Directory.Cache,
        });
        const uriResult = await Filesystem.getUri({
          directory: Directory.Cache,
          path: "quote.png",
        });
        // Share image only — no text caption (the quote is already in the image)
        await Share.share({
          url: uriResult.uri,
          dialogTitle: "Share Quote",
        });
        return;
      } catch (err) {
        console.error("Native share error:", err);
        try {
          await Share.share({
            title: "Quote of the Day — DailyNova",
            dialogTitle: "Share Quote",
          });
          return;
        } catch (e) {
          console.error("Text share error:", e);
        }
      }
      return;
    }

    const file = new File([blob], "quote.png", { type: "image/png" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Quote of the Day — DailyNova", files: [file] });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: "Quote of the Day — DailyNova" });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }

    toast({ title: "Not supported", description: "Share is not available in this browser.", variant: "destructive" });
  }, [generateImage, toast]);

  return { shareAsImage };
};

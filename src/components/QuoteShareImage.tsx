import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";

export const useQuoteShareImage = () => {
  const { toast } = useToast();

  const generateImage = useCallback(async (text: string, author: string, category: string): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const size = 1080;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Reference background: solid deep navy blue (matches user's reference image).
    ctx.fillStyle = "#0a1141";
    ctx.fillRect(0, 0, size, size);

    // Single thin purple border, well inside the canvas
    const PURPLE = "#8b6dff";
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 3;
    const inset = 48;
    ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);

    // Safe content padding so nothing crosses the border
    const PAD = 130;
    const contentWidth = size - PAD * 2;

    // Wrap quote text
    const fontSize = text.length > 180 ? 42 : text.length > 110 ? 52 : 60;
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

    // Opening quote mark (top-left)
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 110px Georgia, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("\u201C", PAD - 10, startY - 20);

    // Quote text (centered, white)
    ctx.fillStyle = "#ffffff";
    ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      const prefix = i === 0 ? "\u201C" : "";
      const suffix = i === lines.length - 1 ? "\u201D" : "";
      ctx.fillText(`${prefix}${l}${suffix}`, size / 2, startY + i * lineHeight + lineHeight / 2);
    });

    // Closing quote mark (bottom-right of text)
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 110px Georgia, serif`;
    ctx.textAlign = "right";
    ctx.fillText("\u201D", size - PAD + 10, startY + blockHeight + 30);

    // Author with leading dash
    ctx.fillStyle = PURPLE;
    ctx.font = `400 36px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`— ${author}`, size / 2, startY + blockHeight + 120);

    const badgeText = category || "Inspiration";
    ctx.font = "500 24px 'Segoe UI', Arial, sans-serif";
    const badgeWidth = Math.min(ctx.measureText(badgeText).width + 44, contentWidth);
    const badgeX = (size - badgeWidth) / 2;
    const badgeY = startY + blockHeight + 150;
    ctx.fillStyle = "rgba(139, 109, 255, 0.18)";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, 42, 21);
    ctx.fill();
    ctx.strokeStyle = PURPLE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 24px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, size / 2, badgeY + 21, badgeWidth - 24);

    // Branding (well above bottom border)
    const brandY = size - PAD - 10;
    ctx.fillStyle = PURPLE;
    ctx.font = `bold 30px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("\u2726  DailyNova  \u2726", size / 2, brandY);
    ctx.fillStyle = "rgba(139, 109, 255, 0.7)";
    ctx.font = `14px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("Your Daily Inspiration", size / 2, brandY + 26);

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

  const shareAsImage = useCallback(async (text: string, author: string, category: string) => {
    const blob = await generateImage(text, author, category);
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

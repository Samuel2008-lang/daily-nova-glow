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

    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#1a1a2e");
    grad.addColorStop(1, "#16213e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle border glow
    ctx.strokeStyle = "rgba(255, 105, 180, 0.15)";
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, size - 80, size - 80);

    // Quote text
    ctx.fillStyle = "#f0f0f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = text.length > 150 ? 38 : text.length > 80 ? 46 : 54;
    ctx.font = `italic ${fontSize}px Georgia, serif`;

    const maxWidth = size - 160;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.4;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (size - totalTextHeight) / 2 - 40;

    ctx.font = `italic 100px Georgia, serif`;
    ctx.fillStyle = "rgba(255, 105, 180, 0.3)";
    ctx.fillText('"', 100, startY - 20);

    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.fillStyle = "#f0f0f0";
    lines.forEach((line, i) => {
      ctx.fillText(`${i === 0 ? '"' : ''}${line}${i === lines.length - 1 ? '"' : ''}`, size / 2, startY + i * lineHeight);
    });

    ctx.fillStyle = "#ff69b4";
    ctx.font = `bold 36px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(`— ${author}`, size / 2, startY + totalTextHeight + 50);

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.font = `16px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("DailyNova", size / 2, size - 60);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data:image/png;base64, prefix
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

    // Native Capacitor share path
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(blob);

        // Write image to cache directory
        await Filesystem.writeFile({
          path: "quote.png",
          data: base64Data,
          directory: Directory.Cache,
        });

        const uriResult = await Filesystem.getUri({
          directory: Directory.Cache,
          path: "quote.png",
        });

        await Share.share({
          title: "Quote of the Day — DailyNova",
          text: `"${text}" — ${author}`,
          url: uriResult.uri,
          dialogTitle: "Share Quote",
        });
        return;
      } catch (err) {
        console.error("Native share error:", err);
        // Fall through to text-only share
        try {
          await Share.share({
            title: "Quote of the Day — DailyNova",
            text: `"${text}" — ${author}\n\nShared from DailyNova`,
            dialogTitle: "Share Quote",
          });
          return;
        } catch (e) {
          console.error("Text share error:", e);
        }
      }
      return;
    }

    // Web: try navigator.share with file
    const file = new File([blob], "quote.png", { type: "image/png" });
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Quote of the Day — DailyNova", files: [file] });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }

    // Web: text-only share
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Quote of the Day — DailyNova",
          text: `"${text}" — ${author}\n\nShared from DailyNova`,
        });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }

    toast({ title: "Not supported", description: "Share is not available in this browser.", variant: "destructive" });
  }, [generateImage, toast]);

  return { shareAsImage };
};

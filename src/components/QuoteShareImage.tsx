import { useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface QuoteShareImageProps {
  text: string;
  author: string;
}

export const useQuoteShareImage = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // Quote text - white italic
    ctx.fillStyle = "#f0f0f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = text.length > 150 ? 38 : text.length > 80 ? 46 : 54;
    ctx.font = `italic ${fontSize}px Georgia, serif`;

    // Word wrap
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

    // Draw quote marks
    ctx.font = `italic 100px Georgia, serif`;
    ctx.fillStyle = "rgba(255, 105, 180, 0.3)";
    ctx.fillText('"', 100, startY - 20);

    // Draw text lines
    ctx.font = `italic ${fontSize}px Georgia, serif`;
    ctx.fillStyle = "#f0f0f0";
    lines.forEach((line, i) => {
      ctx.fillText(`${i === 0 ? '"' : ''}${line}${i === lines.length - 1 ? '"' : ''}`, size / 2, startY + i * lineHeight);
    });

    // Author - pink
    ctx.fillStyle = "#ff69b4";
    ctx.font = `bold 36px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(`— ${author}`, size / 2, startY + totalTextHeight + 50);

    // Watermark
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.font = `16px 'Segoe UI', Arial, sans-serif`;
    ctx.fillText("DailyNova", size / 2, size - 60);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, []);

  const shareAsImage = useCallback(async (text: string, author: string) => {
    const blob = await generateImage(text, author);
    if (!blob) {
      toast({ title: "Error", description: "Could not generate image.", variant: "destructive" });
      return;
    }

    const file = new File([blob], "quote.png", { type: "image/png" });

    // Try native share with image
    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Quote of the Day — DailyNova",
          files: [file],
        });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }

    // Try native share with text only
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

    // No share API available
    toast({ title: "Not supported", description: "Share is available in native app or standalone browser.", variant: "destructive" });
  }, [generateImage, toast]);

  return { shareAsImage };
};

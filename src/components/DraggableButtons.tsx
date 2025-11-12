import { useState, useRef, useEffect, ReactNode } from "react";

interface DraggableButtonsProps {
  children: ReactNode;
}

export const DraggableButtons = ({ children }: DraggableButtonsProps) => {
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 5; // px before we consider it a drag

  useEffect(() => {
    // Initialize position from localStorage or default
    const saved = localStorage.getItem("ai-button-position");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition({
          x: typeof parsed.x === "number" ? parsed.x : null,
          y: typeof parsed.y === "number" ? parsed.y : null,
        });
      } catch {}
    }
  }, []);

  const beginPointer = (clientX: number, clientY: number) => {
    const curX = position.x ?? 0;
    const curY = position.y ?? 0;
    setDragStart({ x: clientX - curX, y: clientY - curY });
    setHasMoved(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    beginPointer(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    beginPointer(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const curX = position.x ?? 0;
      const curY = position.y ?? 0;
      const dist = Math.hypot(newX - curX, newY - curY);

      if (!isDragging) {
        if (dist > THRESHOLD) setIsDragging(true);
        else return; // don't move until threshold is exceeded
      }

      setHasMoved(true);
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      const curX = position.x ?? 0;
      const curY = position.y ?? 0;
      const dist = Math.hypot(newX - curX, newY - curY);

      if (!isDragging) {
        if (dist > THRESHOLD) setIsDragging(true);
        else return;
      }

      setHasMoved(true);
      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        setTimeout(() => setHasMoved(false), 0); // reset so next click works
        localStorage.setItem(
          "ai-button-position",
          JSON.stringify({ x: position.x ?? 0, y: position.y ?? 0 })
        );
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragStart, position]);

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      setHasMoved(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 flex flex-col gap-2 items-end cursor-move select-none"
      style={{
        right: position.x == null ? "1rem" : undefined,
        bottom: position.y == null ? "5rem" : undefined,
        left: position.x == null ? undefined : `${position.x}px`,
        top: position.y == null ? undefined : `${position.y}px`,
        touchAction: "none",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
};

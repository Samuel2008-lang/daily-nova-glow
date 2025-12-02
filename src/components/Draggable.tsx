import { useState, useRef, useEffect, ReactNode } from "react";

interface DraggableProps {
  children: ReactNode;
  storageKey: string;
  defaultRight?: string;
  defaultBottom?: string;
}

export const Draggable: React.FC<DraggableProps> = ({
  children,
  storageKey,
  defaultRight = "1rem",
  defaultBottom = "5rem",
}) => {
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [pointerDown, setPointerDown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 8;
  const BUTTON_SIZE = 56; // approximate button size for bounds checking

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate saved position is within current screen bounds
        const maxX = window.innerWidth - BUTTON_SIZE;
        const maxY = window.innerHeight - BUTTON_SIZE;
        setPosition({
          x: typeof parsed.x === "number" ? Math.min(Math.max(0, parsed.x), maxX) : null,
          y: typeof parsed.y === "number" ? Math.min(Math.max(0, parsed.y), maxY) : null,
        });
      } catch {}
    }
  }, [storageKey]);

  // Constrain position to screen bounds
  const constrainToScreen = (x: number, y: number) => {
    const maxX = window.innerWidth - BUTTON_SIZE;
    const maxY = window.innerHeight - BUTTON_SIZE;
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  };

  const beginPointer = (clientX: number, clientY: number) => {
    const curX = position.x ?? (window.innerWidth - BUTTON_SIZE - 16);
    const curY = position.y ?? (window.innerHeight - BUTTON_SIZE - 80);
    setDragStart({ x: clientX - curX, y: clientY - curY });
    setHasMoved(false);
    setPointerDown(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    beginPointer(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    beginPointer(touch.clientX, touch.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!pointerDown) return;
      
      const rawX = e.clientX - dragStart.x;
      const rawY = e.clientY - dragStart.y;
      const curX = position.x ?? (window.innerWidth - BUTTON_SIZE - 16);
      const curY = position.y ?? (window.innerHeight - BUTTON_SIZE - 80);
      const dist = Math.hypot(rawX - curX, rawY - curY);

      if (!isDragging) {
        if (dist > THRESHOLD) setIsDragging(true);
        else return;
      }

      setHasMoved(true);
      const constrained = constrainToScreen(rawX, rawY);
      setPosition(constrained);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pointerDown) return;
      const touch = e.touches[0];
      
      const rawX = touch.clientX - dragStart.x;
      const rawY = touch.clientY - dragStart.y;
      const curX = position.x ?? (window.innerWidth - BUTTON_SIZE - 16);
      const curY = position.y ?? (window.innerHeight - BUTTON_SIZE - 80);
      const dist = Math.hypot(rawX - curX, rawY - curY);

      if (!isDragging) {
        if (dist > THRESHOLD) setIsDragging(true);
        else return;
      }

      setHasMoved(true);
      const constrained = constrainToScreen(rawX, rawY);
      setPosition(constrained);
    };

    const handleEnd = () => {
      if (isDragging && position.x !== null && position.y !== null) {
        setIsDragging(false);
        setTimeout(() => setHasMoved(false), 0);
        localStorage.setItem(storageKey, JSON.stringify({ x: position.x, y: position.y }));
      }
      setPointerDown(false);
      setIsDragging(false);
    };

    // Handle window resize - constrain position
    const handleResize = () => {
      if (position.x !== null && position.y !== null) {
        const constrained = constrainToScreen(position.x, position.y);
        if (constrained.x !== position.x || constrained.y !== position.y) {
          setPosition(constrained);
          localStorage.setItem(storageKey, JSON.stringify(constrained));
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDragging, dragStart, position, storageKey, pointerDown]);

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
      className="fixed z-50 cursor-move select-none"
      style={{
        right: position.x == null ? defaultRight : undefined,
        bottom: position.y == null ? defaultBottom : undefined,
        left: position.x != null ? `${position.x}px` : undefined,
        top: position.y != null ? `${position.y}px` : undefined,
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

export default Draggable;

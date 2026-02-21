import { useRef, useState, type ReactNode, type PointerEvent } from 'react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
}

export default function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const lockedAxis = useRef<'x' | 'y' | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Ignore right-click
    if (e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lockedAxis.current = null;
    setSwiping(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!swiping) return;
    const diffX = startX.current - e.clientX;
    const diffY = Math.abs(e.clientY - startY.current);

    // Lock axis once movement exceeds threshold
    if (!lockedAxis.current && (Math.abs(diffX) > 8 || diffY > 8)) {
      lockedAxis.current = diffY > Math.abs(diffX) ? 'y' : 'x';
    }

    // If vertical scroll wins, bail out
    if (lockedAxis.current === 'y') {
      setSwiping(false);
      setOffset(0);
      return;
    }

    // Only allow left swipe
    if (diffX > 0) {
      setOffset(Math.min(diffX, 200));
    }
  }

  function handlePointerUp() {
    setSwiping(false);
    lockedAxis.current = null;
    if (offset > 150) {
      // Auto-delete on large swipe
      setOffset(300);
      setTimeout(onDelete, 200);
    } else if (offset > 60) {
      // Snap to reveal delete button
      setOffset(80);
    } else {
      setOffset(0);
    }
  }

  function handleDeleteClick() {
    setOffset(300);
    setTimeout(onDelete, 200);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete button behind */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-ios-red text-white font-semibold px-6"
        style={{ width: 80 }}
        onClick={handleDeleteClick}
      >
        Delete
      </div>

      {/* Foreground content */}
      <div
        className="relative bg-white touch-pan-y"
        style={{
          transform: `translateX(-${offset}px)`,
          transitionDuration: swiping ? '0ms' : '300ms',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  );
}

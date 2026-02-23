import { useRef, useState, type ReactNode, type PointerEvent } from 'react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
  onComplete?: () => void;
}

export default function SwipeableItem({ children, onDelete, onComplete }: SwipeableItemProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const [offset, setOffset] = useState(0); // positive = swiped left (delete), negative = swiped right (complete)
  const [swiping, setSwiping] = useState(false);
  const lockedAxis = useRef<'x' | 'y' | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Ignore right-click
    if (e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    lockedAxis.current = null;
    pointerIdRef.current = e.pointerId;
    elementRef.current = e.currentTarget as HTMLDivElement;
    setSwiping(true);
    // Do NOT setPointerCapture here — it would steal clicks from child buttons.
    // We capture later once a horizontal swipe is confirmed.
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!swiping) return;
    const diffX = startX.current - e.clientX; // positive = swipe left, negative = swipe right
    const diffY = Math.abs(e.clientY - startY.current);

    // Lock axis once movement exceeds threshold
    if (!lockedAxis.current && (Math.abs(diffX) > 8 || diffY > 8)) {
      lockedAxis.current = diffY > Math.abs(diffX) ? 'y' : 'x';
      // Capture pointer only when we confirm a horizontal swipe
      if (lockedAxis.current === 'x' && pointerIdRef.current !== null && elementRef.current) {
        try { elementRef.current.setPointerCapture(pointerIdRef.current); } catch { /* ignore */ }
      }
    }

    // If vertical scroll wins, bail out
    if (lockedAxis.current === 'y') {
      setSwiping(false);
      setOffset(0);
      return;
    }

    if (diffX > 0) {
      // Swipe left → delete
      setOffset(Math.min(diffX, 200));
    } else if (onComplete && diffX < 0) {
      // Swipe right → complete
      setOffset(Math.max(diffX, -200));
    }
  }

  function handlePointerUp() {
    setSwiping(false);
    lockedAxis.current = null;
    pointerIdRef.current = null;
    elementRef.current = null;

    if (offset > 0) {
      // Left swipe → delete
      if (offset > 150) {
        setOffset(300);
        setTimeout(onDelete, 200);
      } else if (offset > 60) {
        setOffset(80);
      } else {
        setOffset(0);
      }
    } else if (offset < 0) {
      // Right swipe → complete
      if (offset < -150) {
        setOffset(-300);
        setTimeout(() => { onComplete?.(); setOffset(0); }, 200);
      } else if (offset < -60) {
        setOffset(-80);
      } else {
        setOffset(0);
      }
    }
  }

  function handleDeleteClick() {
    setOffset(300);
    setTimeout(onDelete, 200);
  }

  function handleCompleteClick() {
    setOffset(-300);
    setTimeout(() => { onComplete?.(); setOffset(0); }, 200);
  }

  return (
    <div className="relative overflow-hidden">
      {/* Complete button behind (left side) */}
      {onComplete && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-center bg-ios-green text-white font-semibold px-6"
          style={{ width: 80 }}
          onClick={handleCompleteClick}
        >
          Done
        </div>
      )}

      {/* Delete button behind (right side) */}
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
          transform: `translateX(${offset < 0 ? Math.abs(offset) : -offset}px)`,
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

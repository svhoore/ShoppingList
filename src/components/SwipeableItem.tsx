import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete: () => void;
}

export default function SwipeableItem({ children, onDelete }: SwipeableItemProps) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);

  function handleTouchStart(e: TouchEvent) {
    startX.current = e.touches[0].clientX;
    currentX.current = startX.current;
    setSwiping(true);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!swiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    // Only allow left swipe
    if (diff > 0) {
      setOffset(Math.min(diff, 200));
    }
  }

  function handleTouchEnd() {
    setSwiping(false);
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
        className="relative bg-white transition-transform"
        style={{
          transform: `translateX(-${offset}px)`,
          transitionDuration: swiping ? '0ms' : '300ms',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

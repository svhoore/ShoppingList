import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Reusable single-list drag-and-drop reorder hook.
 * Manages pointer events, index tracking, and calls onReorder when the drag ends.
 *
 * @param rowSelector  CSS selector for drag rows, e.g. '[data-list-row]'
 * @param onReorder    Called with (fromIndex, toIndex) when drag completes with a different position
 * @param gap          Extra px to add to measured row heights (e.g. 12 for gap-3 spacing)
 */
export function useDragReorder(
  rowSelector: string,
  onReorder: (fromIndex: number, toIndex: number) => void | Promise<void>,
  gap = 0,
) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startYRef = useRef(0);
  const rowHeightsRef = useRef<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Use a ref so the latest callback is always available without re-registering listeners
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDragIndex(index);
    setOverIndex(index);
    startYRef.current = clientY;
    if (containerRef.current) {
      const rows = containerRef.current.querySelectorAll(rowSelector);
      rowHeightsRef.current = Array.from(rows).map((r) => r.getBoundingClientRect().height + gap);
    }
  }, [rowSelector, gap]);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragIndex === null) return;
    const delta = clientY - startYRef.current;
    let offset = 0;
    let newIndex = dragIndex;
    if (delta > 0) {
      for (let i = dragIndex + 1; i < rowHeightsRef.current.length; i++) {
        offset += rowHeightsRef.current[i];
        if (delta > offset - rowHeightsRef.current[i] / 2) newIndex = i;
        else break;
      }
    } else {
      for (let i = dragIndex - 1; i >= 0; i--) {
        offset -= rowHeightsRef.current[i];
        if (delta < offset + rowHeightsRef.current[i] / 2) newIndex = i;
        else break;
      }
    }
    setOverIndex(newIndex);
  }, [dragIndex]);

  const handleDragEnd = useCallback(async () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      await onReorderRef.current(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex]);

  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: PointerEvent) => { e.preventDefault(); handleDragMove(e.clientY); };
    const onUp = () => handleDragEnd();
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragIndex, handleDragMove, handleDragEnd]);

  return {
    dragIndex,
    overIndex,
    containerRef,
    handleDragStart,
    isDragging: dragIndex !== null,
    reset: () => { setDragIndex(null); setOverIndex(null); },
  };
}

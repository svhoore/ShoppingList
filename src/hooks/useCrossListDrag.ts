import { useState, useRef, useCallback, useEffect } from 'react';

export interface CrossListDragCallbacks {
  /** Reorder items within a named list */
  reorderInList: (listName: string, fromIndex: number, toIndex: number) => Promise<void>;
  /** Reorder items within the inbox */
  reorderInbox: (fromIndex: number, toIndex: number) => Promise<void>;
  /** Move an item from inbox to a named list */
  moveInboxToList: (itemId: string, toList: string, toIndex: number) => Promise<void>;
  /** Move an item from a named list to inbox */
  moveItemToInbox: (fromList: string, itemId: string) => Promise<void>;
  /** Move an item between two named lists */
  moveItem: (fromList: string, toList: string, itemId: string, toIndex: number) => Promise<void>;
  /** Key that identifies the inbox list (e.g. '__inbox__' or '__action_inbox__') */
  inboxKey: string;
}

interface RowRect {
  key: string;
  listName: string;
  top: number;
  bottom: number;
  midY: number;
  activeIndex: number;
}

/**
 * Reusable cross-list drag-and-drop hook for the "All Items" and "All Actions" views.
 * Supports same-list reorder, inbox reorder, inbox↔list moves, and cross-list moves.
 */
export function useCrossListDrag(callbacks: CrossListDragCallbacks) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragFromList, setDragFromList] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ listName: string; index: number } | null>(null);
  const startYRef = useRef(0);
  const rowRectsRef = useRef<RowRect[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to always get latest callbacks without re-registering listeners
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  /** Snapshot all draggable row rects and empty-zone sentinels */
  const captureRects = useCallback(() => {
    if (!containerRef.current) return;
    const rects: RowRect[] = [];
    containerRef.current.querySelectorAll<HTMLElement>('[data-drag-key]').forEach((el) => {
      const r = el.getBoundingClientRect();
      rects.push({
        key: el.dataset.dragKey!,
        listName: el.dataset.dragList!,
        top: r.top,
        bottom: r.bottom,
        midY: (r.top + r.bottom) / 2,
        activeIndex: parseInt(el.dataset.dragIdx!, 10),
      });
    });
    containerRef.current.querySelectorAll<HTMLElement>('[data-empty-list]').forEach((el) => {
      const list = el.dataset.emptyList!;
      const r = el.getBoundingClientRect();
      rects.push({ key: `empty:${list}`, listName: list, top: r.top, bottom: r.bottom, midY: (r.top + r.bottom) / 2, activeIndex: 0 });
    });
    rowRectsRef.current = rects;
  }, []);

  const handleDragStart = useCallback((itemId: string, listName: string, activeIndex: number, clientY: number) => {
    setDragKey(itemId);
    setDragFromList(listName);
    setDragFromIndex(activeIndex);
    setDropTarget({ listName, index: activeIndex });
    startYRef.current = clientY;
    requestAnimationFrame(() => captureRects());
  }, [captureRects]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragKey) return;
    captureRects();
    const rects = rowRectsRef.current.filter(r => r.key !== dragKey);
    if (rects.length === 0) return;

    // Find closest rect to pointer
    let closest = rects[0];
    let closestDist = Math.abs(clientY - closest.midY);
    for (let i = 1; i < rects.length; i++) {
      const dist = Math.abs(clientY - rects[i].midY);
      if (dist < closestDist) { closest = rects[i]; closestDist = dist; }
    }

    const isBelow = clientY > closest.midY;
    const newList = closest.listName;

    if (closest.key.startsWith('empty:')) {
      setDropTarget({ listName: newList, index: 0 });
    } else {
      const listRects = rects
        .filter(r => r.listName === newList && !r.key.startsWith('empty:'))
        .sort((a, b) => a.activeIndex - b.activeIndex);
      const closestIdx = listRects.findIndex(r => r.key === closest.key);
      const targetIdx = closestIdx === -1 ? 0 : isBelow ? closestIdx + 1 : closestIdx;
      setDropTarget({ listName: newList, index: targetIdx });
    }
  }, [dragKey, captureRects]);

  const handleDragEnd = useCallback(async () => {
    if (dragKey && dragFromList !== null && dragFromIndex !== null && dropTarget) {
      const { listName: toList, index: toIdx } = dropTarget;
      const { inboxKey, reorderInList, reorderInbox, moveInboxToList, moveItemToInbox, moveItem } = cbRef.current;

      if (toList === dragFromList) {
        // Same list reorder
        if (toIdx !== dragFromIndex) {
          const adjustedIdx = toIdx > dragFromIndex ? toIdx - 1 : toIdx;
          if (adjustedIdx !== dragFromIndex) {
            if (dragFromList === inboxKey) {
              await reorderInbox(dragFromIndex, adjustedIdx);
            } else {
              await reorderInList(dragFromList, dragFromIndex, adjustedIdx);
            }
          }
        }
      } else if (dragFromList === inboxKey) {
        await moveInboxToList(dragKey, toList, toIdx);
      } else if (toList === inboxKey) {
        await moveItemToInbox(dragFromList, dragKey);
      } else {
        await moveItem(dragFromList, toList, dragKey, toIdx);
      }
    }
    setDragKey(null);
    setDragFromList(null);
    setDragFromIndex(null);
    setDropTarget(null);
  }, [dragKey, dragFromList, dragFromIndex, dropTarget]);

  useEffect(() => {
    if (!dragKey) return;
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
  }, [dragKey, handleDragMove, handleDragEnd]);

  /** Whether a drop indicator line should be shown before a given item */
  function getDropIndicator(listName: string, activeIndex: number): 'before' | null {
    if (!dragKey || !dropTarget || dropTarget.listName !== listName) return null;
    if (dropTarget.index === activeIndex) return 'before';
    return null;
  }

  /** Whether the "after last item" indicator should show */
  function getDropAfterLast(listName: string, activeCount: number): boolean {
    if (!dragKey || !dropTarget || dropTarget.listName !== listName) return false;
    return dropTarget.index >= activeCount;
  }

  return {
    dragKey,
    dragFromList,
    dropTarget,
    containerRef,
    handleDragStart,
    getDropIndicator,
    getDropAfterLast,
    isDragging: dragKey !== null,
  };
}

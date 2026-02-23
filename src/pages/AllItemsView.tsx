import { useState, useRef, useCallback, useEffect, useMemo, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold, DEFAULT_CATEGORIES, type ShoppingItem } from '../hooks/useHousehold';
import SwipeableItem from '../components/SwipeableItem';
import ItemRow from '../components/ItemRow';
import { IconHome, IconEye, IconEyeOff, IconPlus } from '../components/Icons';

export default function AllItemsView() {
  const navigate = useNavigate();
  const { householdId } = useHouseholdContext();
  const {
    data, loading, toggleItem, deleteItem, editItem, toggleBonus,
    reorderItems, moveItem,
    addInboxItem, deleteInboxItem, editInboxItem,
    reorderInbox, moveInboxToList, moveItemToInbox,
    error,
  } = useHousehold(householdId);

  const [showCompleted, setShowCompleted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [newInboxText, setNewInboxText] = useState('');
  const inboxInputRef = useRef<HTMLInputElement>(null);

  const INBOX_LIST = '__inbox__';

  const lists = data?.lists ?? [];
  const inbox = data?.inbox ?? [];

  // ---- Category helpers ----
  const allCategories = useMemo(() => {
    const custom = data?.customCategories ?? [];
    return [
      ...DEFAULT_CATEGORIES,
      ...custom.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [data?.customCategories]);

  const usedCategories = useMemo(() => {
    const cats = new Set(lists.map((l) => l.category).filter(Boolean));
    return allCategories.filter((c) => cats.has(c));
  }, [lists, allCategories]);

  // ---- Grouped data ----
  const grouped = useMemo(() => {
    let src = lists;
    if (categoryFilter) src = src.filter((l) => l.category === categoryFilter);
    return src.map(list => {
      const active = list.items.filter(i => !i.completed);
      const completed = list.items.filter(i => i.completed);
      return { listName: list.listName, icon: list.icon, category: list.category, bonusEnabled: !!list.bonusEnabled, active, completed };
    });
  }, [lists, categoryFilter]);

  const totalActive = useMemo(() => grouped.reduce((s, g) => s + g.active.length, 0), [grouped]);
  const totalCompleted = useMemo(() => grouped.reduce((s, g) => s + g.completed.length, 0), [grouped]);



  // ---- Drag state ----
  const [dragKey, setDragKey] = useState<string | null>(null); // item id being dragged
  const [dragFromList, setDragFromList] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ listName: string; index: number } | null>(null);
  const startYRef = useRef(0);
  const rowRectsRef = useRef<{ key: string; listName: string; top: number; bottom: number; midY: number; activeIndex: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  /** Snapshot all draggable row rects at drag start */
  const captureRects = useCallback(() => {
    if (!containerRef.current) return;
    const rects: typeof rowRectsRef.current = [];
    const rows = containerRef.current.querySelectorAll<HTMLElement>('[data-drag-key]');
    rows.forEach((el) => {
      const key = el.dataset.dragKey!;
      const list = el.dataset.dragList!;
      const idx = parseInt(el.dataset.dragIdx!, 10);
      const r = el.getBoundingClientRect();
      rects.push({ key, listName: list, top: r.top, bottom: r.bottom, midY: (r.top + r.bottom) / 2, activeIndex: idx });
    });
    // Also capture empty-zone sentinels
    const empties = containerRef.current.querySelectorAll<HTMLElement>('[data-empty-list]');
    empties.forEach((el) => {
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
    // Small delay to let DOM settle, then capture rects
    requestAnimationFrame(() => captureRects());
  }, [captureRects]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragKey) return;
    // Re-capture rects each move so we always have up-to-date positions
    captureRects();
    const rects = rowRectsRef.current.filter(r => r.key !== dragKey);
    if (rects.length === 0) return;

    // Find closest rect to pointer
    let closest = rects[0];
    let closestDist = Math.abs(clientY - closest.midY);
    for (let i = 1; i < rects.length; i++) {
      const dist = Math.abs(clientY - rects[i].midY);
      if (dist < closestDist) {
        closest = rects[i];
        closestDist = dist;
      }
    }

    // Determine insertion index
    const isBelow = clientY > closest.midY;
    const newList = closest.listName;
    const isEmptySlot = closest.key.startsWith('empty:');

    if (isEmptySlot) {
      setDropTarget({ listName: newList, index: 0 });
    } else {
      // Gather sorted active indices for this list
      const listRects = rects
        .filter(r => r.listName === newList && !r.key.startsWith('empty:'))
        .sort((a, b) => a.activeIndex - b.activeIndex);

      const closestIdx = listRects.findIndex(r => r.key === closest.key);
      let targetIdx: number;
      if (closestIdx === -1) {
        targetIdx = 0;
      } else if (isBelow) {
        targetIdx = closestIdx + 1;
      } else {
        targetIdx = closestIdx;
      }
      // If dragging within the same list, account for the removed item
      if (newList === dragFromList && dragFromIndex !== null && targetIdx > dragFromIndex) {
        // The visual index already accounts for the gap, no adjustment needed
      }
      setDropTarget({ listName: newList, index: targetIdx });
    }
  }, [dragKey, dragFromList, dragFromIndex, captureRects]);

  const handleDragEnd = useCallback(async () => {
    if (dragKey && dragFromList !== null && dragFromIndex !== null && dropTarget) {
      const { listName: toList, index: toIdx } = dropTarget;

      if (toList === dragFromList) {
        // Same list/inbox reorder
        if (toIdx !== dragFromIndex) {
          const adjustedIdx = toIdx > dragFromIndex ? toIdx - 1 : toIdx;
          if (adjustedIdx !== dragFromIndex) {
            if (dragFromList === INBOX_LIST) {
              await reorderInbox(dragFromIndex, adjustedIdx);
            } else {
              await reorderItems(dragFromList, dragFromIndex, adjustedIdx);
            }
          }
        }
      } else if (dragFromList === INBOX_LIST) {
        // Inbox → list
        await moveInboxToList(dragKey, toList, toIdx);
      } else if (toList === INBOX_LIST) {
        // List → inbox
        await moveItemToInbox(dragFromList, dragKey);
      } else {
        // Cross-list move
        await moveItem(dragFromList, toList, dragKey, toIdx);
      }
    }
    setDragKey(null);
    setDragFromList(null);
    setDragFromIndex(null);
    setDropTarget(null);
  }, [dragKey, dragFromList, dragFromIndex, dropTarget, reorderItems, moveItem, reorderInbox, moveInboxToList, moveItemToInbox, INBOX_LIST]);

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

  async function handleToggle(listName: string, item: ShoppingItem) {
    if (navigator.vibrate) navigator.vibrate(10);
    await toggleItem(listName, item.id);
  }

  async function handleAddInbox(e?: FormEvent) {
    e?.preventDefault();
    if (!newInboxText.trim()) return;
    await addInboxItem(newInboxText);
    setNewInboxText('');
    inboxInputRef.current?.focus();
  }

  function handleInboxKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInbox();
    }
  }

  /** Whether a drop indicator line should be shown before a given item */
  function getDropIndicator(listName: string, activeIndex: number): 'before' | 'after' | null {
    if (!dragKey || !dropTarget || dropTarget.listName !== listName) return null;
    if (dropTarget.index === activeIndex) return 'before';
    return null;
  }

  /** Whether the "after last item" indicator should show */
  function getDropAfterLast(listName: string, activeCount: number): boolean {
    if (!dragKey || !dropTarget || dropTarget.listName !== listName) return false;
    return dropTarget.index >= activeCount;
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex flex-col">
        <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <div className="p-3 -ml-1 rounded-lg bg-ios-bg w-11 h-11" />
            <div className="h-5 w-40 bg-gray-200/70 rounded-md" />
          </div>
        </div>
        <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-32 bg-gray-200/60 rounded-md mb-2" />
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2 px-4 py-3">
                    <div className="w-[22px] h-[22px] rounded-full bg-gray-200/60 flex-shrink-0" />
                    <div className="h-4 bg-gray-200/70 rounded-md flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ios-bg flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-3 -ml-1 text-ios-blue active:bg-ios-blue/10 transition-colors rounded-lg"
              aria-label="Home"
            >
              <IconHome />
            </button>
            <div>
              <h1 className="text-xl font-bold text-ios-text">All Items</h1>
              <p className="text-xs text-ios-secondary">
                {totalActive} active{totalCompleted > 0 ? ` · ${totalCompleted} done` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
            title={showCompleted ? 'Hide completed' : 'Show completed'}
          >
            {showCompleted ? <IconEye size={20} /> : <IconEyeOff size={20} />}
          </button>
        </div>
      </div>

      {/* Category Filter — outside sticky header so header height stays stable */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
        {usedCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                categoryFilter === null
                  ? 'bg-ios-blue text-white'
                  : 'bg-white text-ios-secondary active:bg-gray-100 shadow-sm'
              }`}
            >
              All
            </button>
            {usedCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-ios-blue text-white'
                    : 'bg-white text-ios-secondary active:bg-gray-100 shadow-sm'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 pb-8">
        {/* Inbox Box */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-lg">📥</span>
            <span className="text-xs font-semibold text-ios-secondary uppercase tracking-wide">
              Inbox
            </span>
            {inbox.length > 0 && (
              <span className="text-xs text-ios-secondary/60">· {inbox.length} item{inbox.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Add item input */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-1">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <button
                onClick={() => handleAddInbox()}
                className="text-ios-blue flex-shrink-0"
                disabled={!newInboxText.trim()}
              >
                <IconPlus size={20} strokeWidth={2.5} />
              </button>
              <input
                ref={inboxInputRef}
                type="text"
                value={newInboxText}
                onChange={(e) => setNewInboxText(e.target.value)}
                onKeyDown={handleInboxKeyDown}
                placeholder="Add item to inbox…"
                maxLength={200}
                className="flex-1 text-[15px] text-ios-text placeholder:text-ios-secondary/50 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Inbox items */}
          {inbox.length === 0 ? (
            <div
              data-empty-list={INBOX_LIST}
              className={`bg-white/60 rounded-2xl overflow-hidden shadow-sm border border-dashed border-gray-200 transition-all ${
                dropTarget?.listName === INBOX_LIST && dragKey
                  ? 'ring-2 ring-ios-blue/40 bg-ios-blue/5'
                  : ''
              }`}
            >
              <div className="px-4 py-4 text-center">
                <p className="text-xs text-ios-secondary">
                  {dragKey ? 'Drop here to move to inbox' : 'Add items here, then drag them to a list'}
                </p>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 transition-all ${
              dropTarget?.listName === INBOX_LIST && dragKey && dragFromList !== INBOX_LIST
                ? 'ring-2 ring-ios-blue/40'
                : ''
            }`}>
              {inbox.map((item, idx) => {
                const isDragging = dragKey === item.id;
                const dropBefore = getDropIndicator(INBOX_LIST, idx);

                return (
                  <div key={item.id}>
                    {dropBefore === 'before' && !isDragging && (
                      <div className="h-0.5 bg-ios-blue mx-4 rounded-full" />
                    )}
                    <div
                      data-drag-key={item.id}
                      data-drag-list={INBOX_LIST}
                      data-drag-idx={idx}
                      className={`transition-all duration-150 ${isDragging ? 'opacity-40 bg-ios-blue/5' : ''}`}
                    >
                      <SwipeableItem onDelete={() => deleteInboxItem(item.id)}>
                        <ItemRow
                          item={item}
                          onToggle={() => {}} // no toggle in inbox
                          onEdit={(text) => editInboxItem(item.id, text)}
                          onDelete={() => deleteInboxItem(item.id)}
                          onDragStart={(clientY) => handleDragStart(item.id, INBOX_LIST, idx, clientY)}
                          isDragging={isDragging}
                          hideCheckbox
                        />
                      </SwipeableItem>
                    </div>
                  </div>
                );
              })}
              {getDropAfterLast(INBOX_LIST, inbox.length) && (
                <div className="h-0.5 bg-ios-blue mx-4 rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* List groups */}
        {grouped.length === 0 && inbox.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-ios-secondary text-sm">
              {categoryFilter ? 'No lists in this category' : 'No lists yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => {

              const isDropTargetList = dropTarget?.listName === group.listName;
              const showDropAfterLast = getDropAfterLast(group.listName, group.active.length);

              return (
                <div key={group.listName}>
                  {/* List header */}
                  <button
                    onClick={() => navigate(`/list/${encodeURIComponent(group.listName)}`)}
                    className="flex items-center gap-2 mb-2 px-1 active:opacity-70"
                  >
                    <span className="text-lg">{group.icon || '📝'}</span>
                    <span className="text-xs font-semibold text-ios-secondary uppercase tracking-wide">
                      {group.listName}
                    </span>
                    {group.category && (
                      <span className="text-xs text-ios-secondary/60">· {group.category}</span>
                    )}
                    <span className="text-xs text-ios-blue ml-auto">→</span>
                  </button>

                  {/* Active items (or empty drop zone) */}
                  {group.active.length === 0 ? (
                    <div
                      data-empty-list={group.listName}
                      className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${
                        isDropTargetList && dragKey
                          ? 'ring-2 ring-ios-blue/40 bg-ios-blue/5'
                          : ''
                      }`}
                    >
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-ios-secondary">
                          {dragKey ? 'Drop here to move item' : 'No active items'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
                      {group.active.map((item, idx) => {
                        const isDragging = dragKey === item.id;
                        const dropBefore = getDropIndicator(group.listName, idx);

                        return (
                          <div key={item.id}>
                            {/* Drop indicator line */}
                            {dropBefore === 'before' && !isDragging && (
                              <div className="h-0.5 bg-ios-blue mx-4 rounded-full" />
                            )}
                            <div
                              data-drag-key={item.id}
                              data-drag-list={group.listName}
                              data-drag-idx={idx}
                              className={`transition-all duration-150 ${isDragging ? 'opacity-40 bg-ios-blue/5' : ''}`}
                            >
                              <SwipeableItem onDelete={() => deleteItem(group.listName, item.id)} onComplete={() => handleToggle(group.listName, item)}>
                                <ItemRow
                                  item={item}
                                  onToggle={() => handleToggle(group.listName, item)}
                                  onEdit={(text) => editItem(group.listName, item.id, text)}
                                  onDelete={() => deleteItem(group.listName, item.id)}
                                  onToggleBonus={group.bonusEnabled ? () => toggleBonus(group.listName, item.id) : undefined}
                                  onDragStart={(clientY) => handleDragStart(item.id, group.listName, idx, clientY)}
                                  isDragging={isDragging}
                                />
                              </SwipeableItem>
                            </div>
                          </div>
                        );
                      })}
                      {/* Drop indicator after last item */}
                      {showDropAfterLast && (
                        <div className="h-0.5 bg-ios-blue mx-4 rounded-full" />
                      )}
                    </div>
                  )}

                  {/* Completed items */}
                  {showCompleted && group.completed.length > 0 && (
                    <div className={`${group.active.length > 0 ? 'mt-2' : ''} bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100 opacity-60`}>
                      {group.completed.map(item => (
                        <SwipeableItem key={item.id} onDelete={() => deleteItem(group.listName, item.id)} onComplete={() => handleToggle(group.listName, item)}>
                          <ItemRow
                            item={item}
                            onToggle={() => handleToggle(group.listName, item)}
                            onEdit={(text) => editItem(group.listName, item.id, text)}
                            onDelete={() => deleteItem(group.listName, item.id)}
                            onToggleBonus={group.bonusEnabled ? () => toggleBonus(group.listName, item.id) : undefined}
                          />
                        </SwipeableItem>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-ios-red text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
}

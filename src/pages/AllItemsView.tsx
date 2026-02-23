import { useState, useRef, useMemo, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold, type ShoppingItem } from '../hooks/useHousehold';
import { useListCategories } from '../hooks/useCategories';
import SwipeableItem from '../components/SwipeableItem';
import ItemRow from '../components/ItemRow';
import { IconHome, IconEye, IconEyeOff, IconPlus } from '../components/Icons';
import ErrorToast from '../components/ErrorToast';
import { useCrossListDrag } from '../hooks/useCrossListDrag';

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
  const { usedCategories } = useListCategories(data);

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



  // ---- Cross-list drag ----
  const { dragKey, dragFromList, dropTarget, containerRef, handleDragStart, getDropIndicator, getDropAfterLast } = useCrossListDrag({
    inboxKey: INBOX_LIST,
    reorderInList: reorderItems,
    reorderInbox,
    moveInboxToList,
    moveItemToInbox,
    moveItem,
  });

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

      <ErrorToast error={error} />
    </div>
  );
}

import { useState, useRef, useCallback, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold, type ShoppingItem } from '../hooks/useHousehold';
import SwipeableItem from '../components/SwipeableItem';
import ConfirmDialog from '../components/ConfirmDialog';
import ItemRow from '../components/ItemRow';
import { IconHome, IconMoreVertical, IconEye, IconEyeOff, IconEdit, IconTrash } from '../components/Icons';

export default function ListView() {
  const { listName: rawListName } = useParams<{ listName: string }>();
  const listName = decodeURIComponent(rawListName || '');
  const navigate = useNavigate();

  const { householdId } = useHouseholdContext();
  const { data, loading, addItem, toggleItem, deleteItem, editItem, toggleBonus, deleteList, renameList, reorderItems, clearCompleted, error } =
    useHousehold(householdId);

  const [newItemText, setNewItemText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [renameValue, setRenameValue] = useState(listName);
  const newItemRef = useRef<HTMLInputElement>(null);

  const list = data?.lists.find((l) => l.listName === listName);
  const activeItems = list?.items.filter((i) => !i.completed) ?? [];
  const completedItems = list?.items.filter((i) => i.completed) ?? [];

  // ---- Drag-and-drop state ----
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const rowHeightsRef = useRef<number[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Calculate displayed order during drag
  const displayItems = (() => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return activeItems;
    const items = [...activeItems];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(overIndex, 0, moved);
    return items;
  })();

  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDragIndex(index);
    setOverIndex(index);
    startYRef.current = clientY;
    currentYRef.current = clientY;
    // Capture row heights
    if (listContainerRef.current) {
      const rows = listContainerRef.current.querySelectorAll('[data-drag-row]');
      rowHeightsRef.current = Array.from(rows).map((r) => r.getBoundingClientRect().height);
    }
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (dragIndex === null) return;
    currentYRef.current = clientY;
    const delta = clientY - startYRef.current;
    // Compute which index the item moved to
    let offset = 0;
    let newIndex = dragIndex;
    if (delta > 0) {
      for (let i = dragIndex + 1; i < rowHeightsRef.current.length; i++) {
        offset += rowHeightsRef.current[i];
        if (delta > offset - rowHeightsRef.current[i] / 2) {
          newIndex = i;
        } else break;
      }
    } else {
      for (let i = dragIndex - 1; i >= 0; i--) {
        offset -= rowHeightsRef.current[i];
        if (delta < offset + rowHeightsRef.current[i] / 2) {
          newIndex = i;
        } else break;
      }
    }
    setOverIndex(newIndex);
  }, [dragIndex]);

  const handleDragEnd = useCallback(async () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      await reorderItems(listName, dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, listName, reorderItems]);

  // Global pointer/touch listeners for drag
  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      handleDragMove(e.clientY);
    };
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

  async function handleAddItem(e?: FormEvent) {
    e?.preventDefault();
    if (!newItemText.trim()) return;
    await addItem(listName, newItemText);
    setNewItemText('');
    newItemRef.current?.focus();
  }

  function handleAddKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  }

  async function handleToggle(item: ShoppingItem) {
    if (navigator.vibrate) navigator.vibrate(10);
    await toggleItem(listName, item.id);
  }

  async function handleDeleteList() {
    await deleteList(listName);
    navigate('/', { replace: true });
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (renameValue.trim() && renameValue !== listName) {
      await renameList(listName, renameValue);
      navigate(`/list/${encodeURIComponent(renameValue)}`, { replace: true });
    }
    setShowRename(false);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-ios-blue/30 border-t-ios-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="min-h-dvh bg-ios-bg flex flex-col items-center justify-center p-6">
        <p className="text-ios-secondary mb-4">List not found</p>
        <button onClick={() => navigate('/')} className="text-ios-blue font-medium">
          Go back
        </button>
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
              className="p-1.5 -ml-1 text-ios-blue active:opacity-60 transition-opacity rounded-lg"
              aria-label="Home"
            >
              <IconHome />
            </button>
            <h1 className="text-xl font-bold text-ios-text">{listName}</h1>
          </div>
          {/* Options button */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
            >
              <IconMoreVertical />
            </button>

            {/* Options dropdown */}
            {showOptions && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden min-w-[200px]">
                  <button
                    onClick={() => { setShowCompleted(!showCompleted); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-text active:bg-gray-50 flex items-center gap-3"
                  >
                    {showCompleted ? <IconEye className="text-ios-green" /> : <IconEyeOff className="text-ios-green" />}
                    {showCompleted ? 'Hide completed' : `Show completed (${completedItems.length})`}
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setRenameValue(listName); setShowRename(true); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-text active:bg-gray-50 flex items-center gap-3"
                  >
                    <IconEdit size={18} className="text-ios-blue" />
                    Rename list
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setShowDeleteList(true); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-red active:bg-red-50 flex items-center gap-3"
                  >
                    <IconTrash size={18} />
                    Delete list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 pt-4 pb-8">
        {/* Active Items */}
        <div ref={listContainerRef} className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
          {displayItems.map((item) => {
            const isDragging = dragIndex !== null && item.id === activeItems[dragIndex]?.id;
            return (
              <div
                key={item.id}
                data-drag-row
                className={`transition-all duration-150 ${isDragging ? 'opacity-50 bg-ios-blue/5' : ''}`}
              >
                <SwipeableItem onDelete={() => deleteItem(listName, item.id)}>
                  <ItemRow
                    item={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={(text) => editItem(listName, item.id, text)}
                    onDelete={() => deleteItem(listName, item.id)}
                    onToggleBonus={() => toggleBonus(listName, item.id)}
                    onDragStart={(clientY) => handleDragStart(activeItems.findIndex((a) => a.id === item.id), clientY)}
                    isDragging={isDragging}
                  />
                </SwipeableItem>
              </div>
            );
          })}

          {/* Inline add — sits below last item inside the same card */}
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-200 flex-shrink-0" />
            <input
              ref={newItemRef}
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder="Add an item…"
              enterKeyHint="done"
              className="flex-1 text-[15px] text-ios-text placeholder:text-ios-secondary/40 bg-transparent focus:outline-none py-0.5"
            />
          </div>
        </div>

        {/* Completed Section — hidden by default, toggled via options menu */}
        {showCompleted && completedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-ios-secondary uppercase tracking-wide">
                Completed ({completedItems.length})
              </p>
              <button
                onClick={() => clearCompleted(listName)}
                className="text-xs text-ios-red font-medium active:opacity-60"
              >
                Clear all
              </button>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {completedItems.map((item) => (
                <SwipeableItem key={item.id} onDelete={() => deleteItem(listName, item.id)}>
                  <ItemRow
                    item={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={(text) => editItem(listName, item.id, text)}
                    onDelete={() => deleteItem(listName, item.id)}
                    onToggleBonus={() => toggleBonus(listName, item.id)}
                  />
                </SwipeableItem>
              ))}
            </div>
          </div>
        )}

        {activeItems.length === 0 && completedItems.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-ios-secondary text-sm">No items yet</p>
            <p className="text-ios-secondary text-xs mt-1">Start typing above to add one</p>
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRename(false)} />
          <form
            onSubmit={handleRename}
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-ios-text mb-3">Rename List</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowRename(false)}
                className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim()}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:opacity-80 transition-opacity"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete List Confirm */}
      <ConfirmDialog
        open={showDeleteList}
        title="Delete List"
        message={`Delete "${listName}" and all its items? This can't be undone.`}
        onConfirm={handleDeleteList}
        onCancel={() => setShowDeleteList(false)}
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-ios-red text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
}

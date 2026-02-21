import { useState, useRef, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold, type ShoppingItem } from '../hooks/useHousehold';
import SwipeableItem from '../components/SwipeableItem';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ListView() {
  const { listName: rawListName } = useParams<{ listName: string }>();
  const listName = decodeURIComponent(rawListName || '');
  const navigate = useNavigate();

  const { householdId } = useHouseholdContext();
  const { data, loading, addItem, toggleItem, deleteItem, deleteList, renameList } =
    useHousehold(householdId);

  const [newItemText, setNewItemText] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(listName);
  const [recentlyToggled, setRecentlyToggled] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const list = data?.lists.find((l) => l.listName === listName);
  const activeItems = list?.items.filter((i) => !i.completed) ?? [];
  const completedItems = list?.items.filter((i) => i.completed) ?? [];

  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    if (!newItemText.trim()) return;
    await addItem(listName, newItemText);
    setNewItemText('');
    inputRef.current?.focus();
  }

  async function handleToggle(item: ShoppingItem) {
    // Haptic feedback (Android)
    if (navigator.vibrate) navigator.vibrate(10);
    // Track for animation delay
    setRecentlyToggled((prev) => new Set(prev).add(item.id));
    await toggleItem(listName, item.id);
    // Remove from recently-toggled after animation
    setTimeout(() => {
      setRecentlyToggled((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 800);
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
              className="p-1 -ml-1 text-ios-blue active:opacity-60 transition-opacity"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-ios-text">{listName}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setRenameValue(listName);
                setShowRename(true);
              }}
              className="p-2 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
              title="Rename"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => setShowDeleteList(true)}
              className="p-2 rounded-lg text-ios-red active:bg-red-50 transition-colors"
              title="Delete list"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto pb-20 max-w-lg mx-auto w-full">
        {activeItems.length === 0 && completedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-ios-secondary text-sm">No items yet</p>
            <p className="text-ios-secondary text-xs mt-1">Add your first item below</p>
          </div>
        ) : (
          <>
            {/* Active Items */}
            <div className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {activeItems.map((item) => (
                <SwipeableItem key={item.id} onDelete={() => deleteItem(listName, item.id)}>
                  <ItemRow
                    item={item}
                    onToggle={() => handleToggle(item)}
                    animating={recentlyToggled.has(item.id)}
                  />
                </SwipeableItem>
              ))}
            </div>

            {/* Completed Section */}
            {completedItems.length > 0 && (
              <div className="mx-4 mt-6">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 mb-2 px-1"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-ios-secondary transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="text-sm font-medium text-ios-secondary">
                    Completed ({completedItems.length})
                  </span>
                </button>

                {showCompleted && (
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
                    {completedItems.map((item) => (
                      <SwipeableItem key={item.id} onDelete={() => deleteItem(listName, item.id)}>
                        <ItemRow
                          item={item}
                          onToggle={() => handleToggle(item)}
                          animating={recentlyToggled.has(item.id)}
                        />
                      </SwipeableItem>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-200/60 safe-bottom">
        <form onSubmit={handleAddItem} className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 px-4 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition-shadow"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="px-5 py-2.5 bg-ios-blue text-white rounded-xl font-semibold text-[15px] disabled:opacity-40 active:opacity-80 transition-opacity"
          >
            Add
          </button>
        </form>
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
    </div>
  );
}

// ---- Item Row Component ----

function ItemRow({
  item,
  onToggle,
  animating,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  animating: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-opacity duration-300 ${
        item.completed ? 'opacity-50' : ''
      } ${animating ? 'animate-pulse-once' : ''}`}
      onClick={onToggle}
    >
      {/* Circle Checkbox */}
      <div
        className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          item.completed
            ? 'bg-ios-green border-ios-green'
            : 'border-gray-300'
        }`}
      >
        {item.completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Text */}
      <span
        className={`text-[15px] transition-all duration-300 ${
          item.completed ? 'line-through text-ios-secondary' : 'text-ios-text'
        }`}
      >
        {item.text}
      </span>
    </div>
  );
}

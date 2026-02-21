import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
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
  const { data, loading, addItem, toggleItem, deleteItem, editItem, deleteList, renameList } =
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
              className="p-1 -ml-1 text-ios-blue active:opacity-60 transition-opacity"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-ios-text">{listName}</h1>
          </div>
          {/* Options button */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ios-green">
                      {showCompleted ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></> : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>}
                    </svg>
                    {showCompleted ? 'Hide completed' : `Show completed (${completedItems.length})`}
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setRenameValue(listName); setShowRename(true); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-text active:bg-gray-50 flex items-center gap-3"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ios-blue">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Rename list
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setShowDeleteList(true); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-red active:bg-red-50 flex items-center gap-3"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
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
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
          {activeItems.map((item) => (
            <SwipeableItem key={item.id} onDelete={() => deleteItem(listName, item.id)}>
              <ItemRow
                item={item}
                onToggle={() => handleToggle(item)}
                onEdit={(text) => editItem(listName, item.id, text)}
                onDelete={() => deleteItem(listName, item.id)}
              />
            </SwipeableItem>
          ))}

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
              className="flex-1 text-[15px] text-ios-text placeholder:text-ios-secondary/40 bg-transparent focus:outline-none py-0.5"
            />
          </div>
        </div>

        {/* Completed Section — hidden by default, toggled via options menu */}
        {showCompleted && completedItems.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2 px-1">
              Completed ({completedItems.length})
            </p>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {completedItems.map((item) => (
                <SwipeableItem key={item.id} onDelete={() => deleteItem(listName, item.id)}>
                  <ItemRow
                    item={item}
                    onToggle={() => handleToggle(item)}
                    onEdit={(text) => editItem(listName, item.id, text)}
                    onDelete={() => deleteItem(listName, item.id)}
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
    </div>
  );
}

// ---- Item Row Component ----

function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const editRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    if (item.completed) return;
    setEditText(item.text);
    setEditing(true);
    setTimeout(() => editRef.current?.focus(), 0);
  }

  function commitEdit() {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onEdit(trimmed);
    }
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-opacity duration-300 ${
        item.completed ? 'opacity-50' : ''
      }`}
    >
      {/* Circle Checkbox */}
      <button
        onClick={onToggle}
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
      </button>

      {/* Text / Edit input */}
      {editing ? (
        <input
          ref={editRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          className="flex-1 text-[15px] text-ios-text bg-transparent focus:outline-none border-b border-ios-blue/30 py-0.5"
        />
      ) : (
        <span
          onClick={startEdit}
          className={`flex-1 text-[15px] transition-all duration-300 ${
            item.completed ? 'line-through text-ios-secondary' : 'text-ios-text cursor-text'
          }`}
        >
          {item.text}
        </span>
      )}

      {/* Delete button */}
      {!editing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-ios-secondary/40 hover:text-ios-red active:text-ios-red active:bg-red-50 transition-colors flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

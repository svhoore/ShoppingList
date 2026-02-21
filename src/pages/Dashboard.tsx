import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold, LIST_CATEGORIES, type ListCategory } from '../hooks/useHousehold';
import ConfirmDialog from '../components/ConfirmDialog';
import IconPicker from '../components/IconPicker';

export default function Dashboard() {
  const { householdId, leaveHousehold } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const { data, loading, addList, deleteList, renameList, setListIcon, setListCategory } = useHousehold(householdId);
  const navigate = useNavigate();

  const [showAdd, setShowAdd] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');
  const [newListCategory, setNewListCategory] = useState<ListCategory>('Other');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameIcon, setRenameIcon] = useState('📝');
  const [renameCategory, setRenameCategory] = useState<ListCategory>('Other');
  const [showLeave, setShowLeave] = useState(false);

  async function handleAddList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    await addList(newListName, newListIcon, newListCategory);
    setNewListName('');
    setNewListIcon('📝');
    setNewListCategory('Other');
    setShowAdd(false);
  }

  async function handleDeleteList() {
    if (deleteTarget) {
      await deleteList(deleteTarget);
      setDeleteTarget(null);
    }
  }

  async function handleRenameList(e: FormEvent) {
    e.preventDefault();
    if (renameTarget && renameValue.trim()) {
      await renameList(renameTarget, renameValue);
      // Also update icon/category if they changed
      const list = data?.lists.find((l) => l.listName === renameTarget);
      if (list && list.icon !== renameIcon) {
        await setListIcon(renameValue.trim(), renameIcon);
      }
      if (list && list.category !== renameCategory) {
        await setListCategory(renameValue.trim(), renameCategory);
      }
      setRenameTarget(null);
      setRenameValue('');
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-ios-blue/30 border-t-ios-blue rounded-full animate-spin" />
      </div>
    );
  }

  const lists = data?.lists ?? [];

  return (
    <div className="min-h-dvh bg-ios-bg">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ios-text">Our Shopping List</h1>
            <p className="text-xs text-ios-secondary">
              {householdId} · {user?.displayName?.split(' ')[0] || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={signOut}
              className="text-xs text-ios-secondary px-3 py-1.5 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors font-medium"
            >
              Sign out
            </button>
            <button
              onClick={() => setShowLeave(true)}
              className="text-xs text-ios-red px-3 py-1.5 rounded-lg bg-ios-red/10 active:bg-ios-red/20 transition-colors font-medium"
            >
              Leave
            </button>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {lists.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-ios-secondary text-sm">No lists yet</p>
            <p className="text-ios-secondary text-xs mt-1">Tap + to create your first shopping list</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lists.map((list) => {
              const remaining = list.items.filter((i) => !i.completed).length;
              const total = list.items.length;
              return (
                <div
                  key={list.listName}
                  onClick={() => navigate(`/list/${encodeURIComponent(list.listName)}`)}
                  className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center text-xl">
                        {list.icon || '📝'}
                      </div>
                      <div>
                        <h2 className="font-semibold text-ios-text text-[15px]">{list.listName}</h2>
                        <p className="text-xs text-ios-secondary">
                          <span className="text-ios-blue/70 font-medium">{list.category || 'Other'}</span>
                          <span className="mx-1">·</span>
                          {total === 0
                            ? 'No items'
                            : remaining === 0
                              ? `All ${total} done ✓`
                              : `${remaining} item${remaining !== 1 ? 's' : ''} left`}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setRenameTarget(list.listName);
                          setRenameValue(list.listName);
                          setRenameIcon(list.icon || '📝');
                          setRenameCategory((list.category as ListCategory) || 'Other');
                        }}
                        className="p-2 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
                        title="Rename"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(list.listName)}
                        className="p-2 rounded-lg text-ios-red active:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add List FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg shadow-ios-blue/30 flex items-center justify-center active:scale-90 transition-transform z-10"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add List Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <form
            onSubmit={handleAddList}
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-ios-text mb-3">New List</h3>
            <div className="flex items-start gap-3">
              <IconPicker value={newListIcon} onChange={setNewListIcon} />
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Costco, Pharmacy…"
                autoFocus
                className="flex-1 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
              />
            </div>
            <select
              value={newListCategory}
              onChange={(e) => setNewListCategory(e.target.value as ListCategory)}
              className="w-full mt-3 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30 appearance-none"
            >
              {LIST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newListName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:opacity-80 transition-opacity"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenameTarget(null)} />
          <form
            onSubmit={handleRenameList}
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-ios-text mb-3">Rename List</h3>
            <div className="flex items-start gap-3">
              <IconPicker value={renameIcon} onChange={setRenameIcon} />
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                className="flex-1 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
              />
            </div>
            <select
              value={renameCategory}
              onChange={(e) => setRenameCategory(e.target.value as ListCategory)}
              className="w-full mt-3 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30 appearance-none"
            >
              {LIST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete List"
        message={`Are you sure you want to delete "${deleteTarget}"? All items will be lost.`}
        onConfirm={handleDeleteList}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Leave Confirm */}
      <ConfirmDialog
        open={showLeave}
        title="Leave Household"
        message="You'll need to re-enter the Household ID to reconnect."
        confirmLabel="Leave"
        onConfirm={() => {
          leaveHousehold();
          setShowLeave(false);
        }}
        onCancel={() => setShowLeave(false)}
      />
    </div>
  );
}

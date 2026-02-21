import { useState, useRef, useCallback, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold, LIST_CATEGORIES, type ListCategory } from '../hooks/useHousehold';
import ConfirmDialog from '../components/ConfirmDialog';
import IconPicker from '../components/IconPicker';

export default function Dashboard() {
  const { householdId, userHouseholds, leaveHousehold, switchHousehold } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const {
    data, loading, addList, deleteList, renameList, setListIcon, setListCategory,
    reorderLists, renameHousehold, promoteToAdmin, demoteFromAdmin, removeMember,
  } = useHousehold(householdId);
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
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const isAdmin = !!(user && data?.admins?.includes(user.uid));
  const memberCount = data?.members?.length ?? 0;

  const inviteLink = householdId
    ? `${window.location.origin}/join/${householdId}`
    : '';

  async function handleShare() {
    if (!householdId) return;
    const shareData = {
      title: data?.name || 'Our Shopping List',
      text: `Join my household "${data?.name || 'Our Shopping List'}" on Our Shopping List!`,
      url: inviteLink,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      const el = document.createElement('textarea');
      el.value = inviteLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault();
    if (nameInput.trim()) {
      await renameHousehold(nameInput);
      setEditingName(false);
    }
  }

  async function handleRemoveMember() {
    if (removeTarget) {
      await removeMember(removeTarget);
      setRemoveTarget(null);
    }
  }

  // ---- Drag-and-drop state for list reordering ----
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const startYRef = useRef(0);
  const rowHeightsRef = useRef<number[]>([]);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((index: number, clientY: number) => {
    setDragIndex(index);
    setOverIndex(index);
    startYRef.current = clientY;
    if (listContainerRef.current) {
      const rows = listContainerRef.current.querySelectorAll('[data-list-row]');
      rowHeightsRef.current = Array.from(rows).map((r) => r.getBoundingClientRect().height + 12); // 12 = space-y-3 gap
    }
  }, []);

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
      await reorderLists(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  }, [dragIndex, overIndex, reorderLists]);

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

  // Compute display order during drag
  const getDisplayLists = () => {
    const src = data?.lists ?? [];
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return src;
    const items = [...src];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(overIndex, 0, moved);
    return items;
  };

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
  const displayLists = getDisplayLists();

  return (
    <div className="min-h-dvh bg-ios-bg">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {userHouseholds.length > 1 && (
              <button
                onClick={() => setShowSwitcher(true)}
                className="p-1.5 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors flex-shrink-0"
                title="Switch household"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-ios-text truncate">{data?.name || 'Our Shopping List'}</h1>
              <p className="text-xs text-ios-secondary">
                {memberCount} member{memberCount !== 1 ? 's' : ''} · {user?.displayName?.split(' ')[0] || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={handleShare}
                className="text-xs text-ios-blue px-2.5 py-1.5 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20 transition-colors font-medium flex items-center gap-1"
                title="Share invite link"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Invite
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => { setShowSettings(true); setNameInput(data?.name || ''); setEditingName(false); }}
              className="p-2 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
              title="Household settings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
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
          <div ref={listContainerRef} className="space-y-3">
            {displayLists.map((list) => {
              const originalIndex = lists.findIndex((l) => l.listName === list.listName);
              const isDragging = dragIndex !== null && list.listName === lists[dragIndex]?.listName;
              const remaining = list.items.filter((i) => !i.completed).length;
              const total = list.items.length;
              return (
                <div
                  key={list.listName}
                  data-list-row
                  className={`transition-all duration-150 ${isDragging ? 'opacity-50' : ''}`}
                >
                  <div
                    onClick={() => { if (dragIndex === null) navigate(`/list/${encodeURIComponent(list.listName)}`); }}
                    className="bg-white rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <div
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDragStart(originalIndex, e.clientY); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 text-ios-secondary/30"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="9" cy="6" r="2" />
                            <circle cx="15" cy="6" r="2" />
                            <circle cx="9" cy="12" r="2" />
                            <circle cx="15" cy="12" r="2" />
                            <circle cx="9" cy="18" r="2" />
                            <circle cx="15" cy="18" r="2" />
                          </svg>
                        </div>
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
        message="You'll need a new invite link to rejoin."
        confirmLabel="Leave"
        onConfirm={() => {
          leaveHousehold();
          setShowLeave(false);
        }}
        onCancel={() => setShowLeave(false)}
      />

      {/* Remove Member Confirm */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Member"
        message={`Remove ${data?.memberInfo?.[removeTarget || '']?.displayName || 'this member'} from the household?`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Household Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl p-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-ios-text">Household Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg text-ios-secondary active:bg-gray-100"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Household Name */}
              <div>
                <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                  Household Name
                </label>
                {editingName ? (
                  <form onSubmit={handleSaveName} className="flex gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      autoFocus
                      className="flex-1 px-4 py-2.5 bg-ios-bg rounded-xl text-ios-text text-[15px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
                    />
                    <button type="submit" disabled={!nameInput.trim()} className="px-4 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-medium disabled:opacity-40">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingName(false)} className="px-3 py-2.5 rounded-xl bg-ios-bg text-ios-secondary text-sm font-medium">
                      ✕
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-ios-bg rounded-xl">
                    <span className="text-ios-text text-[15px] font-medium">{data?.name || 'Untitled'}</span>
                    {isAdmin && (
                      <button
                        onClick={() => { setNameInput(data?.name || ''); setEditingName(true); }}
                        className="text-ios-blue text-sm font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Invite Link (Admin only) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-2.5 bg-ios-bg rounded-xl text-ios-secondary text-[13px] font-mono truncate">
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleShare}
                      className="px-4 py-2.5 rounded-xl bg-ios-blue text-white text-sm font-medium flex-shrink-0"
                    >
                      {copied ? '✓' : 'Share'}
                    </button>
                  </div>
                  <p className="text-[11px] text-ios-secondary mt-1.5">
                    Only admins can see and share this link.
                  </p>
                </div>
              )}

              {/* Members List */}
              <div>
                <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
                  Members ({memberCount})
                </label>
                <div className="bg-ios-bg rounded-xl divide-y divide-gray-200/60">
                  {(data?.members ?? []).map((uid) => {
                    const info = data?.memberInfo?.[uid];
                    const isSelf = uid === user?.uid;
                    const memberIsAdmin = data?.admins?.includes(uid) ?? false;
                    const adminCount = data?.admins?.length ?? 0;

                    return (
                      <div key={uid} className="flex items-center gap-3 px-4 py-3">
                        {/* Avatar */}
                        <div className="w-9 h-9 bg-ios-blue/15 rounded-full flex items-center justify-center text-ios-blue font-semibold text-sm flex-shrink-0">
                          {(info?.displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-ios-text truncate">
                            {info?.displayName || 'Unknown'}{isSelf ? ' (you)' : ''}
                          </p>
                          <p className="text-[12px] text-ios-secondary truncate">{info?.email || uid}</p>
                        </div>
                        {/* Role Badge */}
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          memberIsAdmin ? 'bg-ios-blue/15 text-ios-blue' : 'bg-gray-200 text-ios-secondary'
                        }`}>
                          {memberIsAdmin ? 'Admin' : 'Member'}
                        </span>
                        {/* Admin actions */}
                        {isAdmin && !isSelf && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {memberIsAdmin ? (
                              adminCount > 1 && (
                                <button
                                  onClick={() => demoteFromAdmin(uid)}
                                  className="text-[11px] text-ios-secondary px-2 py-1 rounded-lg bg-gray-200 active:bg-gray-300"
                                  title="Remove admin role"
                                >
                                  Demote
                                </button>
                              )
                            ) : (
                              <button
                                onClick={() => promoteToAdmin(uid)}
                                className="text-[11px] text-ios-blue px-2 py-1 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20"
                                title="Make admin"
                              >
                                Admin
                              </button>
                            )}
                            <button
                              onClick={() => setRemoveTarget(uid)}
                              className="p-1 rounded-lg text-ios-red active:bg-red-50"
                              title="Remove member"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={signOut}
                  className="w-full py-2.5 rounded-xl text-ios-secondary font-medium bg-ios-bg active:bg-gray-200 transition-colors text-[15px]"
                >
                  Sign out
                </button>
                <button
                  onClick={() => { setShowSettings(false); setShowLeave(true); }}
                  className="w-full py-2.5 rounded-xl text-ios-red font-medium bg-ios-red/8 active:bg-ios-red/15 transition-colors text-[15px]"
                >
                  Leave Household
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Household Switcher Modal */}
      {showSwitcher && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSwitcher(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-ios-text mb-3">Switch Household</h3>
            <div className="space-y-2">
              {userHouseholds.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { switchHousehold(h.id); setShowSwitcher(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    h.id === householdId ? 'bg-ios-blue/10 border border-ios-blue/20' : 'bg-ios-bg active:bg-gray-200'
                  }`}
                >
                  <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center text-lg">🏠</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ios-text text-[15px] truncate">{h.name}</p>
                  </div>
                  {h.id === householdId && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ios-blue flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => { leaveHousehold(); setShowSwitcher(false); }}
              className="w-full mt-4 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-colors text-[15px]"
            >
              Join / Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

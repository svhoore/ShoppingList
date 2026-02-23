import { useState, useRef, useCallback, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold, DEFAULT_CATEGORIES } from '../hooks/useHousehold';
import ConfirmDialog from '../components/ConfirmDialog';
import IconPicker from '../components/IconPicker';
import CategoryPicker from '../components/CategoryPicker';
import SettingsModal from '../components/SettingsModal';
import HouseholdSwitcher from '../components/HouseholdSwitcher';
import { IconSwitch, IconShare, IconCheck, IconSettings, IconPlus, IconEdit, IconTrash, IconDragHandle } from '../components/Icons';
import { shareOrCopy } from '../lib/share';
import ActionsTab from '../components/ActionsTab';

export default function Dashboard() {
  const { householdId, userHouseholds, leaveHousehold, switchHousehold, clearHousehold } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const {
    data, loading, error, addList, deleteList, renameList, setListIcon, setListCategory,
    reorderLists, renameHousehold, setHouseholdIcon, promoteToAdmin, demoteFromAdmin, removeMember, addCategory, removeCategory,
    addActionList, deleteActionList, renameActionList, setActionListIcon, setActionListCategory, reorderActionLists,
    addActionCategory, removeActionCategory,
  } = useHousehold(householdId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showAdd, setShowAdd] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListIcon, setNewListIcon] = useState('📝');
  const [newListCategory, setNewListCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameIcon, setRenameIcon] = useState('📝');
  const [renameCategory, setRenameCategory] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tab, setTab] = useState<'lists' | 'actions'>(
    searchParams.get('tab') === 'actions' ? 'actions' : 'lists'
  );

  const isAdmin = useMemo(() => !!(user && data?.admins?.includes(user.uid)), [user, data?.admins]);
  const memberCount = data?.members?.length ?? 0;
  const inviteLink = useMemo(
    () => (householdId ? `${window.location.origin}/join/${householdId}` : ''),
    [householdId],
  );

  async function handleShare() {
    if (!householdId) return;
    await shareOrCopy(
      {
        title: data?.name || 'Our Shopping List',
        text: `Join my household "${data?.name || 'Our Shopping List'}" on Our Shopping List!`,
        url: inviteLink,
      },
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
    );
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
      rowHeightsRef.current = Array.from(rows).map((r) => r.getBoundingClientRect().height + 12);
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

  const displayLists = useMemo(() => {
    let src = data?.lists ?? [];
    if (categoryFilter) {
      src = src.filter((l) => l.category === categoryFilter);
    }
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return src;
    const items = [...src];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(overIndex, 0, moved);
    return items;
  }, [data?.lists, dragIndex, overIndex, categoryFilter]);

  const allCategories = useMemo(() => {
    const custom = data?.customCategories ?? [];
    return [
      ...DEFAULT_CATEGORIES,
      ...custom.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [data?.customCategories]);

  /** Categories that actually have lists assigned */
  const usedCategories = useMemo(() => {
    const cats = new Set((data?.lists ?? []).map((l) => l.category).filter(Boolean));
    return allCategories.filter((c) => cats.has(c));
  }, [data?.lists, allCategories]);

  const allActionCategories = useMemo(() => {
    const custom = data?.customActionCategories ?? [];
    return [
      ...DEFAULT_CATEGORIES,
      ...custom.filter((c) => !(DEFAULT_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [data?.customActionCategories]);

  const usedActionCategories = useMemo(() => {
    const cats = new Set((data?.actionLists ?? []).map((al) => al.category).filter(Boolean));
    return allActionCategories.filter((c) => cats.has(c));
  }, [data?.actionLists, allActionCategories]);

  async function handleAddList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim() || submitting) return;
    setSubmitting(true);
    await addList(newListName, newListIcon, newListCategory || undefined);
    setNewListName('');
    setNewListIcon('📝');
    setNewListCategory('');
    setShowAdd(false);
    setSubmitting(false);
  }

  async function handleDeleteList() {
    if (deleteTarget) {
      await deleteList(deleteTarget);
      setDeleteTarget(null);
    }
  }

  async function handleRenameList(e: FormEvent) {
    e.preventDefault();
    if (renameTarget && renameValue.trim() && !submitting) {
      setSubmitting(true);
      await renameList(renameTarget, renameValue);
      const list = data?.lists.find((l) => l.listName === renameTarget);
      if (list && list.icon !== renameIcon) {
        await setListIcon(renameValue.trim(), renameIcon);
      }
      if (list && list.category !== renameCategory) {
        await setListCategory(renameValue.trim(), renameCategory);
      }
      setRenameTarget(null);
      setRenameValue('');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg">
        <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="p-3 rounded-lg bg-ios-bg w-11 h-11 flex items-center justify-center flex-shrink-0">
                <div className="w-7 h-7 rounded-lg bg-gray-200/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-5 w-44 bg-gray-200/70 rounded-md" />
                <div className="h-3 w-28 bg-gray-200/60 rounded-md mt-2" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-11 h-11 rounded-lg bg-gray-200/60" />
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gray-200/60 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-40 bg-gray-200/70 rounded-md" />
                    <div className="h-3 w-24 bg-gray-200/60 rounded-md mt-2" />
                  </div>
                </div>
                <div className="h-5 w-16 bg-gray-200/60 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const lists = data?.lists ?? [];

  return (
    <div className="min-h-dvh bg-ios-bg">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setShowSwitcher(true)}
              className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors flex-shrink-0"
              title="Switch or create household"
            >
              {data?.icon ? (
                <img src={data.icon} alt="" className="w-7 h-7 rounded-lg object-cover" />
              ) : (
                <IconSwitch />
              )}
            </button>
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
                  <><IconCheck size={14} strokeWidth={2.5} />Copied!</>
                ) : (
                  <><IconShare />Invite</>
                )}
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
              title="Household settings"
            >
              <IconSettings />
            </button>
          </div>
        </div>
        {/* Tab Toggle */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="flex bg-ios-bg/80 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab('lists')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                tab === 'lists' ? 'bg-white text-ios-text shadow-sm' : 'text-ios-secondary'
              }`}
            >
              🛒 Lists
            </button>
            <button
              onClick={() => setTab('actions')}
              className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                tab === 'actions' ? 'bg-white text-ios-text shadow-sm' : 'text-ios-secondary'
              }`}
            >
              📋 Actions
            </button>
          </div>
        </div>
      </div>

      {/* Lists tab */}
      {tab === 'lists' && (
      <>
      {/* View All Items card */}
        <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
          <div
            onClick={() => navigate('/list/all')}
            className="bg-gradient-to-r from-ios-blue/5 to-ios-blue/10 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm border border-ios-blue/15"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ios-blue/15 rounded-xl flex items-center justify-center text-xl">
                📦
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-ios-text text-[15px]">All Items</h2>
                <p className="text-xs text-ios-secondary">
                  {lists.length === 0
                    ? 'No lists yet'
                    : `${lists.reduce((s, l) => s + l.items.filter(i => !i.completed).length, 0)} active across ${lists.length} list${lists.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <span className="text-ios-blue text-sm font-medium">View →</span>
            </div>
          </div>
        </div>

      {/* Category Filter */}
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
        {lists.length > 0 && usedCategories.length === 0 && (
          <p className="text-xs text-ios-secondary mt-1">
            Assign categories to lists to enable filtering.
          </p>
        )}
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
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Drag Handle */}
                        <div
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDragStart(originalIndex, e.clientY); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 text-ios-secondary/30"
                        >
                          <IconDragHandle />
                        </div>
                        <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center text-xl">
                          {list.icon || '📝'}
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-ios-text text-[15px] truncate">{list.listName}</h2>
                          {list.category && (
                            <p className="text-xs text-ios-secondary truncate">{list.category}</p>
                          )}
                        </div>
                      </div>

                      {/* Status badge + action buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-ios-bg text-ios-secondary whitespace-nowrap">
                          {total === 0
                            ? 'No items'
                            : remaining === 0
                              ? `Done ${total} ✓`
                              : `${remaining} left`}
                        </span>
                        <button
                          onClick={() => {
                            setRenameTarget(list.listName);
                            setRenameValue(list.listName);
                            setRenameIcon(list.icon || '📝');
                          setRenameCategory(list.category || '');
                          }}
                          className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
                          title="Rename"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(list.listName)}
                          className="p-3 rounded-lg text-ios-red active:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <IconTrash />
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
        <IconPlus />
      </button>
      </>
      )}

      {tab === 'actions' && (
        <ActionsTab
          data={data}
          addActionList={addActionList}
          deleteActionList={deleteActionList}
          renameActionList={renameActionList}
          setActionListIcon={setActionListIcon}
          setActionListCategory={setActionListCategory}
          reorderActionLists={reorderActionLists}
          addActionCategory={addActionCategory}
          allActionCategories={allActionCategories}
          usedActionCategories={usedActionCategories}
        />
      )}

      {/* Add List Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <form
            onSubmit={handleAddList}
            className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-ios-text mb-3">New List</h3>
            <div className="flex items-center gap-3">
              <IconPicker value={newListIcon} onChange={setNewListIcon} />
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Costco, Pharmacy…"
                autoFocus
                maxLength={60}
                className="flex-1 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
              />
            </div>
            <div className="mt-2 text-xs text-ios-secondary flex items-center gap-2">
              <span className="text-base leading-none">{newListIcon}</span>
              <span className="truncate">
                {(newListName.trim() || 'List name')}{newListCategory ? ` · ${newListCategory}` : ''}
              </span>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">Category</label>
              <CategoryPicker
                value={newListCategory}
                onChange={(cat) => setNewListCategory(cat)}
                customCategories={data?.customCategories}
                onAddCategory={addCategory}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newListName.trim() || submitting}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {submitting ? 'Creating…' : 'Create'}
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
            <div className="flex items-center gap-3">
              <IconPicker value={renameIcon} onChange={setRenameIcon} />
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                maxLength={60}
                className="flex-1 px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] focus:outline-none focus:ring-2 focus:ring-ios-blue/30"
              />
            </div>
            <div className="mt-2 text-xs text-ios-secondary flex items-center gap-2">
              <span className="text-base leading-none">{renameIcon}</span>
              <span className="truncate">
                {(renameValue.trim() || 'List name')}{renameCategory ? ` · ${renameCategory}` : ''}
              </span>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">Category</label>
              <CategoryPicker
                value={renameCategory}
                onChange={(cat) => setRenameCategory(cat)}
                customCategories={data?.customCategories}
                onAddCategory={addCategory}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameValue.trim() || submitting}
                className="flex-1 py-2.5 rounded-xl bg-ios-blue text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {submitting ? 'Saving…' : 'Save'}
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

      {/* Household Settings Modal */}
      {showSettings && (
        <SettingsModal
          data={data}
          user={user}
          isAdmin={isAdmin}
          inviteLink={inviteLink}
          onClose={() => setShowSettings(false)}
          onLeave={leaveHousehold}
          renameHousehold={renameHousehold}
          setHouseholdIcon={setHouseholdIcon}
          promoteToAdmin={promoteToAdmin}
          demoteFromAdmin={demoteFromAdmin}
          removeMember={removeMember}
          removeCategory={removeCategory}
          removeActionCategory={removeActionCategory}
          signOut={signOut}
        />
      )}

      {/* Household Switcher Modal */}
      {showSwitcher && (
        <HouseholdSwitcher
          householdId={householdId}
          userHouseholds={userHouseholds}
          switchHousehold={switchHousehold}
          onCreateNew={clearHousehold}
          onClose={() => setShowSwitcher(false)}
        />
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-ios-red text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
}

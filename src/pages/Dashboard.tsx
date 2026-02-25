import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../hooks/useHousehold';
import { useListCategories, useActionCategories } from '../hooks/useCategories';
import { useDragReorder } from '../hooks/useDragReorder';
import ConfirmDialog from '../components/ConfirmDialog';
import ListFormModal from '../components/ListFormModal';
import SettingsModal from '../components/SettingsModal';
import HouseholdSwitcher from '../components/HouseholdSwitcher';
import { IconSwitch, IconSettings, IconPlus, IconEdit, IconTrash, IconDragHandle, IconReorder } from '../components/Icons';
import ActionsTab from '../components/ActionsTab';
import ErrorToast from '../components/ErrorToast';

export default function Dashboard() {
  const { householdId, userHouseholds, leaveHousehold, switchHousehold, clearHousehold } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const {
    data, loading, error, addList, deleteList, renameList, setListIcon, setListCategory, setListBonusEnabled,
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
  const [renameBonusEnabled, setRenameBonusEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [tab, setTab] = useState<'lists' | 'actions'>(
    searchParams.get('tab') === 'actions' ? 'actions' : 'lists'
  );

  const isAdmin = useMemo(() => !!(user && data?.admins?.includes(user.uid)), [user, data?.admins]);
  const memberCount = data?.members?.length ?? 0;
  const inviteLink = useMemo(
    () => (householdId ? `${window.location.origin}/join/${householdId}` : ''),
    [householdId],
  );

  // ---- Drag-and-drop for list reordering ----
  const handleListReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    const allLists = data?.lists ?? [];
    if (categoryFilter) {
      const filtered = allLists.filter((l) => l.category === categoryFilter);
      const fromFull = allLists.findIndex((l) => l.listName === filtered[fromIdx]?.listName);
      const toFull = allLists.findIndex((l) => l.listName === filtered[toIdx]?.listName);
      if (fromFull !== -1 && toFull !== -1) await reorderLists(fromFull, toFull);
    } else {
      await reorderLists(fromIdx, toIdx);
    }
  }, [data?.lists, categoryFilter, reorderLists]);

  const { dragIndex, overIndex, containerRef: listContainerRef, handleDragStart } = useDragReorder('[data-list-row]', handleListReorder, 12);

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

  const { usedCategories } = useListCategories(data);
  const { allActionCategories, usedActionCategories } = useActionCategories(data);

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
      if (list && !!list.bonusEnabled !== renameBonusEnabled) {
        await setListBonusEnabled(renameValue.trim(), renameBonusEnabled);
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
            <button
              onClick={() => setReorderMode(!reorderMode)}
              className={`p-3 rounded-lg transition-colors ${reorderMode ? 'text-ios-blue bg-ios-blue/10' : 'text-ios-secondary active:bg-gray-100'}`}
              title={reorderMode ? 'Done reordering' : 'Reorder lists'}
            >
              <IconReorder size={20} />
            </button>
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
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-ios-secondary text-sm">No lists yet</p>
            <p className="text-ios-secondary text-xs mt-1">Tap + to create your first shopping list</p>
          </div>
        ) : (
          <div ref={listContainerRef} className="space-y-3">
            {displayLists.map((list, displayIdx) => {
              const isDragging = displayIdx === dragIndex;
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
                        {reorderMode && (
                        <div
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDragStart(displayIdx, e.clientY); }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 text-ios-secondary/30"
                        >
                          <IconDragHandle />
                        </div>
                        )}
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
                          setRenameBonusEnabled(!!list.bonusEnabled);
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
          reorderMode={reorderMode}
        />
      )}

      {/* Add List Modal */}
      {showAdd && (
        <ListFormModal
          title="New List"
          name={newListName}
          onNameChange={setNewListName}
          icon={newListIcon}
          onIconChange={setNewListIcon}
          category={newListCategory}
          onCategoryChange={setNewListCategory}
          customCategories={data?.customCategories}
          onAddCategory={addCategory}
          placeholder="e.g. Costco, Pharmacy…"
          submitting={submitting}
          submitLabel={['Creating…', 'Create']}
          onSubmit={handleAddList}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <ListFormModal
          title="Rename List"
          name={renameValue}
          onNameChange={setRenameValue}
          icon={renameIcon}
          onIconChange={setRenameIcon}
          category={renameCategory}
          onCategoryChange={setRenameCategory}
          customCategories={data?.customCategories}
          onAddCategory={addCategory}
          submitting={submitting}
          submitLabel={['Saving…', 'Save']}
          onSubmit={handleRenameList}
          onClose={() => setRenameTarget(null)}
        >
          <div className="mt-3 flex items-center justify-between">
            <label className="text-sm font-medium text-ios-text">🏷️ Enable Bonus tag</label>
            <button
              type="button"
              onClick={() => setRenameBonusEnabled(!renameBonusEnabled)}
              className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                renameBonusEnabled ? 'bg-ios-green' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-md transition-transform duration-200 ${
                  renameBonusEnabled ? 'translate-x-[20px]' : ''
                }`}
              />
            </button>
          </div>
        </ListFormModal>
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

      <p className="text-center text-[11px] text-ios-secondary/50 py-4">v{__APP_VERSION__}</p>

      <ErrorToast error={error} />
    </div>
  );
}

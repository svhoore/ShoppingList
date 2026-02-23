import { useState, useMemo, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { HouseholdData } from '../hooks/useHousehold';
import ListFormModal from './ListFormModal';
import ConfirmDialog from './ConfirmDialog';
import { IconPlus, IconEdit, IconTrash, IconDragHandle } from './Icons';
import { useDragReorder } from '../hooks/useDragReorder';

interface ActionsTabProps {
  data: HouseholdData | null;
  addActionList: (name: string, icon: string, category?: string) => Promise<void>;
  deleteActionList: (name: string) => Promise<void>;
  renameActionList: (oldName: string, newName: string) => Promise<void>;
  setActionListIcon: (name: string, icon: string) => Promise<void>;
  setActionListCategory: (name: string, category: string) => Promise<void>;
  reorderActionLists: (fromIndex: number, toIndex: number) => Promise<void>;
  addActionCategory: (name: string) => Promise<void>;
  allActionCategories: string[];
  usedActionCategories: string[];
  reorderMode?: boolean;
}

export default function ActionsTab({
  data, addActionList, deleteActionList, renameActionList,
  setActionListIcon, setActionListCategory, reorderActionLists,
  addActionCategory, usedActionCategories, reorderMode,
}: ActionsTabProps) {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [newCategory, setNewCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameIcon, setRenameIcon] = useState('📋');
  const [renameCategory, setRenameCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const actionLists = data?.actionLists ?? [];

  // ---- Drag-and-drop for list reordering ----
  const handleListReorder = useCallback(async (fromIdx: number, toIdx: number) => {
    if (categoryFilter) {
      const filtered = actionLists.filter((al) => al.category === categoryFilter);
      const fromFull = actionLists.findIndex((al) => al.listName === filtered[fromIdx]?.listName);
      const toFull = actionLists.findIndex((al) => al.listName === filtered[toIdx]?.listName);
      if (fromFull !== -1 && toFull !== -1) await reorderActionLists(fromFull, toFull);
    } else {
      await reorderActionLists(fromIdx, toIdx);
    }
  }, [actionLists, categoryFilter, reorderActionLists]);

  const { dragIndex, overIndex, containerRef: listContainerRef, handleDragStart } = useDragReorder('[data-action-list-row]', handleListReorder, 12);

  const displayLists = useMemo(() => {
    let src = actionLists;
    if (categoryFilter) {
      src = src.filter((al) => al.category === categoryFilter);
    }
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return src;
    const items = [...src];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(overIndex, 0, moved);
    return items;
  }, [actionLists, dragIndex, overIndex, categoryFilter]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim() || submitting) return;
    setSubmitting(true);
    await addActionList(newName.trim(), newIcon, newCategory || undefined);
    setShowAdd(false);
    setNewName('');
    setNewIcon('📋');
    setNewCategory('');
    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteActionList(deleteTarget);
    setDeleteTarget(null);
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim() || submitting) return;
    setSubmitting(true);
    if (renameValue.trim() !== renameTarget) {
      await renameActionList(renameTarget, renameValue.trim());
    }
    const target = renameValue.trim() !== renameTarget ? renameValue.trim() : renameTarget;
    const currentAl = actionLists.find(al => al.listName === renameTarget);
    if (renameIcon !== currentAl?.icon) {
      await setActionListIcon(target, renameIcon);
    }
    if (renameCategory !== (currentAl?.category ?? '')) {
      await setActionListCategory(target, renameCategory);
    }
    setRenameTarget(null);
    setSubmitting(false);
  }

  function openRename(name: string) {
    const al = actionLists.find(l => l.listName === name);
    setRenameTarget(name);
    setRenameValue(name);
    setRenameIcon(al?.icon ?? '📋');
    setRenameCategory(al?.category ?? '');
  }

  return (
    <>
      {/* View All Actions card */}
        <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
          <div
            onClick={() => navigate('/actions/all')}
            className="bg-gradient-to-r from-ios-blue/5 to-ios-blue/10 rounded-2xl p-4 active:scale-[0.98] transition-transform cursor-pointer shadow-sm border border-ios-blue/15"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ios-blue/15 rounded-xl flex items-center justify-center text-xl">
                📋
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-ios-text text-[15px]">All Actions</h2>
                <p className="text-xs text-ios-secondary">
                  {actionLists.length === 0
                    ? 'No action lists yet'
                    : `${actionLists.reduce((s, al) => s + al.items.filter(a => !a.completed).length, 0)} active across ${actionLists.length} list${actionLists.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <span className="text-ios-blue text-sm font-medium">View →</span>
            </div>
          </div>
        </div>

      {/* Category Filter */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-0">
        {usedActionCategories.length > 0 && (
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
            {usedActionCategories.map((cat) => (
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
        {actionLists.length > 0 && usedActionCategories.length === 0 && (
          <p className="text-xs text-ios-secondary mt-1">
            Assign categories to lists to enable filtering.
          </p>
        )}
      </div>

      {/* Action List cards — matches Lists tab layout */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        {actionLists.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-ios-secondary text-sm">No action lists yet</p>
            <p className="text-ios-secondary text-xs mt-1">Tap + to create your first action list</p>
          </div>
        ) : (
          <div ref={listContainerRef} className="space-y-3">
            {displayLists.map(al => {
            const originalIndex = actionLists.findIndex((l) => l.listName === al.listName);
            const isDragging = dragIndex !== null && al.listName === actionLists[dragIndex]?.listName;
            const active = al.items.filter(a => !a.completed).length;
            const done = al.items.filter(a => a.completed).length;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const overdue = al.items.filter(a => !a.completed && a.dueDate && new Date(a.dueDate + 'T00:00:00') < today).length;

            return (
              <div
                key={al.listName}
                data-action-list-row
                className={`transition-all duration-150 ${isDragging ? 'opacity-50' : ''}`}
              >
                <div
                  onClick={() => { if (dragIndex === null) navigate(`/actions/${encodeURIComponent(al.listName)}`); }}
                  className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Drag Handle */}
                      {reorderMode && (
                      <div
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handleDragStart(originalIndex, e.clientY); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 text-ios-secondary/30"
                      >
                        <IconDragHandle />
                      </div>
                      )}
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-ios-blue/10 flex items-center justify-center text-xl flex-shrink-0">
                        {al.icon || '📋'}
                      </div>

                      {/* Name & category */}
                      <div className="min-w-0">
                        <h2 className="font-semibold text-ios-text text-[15px] truncate">{al.listName}</h2>
                        {al.category && (
                          <p className="text-xs text-ios-secondary truncate">{al.category}</p>
                        )}
                      </div>
                    </div>

                    {/* Status badge + action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-ios-bg text-ios-secondary whitespace-nowrap">
                        {al.items.length === 0
                          ? 'No actions'
                          : active === 0
                            ? `Done ${done} ✓`
                            : `${active} left`}
                      </span>
                      {overdue > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-ios-red whitespace-nowrap">
                          {overdue} overdue
                        </span>
                      )}
                      <button
                        onClick={() => openRename(al.listName)}
                        className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
                        title="Rename"
                      >
                        <IconEdit />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(al.listName)}
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

      {/* Add Action List FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg shadow-ios-blue/30 flex items-center justify-center active:scale-90 transition-transform z-10"
      >
        <IconPlus />
      </button>

      {/* Add Action List Modal */}
      {showAdd && (
        <ListFormModal
          title="New Action List"
          name={newName}
          onNameChange={setNewName}
          icon={newIcon}
          onIconChange={setNewIcon}
          category={newCategory}
          onCategoryChange={setNewCategory}
          customCategories={data?.customActionCategories}
          onAddCategory={addActionCategory}
          placeholder="Action list name"
          previewFallback="Action list name"
          submitting={submitting}
          submitLabel={['Creating…', 'Create']}
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Rename Modal */}
      {renameTarget && (
        <ListFormModal
          title="Rename Action List"
          name={renameValue}
          onNameChange={setRenameValue}
          icon={renameIcon}
          onIconChange={setRenameIcon}
          category={renameCategory}
          onCategoryChange={setRenameCategory}
          customCategories={data?.customActionCategories}
          onAddCategory={addActionCategory}
          previewFallback="Action list name"
          submitting={submitting}
          submitLabel={['Saving…', 'Save']}
          onSubmit={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Action List"
        message={`Are you sure you want to delete "${deleteTarget}"? All actions will be lost.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

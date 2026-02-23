import { useState, useRef, useMemo, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useHousehold, type ActionItem, type ActionPriority } from '../hooks/useHousehold';
import type { MemberInfo } from '../context/HouseholdContext';
import SwipeableItem from '../components/SwipeableItem';
import ConfirmDialog from '../components/ConfirmDialog';
import ListFormModal from '../components/ListFormModal';
import ActionFormModal from '../components/ActionFormModal';
import ActionRow from '../components/ActionRow';
import { IconHome, IconMoreVertical, IconEye, IconEyeOff, IconEdit, IconTrash, IconPlus } from '../components/Icons';
import ErrorToast from '../components/ErrorToast';
import { useDragReorder } from '../hooks/useDragReorder';

const PRIORITY_FILTERS: { value: ActionPriority | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/** Inline quick-add row used in multiple places within ActionsView */
function QuickAddRow({ quickRef, quickText, setQuickText, handleQuickKeyDown, openAdd, showDetailButton = true }: {
  quickRef: React.RefObject<HTMLInputElement | null>;
  quickText: string;
  setQuickText: (v: string) => void;
  handleQuickKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  openAdd?: () => void;
  showDetailButton?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-ios-bg border-t border-gray-100">
      <div className="w-[22px] h-[22px] rounded-full border-2 border-gray-200 flex-shrink-0" />
      <input
        ref={quickRef}
        type="text"
        value={quickText}
        onChange={(e) => setQuickText(e.target.value)}
        onKeyDown={handleQuickKeyDown}
        placeholder="Add a quick action…"
        enterKeyHint="done"
        maxLength={200}
        className="flex-1 text-[15px] text-ios-text placeholder:text-ios-secondary/40 bg-transparent focus:outline-none py-0.5"
      />
      {showDetailButton && openAdd && (
        <button
          onClick={openAdd}
          className="text-xs text-ios-blue font-medium px-2 py-1 rounded-lg active:bg-ios-blue/10"
          title="Add with details"
        >
          + Detail
        </button>
      )}
    </div>
  );
}

export default function ActionsView() {
  const { listName: rawListName } = useParams<{ listName: string }>();
  const listName = decodeURIComponent(rawListName || '');
  const navigate = useNavigate();

  const { householdId } = useHouseholdContext();
  const {
    data, loading, addAction, editAction, toggleAction, deleteAction,
    deleteActionList, renameActionList, setActionListIcon, setActionListCategory,
    clearCompletedActions, reorderActionItems, addActionCategory, error,
  } = useHousehold(householdId);

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<ActionItem | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeleteList, setShowDeleteList] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [renameValue, setRenameValue] = useState(listName);
  const [renameIcon, setRenameIcon] = useState('📋');
  const [renameCategory, setRenameCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<ActionPriority | null>(null);

  // Form state
  const [formText, setFormText] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAssignees, setFormAssignees] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<ActionPriority>('medium');

  const actionList = data?.actionLists.find((al) => al.listName === listName);
  const allItems = actionList?.items ?? [];
  const memberInfo = data?.memberInfo ?? {};

  const activeItems = useMemo(() => {
    let items = allItems.filter((a) => !a.completed);
    if (priorityFilter) items = items.filter((a) => a.priority === priorityFilter);
    return items;
  }, [allItems, priorityFilter]);

  const completedItems = useMemo(
    () => allItems.filter((a) => a.completed),
    [allItems],
  );

  const members = useMemo(
    () => (data?.members ?? [])
      .map(uid => ({ uid, info: data?.memberInfo?.[uid] }))
      .filter((m): m is { uid: string; info: MemberInfo } => !!m.info),
    [data?.members, data?.memberInfo],
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allItems.filter(a => !a.completed && a.dueDate && new Date(a.dueDate + 'T00:00:00') < today).length;
  }, [allItems]);

  // ---- Inline add (quick) ----
  const [quickText, setQuickText] = useState('');
  const quickRef = useRef<HTMLInputElement>(null);

  // ---- Drag-and-drop ----
  const handleReorder = useCallback(async (from: number, to: number) => {
    await reorderActionItems(listName, from, to);
  }, [listName, reorderActionItems]);

  const { dragIndex, overIndex, containerRef: listContainerRef, handleDragStart } = useDragReorder('[data-drag-row]', handleReorder);

  const displayItems = useMemo(() => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return activeItems;
    const items = [...activeItems];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(overIndex, 0, moved);
    return items;
  }, [activeItems, dragIndex, overIndex]);

  async function handleQuickAdd(e?: FormEvent) {
    e?.preventDefault();
    if (!quickText.trim()) return;
    await addAction(listName, quickText, [], null, 'medium');
    setQuickText('');
    quickRef.current?.focus();
  }

  function handleQuickKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
  }

  // ---- Full add modal ----
  function openAdd() {
    setFormText('');
    setFormDescription('');
    setFormImageUrl('');
    setFormAssignees([]);
    setFormDueDate('');
    setFormPriority('medium');
    setShowAdd(true);
  }

  function openEdit(action: ActionItem) {
    setFormText(action.text);
    setFormDescription(action.description || '');
    setFormImageUrl(action.imageUrl || '');
    setFormAssignees([...action.assignees]);
    setFormDueDate(action.dueDate || '');
    setFormPriority(action.priority);
    setEditTarget(action);
  }

  function toggleAssignee(uid: string) {
    setFormAssignees(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid],
    );
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!formText.trim() || submitting) return;
    setSubmitting(true);
    await addAction(listName, formText.trim(), formAssignees, formDueDate || null, formPriority, formDescription, formImageUrl);
    setShowAdd(false);
    setSubmitting(false);
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    if (!editTarget || !formText.trim() || submitting) return;
    setSubmitting(true);
    await editAction(listName, editTarget.id, {
      text: formText.trim(),
      description: formDescription,
      imageUrl: formImageUrl,
      assignees: formAssignees,
      dueDate: formDueDate || null,
      priority: formPriority,
    });
    setEditTarget(null);
    setSubmitting(false);
  }

  async function handleDeleteList() {
    if (submitting) return;
    setSubmitting(true);
    await deleteActionList(listName);
    navigate('/?tab=actions', { replace: true });
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const renamed = trimmed !== listName;
    if (renamed) await renameActionList(listName, trimmed);
    const target = renamed ? trimmed : listName;
    if (renameIcon !== (actionList?.icon || '📋')) await setActionListIcon(target, renameIcon);
    if (renameCategory !== (actionList?.category ?? '')) await setActionListCategory(target, renameCategory);
    if (renamed) navigate(`/actions/${encodeURIComponent(trimmed)}`, { replace: true });
    setShowRename(false);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex flex-col">
        <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-b border-gray-200/60">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 -ml-1 rounded-lg bg-ios-bg w-11 h-11 flex items-center justify-center">
                <div className="w-6 h-6 bg-gray-200/70 rounded-md" />
              </div>
              <div className="h-5 w-40 bg-gray-200/70 rounded-md" />
            </div>
            <div className="w-11 h-11 rounded-lg bg-gray-200/60" />
          </div>
        </div>
        <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-3">
                <div className="w-[22px] h-[22px] rounded-full bg-gray-200/60 flex-shrink-0" />
                <div className="h-4 bg-gray-200/70 rounded-md flex-1" />
              </div>
            ))}
            <div className="px-4 py-2.5 bg-ios-bg">
              <div className="h-4 bg-gray-200/60 rounded-md w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!actionList) {
    return (
      <div className="min-h-dvh bg-ios-bg flex flex-col items-center justify-center p-6">
        <p className="text-ios-secondary mb-4">Action list not found</p>
        <button onClick={() => navigate('/?tab=actions')} className="text-ios-blue font-medium">
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
              onClick={() => navigate('/?tab=actions')}
              className="p-3 -ml-1 text-ios-blue active:bg-ios-blue/10 transition-colors rounded-lg"
              aria-label="Home"
            >
              <IconHome />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{actionList.icon}</span>
              <div>
                <h1 className="text-xl font-bold text-ios-text">{listName}</h1>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ios-secondary">
                    {allItems.filter(a => !a.completed).length} active
                  </span>
                  {overdueCount > 0 && (
                    <span className="text-xs text-ios-red font-medium">· {overdueCount} overdue</span>
                  )}
                  {completedItems.length > 0 && (
                    <span className="text-xs text-ios-secondary">· {completedItems.length} done</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Options button */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-3 rounded-lg text-ios-secondary active:bg-gray-100 transition-colors"
            >
              <IconMoreVertical />
            </button>
            {showOptions && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowOptions(false)} />
                <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200/80 overflow-hidden min-w-[200px]">
                  <button
                    onClick={() => { setShowCompleted(!showCompleted); setShowOptions(false); }}
                    className="w-full px-4 py-3 text-left text-[15px] text-ios-text active:bg-gray-50 flex items-center gap-3"
                  >
                    {showCompleted ? <IconEye className="text-ios-blue" /> : <IconEyeOff className="text-ios-blue" />}
                    {showCompleted ? 'Hide completed' : `Show completed (${completedItems.length})`}
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => { setRenameValue(listName); setRenameIcon(actionList.icon || '📋'); setRenameCategory(actionList.category || ''); setShowRename(true); setShowOptions(false); }}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {/* Priority filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {PRIORITY_FILTERS.map(f => (
            <button
              key={f.value ?? 'all'}
              onClick={() => setPriorityFilter(priorityFilter === f.value ? null : f.value)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                priorityFilter === f.value
                  ? 'bg-ios-blue text-white'
                  : 'bg-white text-ios-secondary active:bg-gray-100 shadow-sm'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Active Items */}
        {activeItems.length > 0 ? (
          <div ref={listContainerRef} className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            {displayItems.map(action => {
              const isDragging = dragIndex !== null && action.id === activeItems[dragIndex]?.id;
              return (
                <div
                  key={action.id}
                  data-drag-row
                  className={`transition-all duration-150 ${isDragging ? 'opacity-50 bg-ios-blue/5' : ''}`}
                >
                  <SwipeableItem onDelete={() => deleteAction(listName, action.id)} onComplete={() => toggleAction(listName, action.id)}>
                    <ActionRow
                      action={action}
                      memberInfo={memberInfo}
                      onToggle={() => toggleAction(listName, action.id)}
                      onEdit={(text) => editAction(listName, action.id, { text })}
                      onDelete={() => deleteAction(listName, action.id)}
                      onTap={() => openEdit(action)}
                      onDragStart={(clientY) => handleDragStart(activeItems.findIndex((a) => a.id === action.id), clientY)}
                      isDragging={isDragging}
                    />
                  </SwipeableItem>
                </div>
              );
            })}
            <QuickAddRow quickRef={quickRef} quickText={quickText} setQuickText={setQuickText} handleQuickKeyDown={handleQuickKeyDown} openAdd={openAdd} />
          </div>
        ) : allItems.length === 0 ? (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-ios-secondary text-sm">No actions yet</p>
              <p className="text-ios-secondary text-xs mt-1">Start typing below to add one</p>
            </div>
            <QuickAddRow quickRef={quickRef} quickText={quickText} setQuickText={setQuickText} handleQuickKeyDown={handleQuickKeyDown} openAdd={openAdd} />
          </div>
        ) : priorityFilter ? (
          <>
            <div className="text-center py-16">
              <p className="text-ios-secondary text-sm">No {priorityFilter} priority actions</p>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <QuickAddRow quickRef={quickRef} quickText={quickText} setQuickText={setQuickText} handleQuickKeyDown={handleQuickKeyDown} showDetailButton={false} />
            </div>
          </>
        ) : null}

        {/* Completed section */}
        {showCompleted && completedItems.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-medium text-ios-secondary uppercase tracking-wide">
                Completed ({completedItems.length})
              </p>
              <button
                onClick={() => clearCompletedActions(listName)}
                className="text-xs text-ios-red font-medium active:opacity-60"
              >
                Clear all
              </button>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {completedItems.map(action => (
                <SwipeableItem key={action.id} onDelete={() => deleteAction(listName, action.id)} onComplete={() => toggleAction(listName, action.id)}>
                  <ActionRow
                    action={action}
                    memberInfo={memberInfo}
                    onToggle={() => toggleAction(listName, action.id)}
                    onEdit={(text) => editAction(listName, action.id, { text })}
                    onDelete={() => deleteAction(listName, action.id)}
                  />
                </SwipeableItem>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB for detailed add */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ios-blue text-white rounded-full shadow-lg shadow-ios-blue/30 flex items-center justify-center active:scale-90 transition-transform z-10"
      >
        <IconPlus />
      </button>

      {/* Add Action Modal */}
      {showAdd && (
        <ActionFormModal
          formText={formText}
          setFormText={setFormText}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formImageUrl={formImageUrl}
          setFormImageUrl={setFormImageUrl}
          formAssignees={formAssignees}
          toggleAssignee={toggleAssignee}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formPriority={formPriority}
          setFormPriority={setFormPriority}
          members={members}
          submitting={submitting}
          householdId={householdId!}
          title="New Action"
          submitLabel="Create"
          onSubmit={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit Action Modal */}
      {editTarget && (
        <ActionFormModal
          formText={formText}
          setFormText={setFormText}
          formDescription={formDescription}
          setFormDescription={setFormDescription}
          formImageUrl={formImageUrl}
          setFormImageUrl={setFormImageUrl}
          formAssignees={formAssignees}
          toggleAssignee={toggleAssignee}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formPriority={formPriority}
          setFormPriority={setFormPriority}
          members={members}
          submitting={submitting}
          householdId={householdId!}
          title="Edit Action"
          submitLabel="Save"
          onSubmit={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Rename Modal */}
      {showRename && (
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
          onClose={() => setShowRename(false)}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={showDeleteList}
        title="Delete Action List"
        message={`Delete "${listName}" and all its actions? This can't be undone.`}
        onConfirm={handleDeleteList}
        onCancel={() => setShowDeleteList(false)}
      />

      <ErrorToast error={error} />
    </div>
  );
}

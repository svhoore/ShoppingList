import { arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { updateDoc } from 'firebase/firestore';
import type { HouseholdBaseContext, ActionItem, ActionPriority } from './useHouseholdBase';

/**
 * Factory that creates all action-list, action-item, and action-inbox operations.
 */
export function createActionOps(ctx: HouseholdBaseContext) {
  const { updateActionLists, getRef, getActionLists, getActionInbox, setError } = ctx;

  // ---- Action List CRUD ----

  const addActionList = (name: string, icon = '📋', category?: string) =>
    updateActionLists(
      (als) => {
        if (als.some((a) => a.listName.toLowerCase() === name.trim().toLowerCase())) return false;
        als.push({ listName: name.trim(), icon, category: category || '', items: [] });
      },
      'Failed to add action list',
      category ? { customActionCategories: arrayUnion(category) } : undefined,
    );

  const renameActionList = (oldName: string, newName: string) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === oldName);
      if (!al) return false;
      al.listName = newName.trim();
    }, 'Failed to rename action list');

  const deleteActionList = (name: string) =>
    updateActionLists((als) => {
      const idx = als.findIndex((a) => a.listName === name);
      if (idx === -1) return false;
      als.splice(idx, 1);
    }, 'Failed to delete action list');

  const setActionListIcon = (listName: string, icon: string) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      al.icon = icon;
    }, 'Failed to set action list icon');

  const setActionListCategory = (listName: string, category: string) =>
    updateActionLists(
      (als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        al.category = category;
      },
      'Failed to set action list category',
      category ? { customActionCategories: arrayUnion(category) } : undefined,
    );

  // ---- Action List reorder ----

  const reorderActionLists = (fromIndex: number, toIndex: number) =>
    updateActionLists((als) => {
      if (fromIndex < 0 || fromIndex >= als.length || toIndex < 0 || toIndex >= als.length) return false;
      const [moved] = als.splice(fromIndex, 1);
      als.splice(toIndex, 0, moved);
    }, 'Failed to reorder action lists');

  const reorderActionItems = (listName: string, fromIndex: number, toIndex: number) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      const active = al.items.filter((i) => !i.completed);
      const done = al.items.filter((i) => i.completed);
      if (fromIndex < 0 || fromIndex >= active.length || toIndex < 0 || toIndex >= active.length) return false;
      const [moved] = active.splice(fromIndex, 1);
      active.splice(toIndex, 0, moved);
      al.items = [...active, ...done];
    }, 'Failed to reorder actions');

  // ---- Action item CRUD ----

  const addAction = (listName: string, text: string, assignees: string[], dueDate: string | null, priority: ActionPriority) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      al.items.push({
        id: uuidv4(), text: text.trim(), completed: false,
        assignees, dueDate, priority, createdAt: Date.now(),
      });
    }, 'Failed to add action');

  const editAction = (listName: string, actionId: string, updates: Partial<Pick<ActionItem, 'text' | 'assignees' | 'dueDate' | 'priority'>>) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      const action = al.items.find((i) => i.id === actionId);
      if (!action) return false;
      if (updates.text !== undefined) {
        const trimmed = updates.text.trim();
        if (!trimmed) return false;
        action.text = trimmed;
      }
      if (updates.assignees !== undefined) action.assignees = updates.assignees;
      if (updates.dueDate !== undefined) action.dueDate = updates.dueDate;
      if (updates.priority !== undefined) action.priority = updates.priority;
    }, 'Failed to edit action');

  const toggleAction = (listName: string, actionId: string) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      const action = al.items.find((i) => i.id === actionId);
      if (!action) return false;
      action.completed = !action.completed;
    }, 'Failed to toggle action');

  const deleteAction = (listName: string, actionId: string) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      al.items = al.items.filter((i) => i.id !== actionId);
    }, 'Failed to delete action');

  const clearCompletedActions = (listName: string) =>
    updateActionLists((als) => {
      const al = als.find((a) => a.listName === listName);
      if (!al) return false;
      const before = al.items.length;
      al.items = al.items.filter((i) => !i.completed);
      if (al.items.length === before) return false;
    }, 'Failed to clear completed actions');

  // ---- Cross-list move ----

  const moveAction = (fromListName: string, toListName: string, actionId: string, toIndex?: number) =>
    updateActionLists((als) => {
      const from = als.find((a) => a.listName === fromListName);
      const to = als.find((a) => a.listName === toListName);
      if (!from || !to || fromListName === toListName) return false;
      const idx = from.items.findIndex((i) => i.id === actionId);
      if (idx === -1) return false;
      const [item] = from.items.splice(idx, 1);
      item.completed = false;
      const activeItems = to.items.filter((i) => !i.completed);
      const doneItems = to.items.filter((i) => i.completed);
      const insertAt = toIndex !== undefined ? Math.min(toIndex, activeItems.length) : activeItems.length;
      activeItems.splice(insertAt, 0, item);
      to.items = [...activeItems, ...doneItems];
    }, 'Failed to move action');

  // ---- Action Inbox ----

  async function addActionInboxItem(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      setError(null);
      const actionInbox = getActionInbox();
      actionInbox.push({
        id: uuidv4(), text: trimmed, completed: false,
        assignees: [], dueDate: null, priority: 'medium', createdAt: Date.now(),
      });
      await updateDoc(getRef(), { actionInbox });
    } catch (e) {
      console.error('Failed to add action inbox item', e);
      setError('Failed to add action inbox item');
    }
  }

  async function deleteActionInboxItem(itemId: string) {
    try {
      setError(null);
      const actionInbox = getActionInbox();
      const idx = actionInbox.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      actionInbox.splice(idx, 1);
      await updateDoc(getRef(), { actionInbox });
    } catch (e) {
      console.error('Failed to delete action inbox item', e);
      setError('Failed to delete action inbox item');
    }
  }

  async function editActionInboxItem(itemId: string, text: string) {
    try {
      setError(null);
      const actionInbox = getActionInbox();
      const item = actionInbox.find((i) => i.id === itemId);
      if (!item) return;
      item.text = text.trim();
      await updateDoc(getRef(), { actionInbox });
    } catch (e) {
      console.error('Failed to edit action inbox item', e);
      setError('Failed to edit action inbox item');
    }
  }

  async function reorderActionInbox(fromIndex: number, toIndex: number) {
    try {
      setError(null);
      const actionInbox = getActionInbox();
      if (fromIndex < 0 || fromIndex >= actionInbox.length || toIndex < 0 || toIndex >= actionInbox.length) return;
      const [moved] = actionInbox.splice(fromIndex, 1);
      actionInbox.splice(toIndex, 0, moved);
      await updateDoc(getRef(), { actionInbox });
    } catch (e) {
      console.error('Failed to reorder action inbox', e);
      setError('Failed to reorder action inbox');
    }
  }

  async function moveActionInboxToList(itemId: string, toListName: string, toIndex?: number) {
    try {
      setError(null);
      const actionInbox = getActionInbox();
      const idx = actionInbox.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const [item] = actionInbox.splice(idx, 1);
      const actionLists = getActionLists();
      const toList = actionLists.find((l) => l.listName === toListName);
      if (!toList) return;
      const activeItems = toList.items.filter((i) => !i.completed);
      const doneItems = toList.items.filter((i) => i.completed);
      const insertAt = toIndex !== undefined ? Math.min(toIndex, activeItems.length) : activeItems.length;
      activeItems.splice(insertAt, 0, item);
      toList.items = [...activeItems, ...doneItems];
      await updateDoc(getRef(), { actionInbox, actionLists });
    } catch (e) {
      console.error('Failed to move action inbox item to list', e);
      setError('Failed to move action inbox item to list');
    }
  }

  async function moveActionToInbox(fromListName: string, itemId: string) {
    try {
      setError(null);
      const actionLists = getActionLists();
      const from = actionLists.find((l) => l.listName === fromListName);
      if (!from) return;
      const idx = from.items.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const [item] = from.items.splice(idx, 1);
      item.completed = false;
      const actionInbox = getActionInbox();
      actionInbox.push(item);
      await updateDoc(getRef(), { actionInbox, actionLists });
    } catch (e) {
      console.error('Failed to move action to inbox', e);
      setError('Failed to move action to inbox');
    }
  }

  return {
    addActionList, renameActionList, deleteActionList,
    setActionListIcon, setActionListCategory,
    reorderActionLists, reorderActionItems,
    addAction, editAction, toggleAction, deleteAction, clearCompletedActions,
    moveAction,
    addActionInboxItem, deleteActionInboxItem, editActionInboxItem,
    reorderActionInbox, moveActionInboxToList, moveActionToInbox,
  };
}

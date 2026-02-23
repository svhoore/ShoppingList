import { arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { updateDoc } from 'firebase/firestore';
import type { HouseholdBaseContext, ShoppingItem } from './useHouseholdBase';

/**
 * Factory that creates all shopping-list, item, and inbox operations.
 * Not a hook — call once and memoize the result.
 */
export function createShoppingOps(ctx: HouseholdBaseContext) {
  const { updateLists, getRef, getLists, getInbox, setError } = ctx;

  // ---- List CRUD ----

  const addList = (name: string, icon = '📝', category?: string) =>
    updateLists(
      (lists) => {
        if (lists.some((l) => l.listName.toLowerCase() === name.trim().toLowerCase())) return false;
        lists.push({ listName: name.trim(), icon, category: category || '', items: [] });
      },
      'Failed to add list',
      category ? { customCategories: arrayUnion(category) } : undefined,
    );

  const renameList = (oldName: string, newName: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === oldName);
      if (!list) return false;
      list.listName = newName.trim();
    }, 'Failed to rename list');

  const deleteList = (name: string) =>
    updateLists((lists) => {
      const idx = lists.findIndex((l) => l.listName === name);
      if (idx === -1) return false;
      lists.splice(idx, 1);
    }, 'Failed to delete list');

  // ---- Item CRUD ----

  const addItem = (listName: string, text: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      list.items.push({ id: uuidv4(), text: text.trim(), completed: false, createdAt: Date.now() });
    }, 'Failed to add item');

  const toggleItem = (listName: string, itemId: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      const item = list.items.find((i) => i.id === itemId);
      if (!item) return false;
      item.completed = !item.completed;
    }, 'Failed to toggle item');

  const deleteItem = (listName: string, itemId: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      list.items = list.items.filter((i) => i.id !== itemId);
    }, 'Failed to delete item');

  const editItem = (listName: string, itemId: string, newText: string) =>
    updateLists((lists) => {
      const trimmed = newText.trim();
      if (!trimmed) return false;
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      const item = list.items.find((i) => i.id === itemId);
      if (!item) return false;
      item.text = trimmed;
    }, 'Failed to edit item');

  const toggleBonus = (listName: string, itemId: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      const item = list.items.find((i) => i.id === itemId);
      if (!item) return false;
      item.bonus = !item.bonus;
    }, 'Failed to update bonus tag');

  // ---- List settings ----

  const setListIcon = (listName: string, icon: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      list.icon = icon;
    }, 'Failed to set icon');

  const setListCategory = (listName: string, category: string) =>
    updateLists(
      (lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.category = category;
      },
      'Failed to set category',
      category ? { customCategories: arrayUnion(category) } : undefined,
    );

  const setListBonusEnabled = (listName: string, enabled: boolean) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      list.bonusEnabled = enabled;
    }, 'Failed to update bonus setting');

  // ---- Reorder / move ----

  const reorderLists = (fromIndex: number, toIndex: number) =>
    updateLists((lists) => {
      if (fromIndex < 0 || fromIndex >= lists.length || toIndex < 0 || toIndex >= lists.length) return false;
      const [moved] = lists.splice(fromIndex, 1);
      lists.splice(toIndex, 0, moved);
    }, 'Failed to reorder lists');

  const reorderItems = (listName: string, fromIndex: number, toIndex: number) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      const active = list.items.filter((i) => !i.completed);
      const done = list.items.filter((i) => i.completed);
      if (fromIndex < 0 || fromIndex >= active.length || toIndex < 0 || toIndex >= active.length) return false;
      const [moved] = active.splice(fromIndex, 1);
      active.splice(toIndex, 0, moved);
      list.items = [...active, ...done];
    }, 'Failed to reorder items');

  const moveItem = (fromListName: string, toListName: string, itemId: string, toIndex?: number) =>
    updateLists((lists) => {
      const from = lists.find((l) => l.listName === fromListName);
      const to = lists.find((l) => l.listName === toListName);
      if (!from || !to || fromListName === toListName) return false;
      const idx = from.items.findIndex((i) => i.id === itemId);
      if (idx === -1) return false;
      const [item] = from.items.splice(idx, 1);
      item.completed = false;
      const activeItems = to.items.filter((i) => !i.completed);
      const doneItems = to.items.filter((i) => i.completed);
      const insertAt = toIndex !== undefined ? Math.min(toIndex, activeItems.length) : activeItems.length;
      activeItems.splice(insertAt, 0, item);
      to.items = [...activeItems, ...doneItems];
    }, 'Failed to move item');

  const clearCompleted = (listName: string) =>
    updateLists((lists) => {
      const list = lists.find((l) => l.listName === listName);
      if (!list) return false;
      const before = list.items.length;
      list.items = list.items.filter((i) => !i.completed);
      if (list.items.length === before) return false;
    }, 'Failed to clear completed items');

  // ---- Inbox ----

  async function addInboxItem(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      setError(null);
      const inbox = getInbox();
      inbox.push({ id: uuidv4(), text: trimmed, completed: false, createdAt: Date.now() });
      await updateDoc(getRef(), { inbox });
    } catch (e) {
      console.error('Failed to add inbox item', e);
      setError('Failed to add inbox item');
    }
  }

  async function deleteInboxItem(itemId: string) {
    try {
      setError(null);
      const inbox = getInbox();
      const idx = inbox.findIndex((i: ShoppingItem) => i.id === itemId);
      if (idx === -1) return;
      inbox.splice(idx, 1);
      await updateDoc(getRef(), { inbox });
    } catch (e) {
      console.error('Failed to delete inbox item', e);
      setError('Failed to delete inbox item');
    }
  }

  async function editInboxItem(itemId: string, text: string) {
    try {
      setError(null);
      const inbox = getInbox();
      const item = inbox.find((i: ShoppingItem) => i.id === itemId);
      if (!item) return;
      item.text = text.trim();
      await updateDoc(getRef(), { inbox });
    } catch (e) {
      console.error('Failed to edit inbox item', e);
      setError('Failed to edit inbox item');
    }
  }

  async function reorderInbox(fromIndex: number, toIndex: number) {
    try {
      setError(null);
      const inbox = getInbox();
      if (fromIndex < 0 || fromIndex >= inbox.length || toIndex < 0 || toIndex >= inbox.length) return;
      const [moved] = inbox.splice(fromIndex, 1);
      inbox.splice(toIndex, 0, moved);
      await updateDoc(getRef(), { inbox });
    } catch (e) {
      console.error('Failed to reorder inbox', e);
      setError('Failed to reorder inbox');
    }
  }

  async function moveInboxToList(itemId: string, toListName: string, toIndex?: number) {
    try {
      setError(null);
      const inbox = getInbox();
      const idx = inbox.findIndex((i: ShoppingItem) => i.id === itemId);
      if (idx === -1) return;
      const [item] = inbox.splice(idx, 1);
      const lists = getLists();
      const toList = lists.find((l) => l.listName === toListName);
      if (!toList) return;
      const activeItems = toList.items.filter((i) => !i.completed);
      const doneItems = toList.items.filter((i) => i.completed);
      const insertAt = toIndex !== undefined ? Math.min(toIndex, activeItems.length) : activeItems.length;
      activeItems.splice(insertAt, 0, item);
      toList.items = [...activeItems, ...doneItems];
      await updateDoc(getRef(), { inbox, lists });
    } catch (e) {
      console.error('Failed to move inbox item to list', e);
      setError('Failed to move inbox item to list');
    }
  }

  async function moveItemToInbox(fromListName: string, itemId: string) {
    try {
      setError(null);
      const lists = getLists();
      const from = lists.find((l) => l.listName === fromListName);
      if (!from) return;
      const idx = from.items.findIndex((i) => i.id === itemId);
      if (idx === -1) return;
      const [item] = from.items.splice(idx, 1);
      item.completed = false;
      const inbox = getInbox();
      inbox.push(item);
      await updateDoc(getRef(), { inbox, lists });
    } catch (e) {
      console.error('Failed to move item to inbox', e);
      setError('Failed to move item to inbox');
    }
  }

  return {
    addList, renameList, deleteList,
    addItem, toggleItem, deleteItem, editItem, toggleBonus,
    setListIcon, setListCategory, setListBonusEnabled,
    reorderLists, reorderItems, moveItem, clearCompleted,
    addInboxItem, deleteInboxItem, editInboxItem,
    reorderInbox, moveInboxToList, moveItemToInbox,
  };
}

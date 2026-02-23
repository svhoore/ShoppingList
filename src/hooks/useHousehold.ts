import { useEffect, useState, useCallback, useRef } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { sortItems, sortActions } from '../lib/utils';
import type { MemberInfo } from '../context/HouseholdContext';

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  bonus?: boolean;
  createdAt: number;
}

export const DEFAULT_CATEGORIES: readonly string[] = [];

/** Category type — purely user-defined */
export type ListCategory = string;

export interface ShoppingList {
  listName: string;
  icon: string;
  category: string;
  bonusEnabled?: boolean;
  items: ShoppingItem[];
}

export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  assignees: string[];
  dueDate: string | null;
  priority: ActionPriority;
  createdAt: number;
}

export interface ActionList {
  listName: string;
  icon: string;
  category: string;
  items: ActionItem[];
}

export interface HouseholdData {
  name: string;
  icon?: string;
  lists: ShoppingList[];
  members: string[];
  admins: string[];
  memberInfo: Record<string, MemberInfo>;
  customCategories?: string[];
  customActionCategories?: string[];
  actionLists: ActionList[];
  inbox: ShoppingItem[];
  actionInbox: ActionItem[];
}

/** Sort: active items first (preserving order), then completed (by createdAt) — delegated to utils */

export function useHousehold(householdId: string | null) {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref so callbacks always read the latest snapshot without stale closures
  const dataRef = useRef<HouseholdData | null>(null);

  // Real-time listener
  useEffect(() => {
    if (!householdId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'households', householdId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data();
          const lists = (raw.lists || []).map((l: ShoppingList) => ({
            ...l,
            icon: l.icon || '📝',
            category: l.category || '',
            items: sortItems(l.items || []),
          }));
          const actionLists = (raw.actionLists || []).map((al: ActionList) => ({
            ...al,
            icon: al.icon || '📋',
            category: al.category || '',
            items: sortActions(al.items || []),
          }));
          const household: HouseholdData = {
            name: raw.name || '',
            icon: raw.icon || undefined,
            lists,
            members: raw.members || [],
            admins: raw.admins || [],
            memberInfo: raw.memberInfo || {},
            customCategories: raw.customCategories || [],
            customActionCategories: raw.customActionCategories || [],
            actionLists,
            inbox: sortItems(raw.inbox ?? raw.backlog ?? []),
            actionInbox: sortActions(raw.actionInbox || []),
          };
          dataRef.current = household;
          setData(household);

          // Warn if document is approaching Firestore's 1 MB limit
          const estimatedKB = JSON.stringify(raw).length / 1024;
          if (estimatedKB > 800) {
            console.warn(
              `⚠️ Household document is ~${estimatedKB.toFixed(0)}KB — approaching Firestore's 1024KB limit. Consider archiving old lists.`,
            );
          }
        } else {
          const empty: HouseholdData = { name: '', lists: [], members: [], admins: [], memberInfo: {}, customCategories: [], customActionCategories: [], actionLists: [], inbox: [], actionInbox: [] };
          dataRef.current = empty;
          setData(empty);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Snapshot error:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [householdId]);

  const getRef = useCallback(() => {
    if (!householdId) throw new Error('No household');
    return doc(db, 'households', householdId);
  }, [householdId]);

  /** Deep-clone the latest lists from the real-time listener (no network round-trip). */
  const getLists = useCallback((): ShoppingList[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.lists || []));
  }, []);

  /** Deep-clone the latest actions from the real-time listener. */
  const getActionLists = useCallback((): ActionList[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.actionLists || []));
  }, []);

  const getInbox = useCallback((): ShoppingItem[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.inbox || []));
  }, []);

  const getActionInbox = useCallback((): ActionItem[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.actionInbox || []));
  }, []);

  /**
   * Helper: read lists, apply a mutation, then write back.
   * Race-condition note: we intentionally avoid Firestore transactions here
   * because they fail when offline. For a household shopping list the
   * last-writer-wins semantics of updateDoc are acceptable, and offline
   * support is more important.
   */
  const updateLists = useCallback(
    async (
      fn: (lists: ShoppingList[]) => boolean | void,
      errorMsg: string,
      extraFields?: Record<string, unknown>,
    ) => {
      try {
        setError(null);
        const lists = getLists();
        if (fn(lists) === false) return;
        await updateDoc(getRef(), { lists, ...extraFields });
      } catch (e: unknown) {
        const code = (e as { code?: string }).code;
        const detail = code === 'permission-denied' ? ' (permission denied — are Firestore rules deployed?)' : code ? ` (${code})` : '';
        console.error(errorMsg + detail, e);
        setError(errorMsg + detail);
      }
    },
    [getRef, getLists],
  );

  /** Helper: read action lists, apply a mutation, then write back. */
  const updateActionLists = useCallback(
    async (
      fn: (actionLists: ActionList[]) => boolean | void,
      errorMsg: string,
      extraFields?: Record<string, unknown>,
    ) => {
      try {
        setError(null);
        const actionLists = getActionLists();
        if (fn(actionLists) === false) return;
        await updateDoc(getRef(), { actionLists, ...extraFields });
      } catch (e: unknown) {
        const code = (e as { code?: string }).code;
        const detail = code === 'permission-denied' ? ' (permission denied — are Firestore rules deployed?)' : code ? ` (${code})` : '';
        console.error(errorMsg + detail, e);
        setError(errorMsg + detail);
      }
    },
    [getRef, getActionLists],
  );

  // ---- Household operations ----

  const renameHousehold = useCallback(
    async (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      await updateDoc(getRef(), { name: trimmed });
      // Keep the public invite doc in sync
      try {
        const householdId = getRef().id;
        const inviteRef = doc(db, 'invites', householdId);
        await updateDoc(inviteRef, { name: trimmed });
      } catch { /* best-effort — invite doc may not exist for legacy households */ }
    },
    [getRef],
  );

  const setHouseholdIcon = useCallback(
    async (dataUrl: string | null) => {
      if (dataUrl) {
        await updateDoc(getRef(), { icon: dataUrl });
      } else {
        await updateDoc(getRef(), { icon: deleteField() });
      }
    },
    [getRef],
  );

  const promoteToAdmin = useCallback(
    async (uid: string) => {
      await updateDoc(getRef(), { admins: arrayUnion(uid) });
    },
    [getRef],
  );

  const demoteFromAdmin = useCallback(
    async (uid: string) => {
      // Prevent removing the last admin
      const admins = dataRef.current?.admins ?? [];
      if (admins.length <= 1 && admins.includes(uid)) {
        setError('Cannot remove the last admin. Promote another member first.');
        return;
      }
      await updateDoc(getRef(), { admins: arrayRemove(uid) });
    },
    [getRef],
  );

  const removeMember = useCallback(
    async (uid: string) => {
      await updateDoc(getRef(), {
        members: arrayRemove(uid),
        admins: arrayRemove(uid),
        [`memberInfo.${uid}`]: deleteField(),
      });
    },
    [getRef],
  );

  // ---- List operations ----

  const addList = useCallback(
    (name: string, icon = '📝', category?: string) =>
      updateLists(
        (lists) => {
          if (lists.some((l) => l.listName.toLowerCase() === name.trim().toLowerCase())) return false;
          lists.push({ listName: name.trim(), icon, category: category || '', items: [] });
        },
        'Failed to add list',
        category ? { customCategories: arrayUnion(category) } : undefined,
      ),
    [updateLists],
  );

  const renameList = useCallback(
    (oldName: string, newName: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === oldName);
        if (!list) return false;
        list.listName = newName.trim();
      }, 'Failed to rename list'),
    [updateLists],
  );

  const deleteList = useCallback(
    (name: string) =>
      updateLists((lists) => {
        const idx = lists.findIndex((l) => l.listName === name);
        if (idx === -1) return false;
        lists.splice(idx, 1);
      }, 'Failed to delete list'),
    [updateLists],
  );

  // ---- Item operations ----

  const addItem = useCallback(
    (listName: string, text: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.items.push({
          id: uuidv4(),
          text: text.trim(),
          completed: false,
          createdAt: Date.now(),
        });
      }, 'Failed to add item'),
    [updateLists],
  );

  const toggleItem = useCallback(
    (listName: string, itemId: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        const item = list.items.find((i) => i.id === itemId);
        if (!item) return false;
        item.completed = !item.completed;
      }, 'Failed to toggle item'),
    [updateLists],
  );

  const deleteItem = useCallback(
    (listName: string, itemId: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.items = list.items.filter((i) => i.id !== itemId);
      }, 'Failed to delete item'),
    [updateLists],
  );

  const editItem = useCallback(
    (listName: string, itemId: string, newText: string) =>
      updateLists((lists) => {
        const trimmed = newText.trim();
        if (!trimmed) return false;
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        const item = list.items.find((i) => i.id === itemId);
        if (!item) return false;
        item.text = trimmed;
      }, 'Failed to edit item'),
    [updateLists],
  );

  const addCategory = useCallback(
    async (categoryName: string) => {
      const trimmed = categoryName.trim();
      if (!trimmed) return;
      try {
        setError(null);
        await updateDoc(getRef(), { customCategories: arrayUnion(trimmed) });
      } catch (e) {
        console.error('Failed to add category', e);
        setError('Failed to add category');
      }
    },
    [getRef],
  );

  const removeCategory = useCallback(
    async (categoryName: string) => {
      try {
        setError(null);
        // Remove from customCategories AND clear from any lists using it
        const lists = getLists();
        let listsChanged = false;
        for (const list of lists) {
          if (list.category === categoryName) {
            list.category = '';
            listsChanged = true;
          }
        }
        const update: Record<string, unknown> = { customCategories: arrayRemove(categoryName) };
        if (listsChanged) update.lists = lists;
        await updateDoc(getRef(), update);
      } catch (e) {
        console.error('Failed to remove category', e);
        setError('Failed to remove category');
      }
    },
    [getRef, getLists],
  );

  const addActionCategory = useCallback(
    async (categoryName: string) => {
      const trimmed = categoryName.trim();
      if (!trimmed) return;
      try {
        setError(null);
        await updateDoc(getRef(), { customActionCategories: arrayUnion(trimmed) });
      } catch (e) {
        console.error('Failed to add action category', e);
        setError('Failed to add action category');
      }
    },
    [getRef],
  );

  const removeActionCategory = useCallback(
    async (categoryName: string) => {
      try {
        setError(null);
        const actionLists = getActionLists();
        let changed = false;
        for (const al of actionLists) {
          if (al.category === categoryName) {
            al.category = '';
            changed = true;
          }
        }
        const update: Record<string, unknown> = { customActionCategories: arrayRemove(categoryName) };
        if (changed) update.actionLists = actionLists;
        await updateDoc(getRef(), update);
      } catch (e) {
        console.error('Failed to remove action category', e);
        setError('Failed to remove action category');
      }
    },
    [getRef, getActionLists],
  );

  const toggleBonus = useCallback(
    (listName: string, itemId: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        const item = list.items.find((i) => i.id === itemId);
        if (!item) return false;
        item.bonus = !item.bonus;
      }, 'Failed to update bonus tag'),
    [updateLists],
  );

  const setListIcon = useCallback(
    (listName: string, icon: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.icon = icon;
      }, 'Failed to set icon'),
    [updateLists],
  );

  const setListCategory = useCallback(
    (listName: string, category: string) =>
      updateLists(
        (lists) => {
          const list = lists.find((l) => l.listName === listName);
          if (!list) return false;
          list.category = category;
        },
        'Failed to set category',
        category ? { customCategories: arrayUnion(category) } : undefined,
      ),
    [updateLists],
  );

  const setListBonusEnabled = useCallback(
    (listName: string, enabled: boolean) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.bonusEnabled = enabled;
      }, 'Failed to update bonus setting'),
    [updateLists],
  );

  const reorderLists = useCallback(
    (fromIndex: number, toIndex: number) =>
      updateLists((lists) => {
        if (fromIndex < 0 || fromIndex >= lists.length || toIndex < 0 || toIndex >= lists.length) return false;
        const [moved] = lists.splice(fromIndex, 1);
        lists.splice(toIndex, 0, moved);
      }, 'Failed to reorder lists'),
    [updateLists],
  );

  const reorderItems = useCallback(
    (listName: string, fromIndex: number, toIndex: number) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        const active = list.items.filter((i) => !i.completed);
        const done = list.items.filter((i) => i.completed);
        if (fromIndex < 0 || fromIndex >= active.length || toIndex < 0 || toIndex >= active.length) return false;
        const [moved] = active.splice(fromIndex, 1);
        active.splice(toIndex, 0, moved);
        list.items = [...active, ...done];
      }, 'Failed to reorder items'),
    [updateLists],
  );

  const moveItem = useCallback(
    (fromListName: string, toListName: string, itemId: string, toIndex?: number) =>
      updateLists((lists) => {
        const from = lists.find((l) => l.listName === fromListName);
        const to = lists.find((l) => l.listName === toListName);
        if (!from || !to || fromListName === toListName) return false;
        const idx = from.items.findIndex((i) => i.id === itemId);
        if (idx === -1) return false;
        const [item] = from.items.splice(idx, 1);
        item.completed = false; // reset when moving
        const activeItems = to.items.filter((i) => !i.completed);
        const doneItems = to.items.filter((i) => i.completed);
        const insertAt = toIndex !== undefined ? Math.min(toIndex, activeItems.length) : activeItems.length;
        activeItems.splice(insertAt, 0, item);
        to.items = [...activeItems, ...doneItems];
      }, 'Failed to move item'),
    [updateLists],
  );

  const clearCompleted = useCallback(
    (listName: string) =>
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        const before = list.items.length;
        list.items = list.items.filter((i) => !i.completed);
        if (list.items.length === before) return false; // nothing to clear
      }, 'Failed to clear completed items'),
    [updateLists],
  );

  // ---- Inbox operations (shopping items) ----

  const addInboxItem = useCallback(
    async (text: string) => {
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
    },
    [getRef, getInbox],
  );

  const deleteInboxItem = useCallback(
    async (itemId: string) => {
      try {
        setError(null);
        const inbox = getInbox();
        const idx = inbox.findIndex((i) => i.id === itemId);
        if (idx === -1) return;
        inbox.splice(idx, 1);
        await updateDoc(getRef(), { inbox });
      } catch (e) {
        console.error('Failed to delete inbox item', e);
        setError('Failed to delete inbox item');
      }
    },
    [getRef, getInbox],
  );

  const editInboxItem = useCallback(
    async (itemId: string, text: string) => {
      try {
        setError(null);
        const inbox = getInbox();
        const item = inbox.find((i) => i.id === itemId);
        if (!item) return;
        item.text = text.trim();
        await updateDoc(getRef(), { inbox });
      } catch (e) {
        console.error('Failed to edit inbox item', e);
        setError('Failed to edit inbox item');
      }
    },
    [getRef, getInbox],
  );

  const reorderInbox = useCallback(
    async (fromIndex: number, toIndex: number) => {
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
    },
    [getRef, getInbox],
  );

  /** Move an inbox item into a shopping list at a given position */
  const moveInboxToList = useCallback(
    async (itemId: string, toListName: string, toIndex?: number) => {
      try {
        setError(null);
        const inbox = getInbox();
        const idx = inbox.findIndex((i) => i.id === itemId);
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
    },
    [getRef, getInbox, getLists],
  );

  /** Move an item from a shopping list into the inbox */
  const moveItemToInbox = useCallback(
    async (fromListName: string, itemId: string) => {
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
    },
    [getRef, getLists, getInbox],
  );

  // ---- Action Inbox operations ----

  const addActionInboxItem = useCallback(
    async (text: string) => {
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
    },
    [getRef, getActionInbox],
  );

  const deleteActionInboxItem = useCallback(
    async (itemId: string) => {
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
    },
    [getRef, getActionInbox],
  );

  const editActionInboxItem = useCallback(
    async (itemId: string, text: string) => {
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
    },
    [getRef, getActionInbox],
  );

  const reorderActionInbox = useCallback(
    async (fromIndex: number, toIndex: number) => {
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
    },
    [getRef, getActionInbox],
  );

  /** Move an action inbox item into an action list at a given position */
  const moveActionInboxToList = useCallback(
    async (itemId: string, toListName: string, toIndex?: number) => {
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
    },
    [getRef, getActionInbox, getActionLists],
  );

  /** Move an action from an action list into the inbox */
  const moveActionToInbox = useCallback(
    async (fromListName: string, itemId: string) => {
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
    },
    [getRef, getActionLists, getActionInbox],
  );

  /** Move an action from one action list to another */
  const moveAction = useCallback(
    (fromListName: string, toListName: string, actionId: string, toIndex?: number) =>
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
      }, 'Failed to move action'),
    [updateActionLists],
  );

  // ---- Action List operations ----

  const addActionList = useCallback(
    (name: string, icon = '📋', category?: string) =>
      updateActionLists(
        (als) => {
          if (als.some((a) => a.listName.toLowerCase() === name.trim().toLowerCase())) return false;
          als.push({ listName: name.trim(), icon, category: category || '', items: [] });
        },
        'Failed to add action list',
        category ? { customActionCategories: arrayUnion(category) } : undefined,
      ),
    [updateActionLists],
  );

  const renameActionList = useCallback(
    (oldName: string, newName: string) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === oldName);
        if (!al) return false;
        al.listName = newName.trim();
      }, 'Failed to rename action list'),
    [updateActionLists],
  );

  const deleteActionList = useCallback(
    (name: string) =>
      updateActionLists((als) => {
        const idx = als.findIndex((a) => a.listName === name);
        if (idx === -1) return false;
        als.splice(idx, 1);
      }, 'Failed to delete action list'),
    [updateActionLists],
  );

  const setActionListIcon = useCallback(
    (listName: string, icon: string) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        al.icon = icon;
      }, 'Failed to set action list icon'),
    [updateActionLists],
  );

  const setActionListCategory = useCallback(
    (listName: string, category: string) =>
      updateActionLists(
        (als) => {
          const al = als.find((a) => a.listName === listName);
          if (!al) return false;
          al.category = category;
        },
        'Failed to set action list category',
        category ? { customActionCategories: arrayUnion(category) } : undefined,
      ),
    [updateActionLists],
  );

  const reorderActionLists = useCallback(
    (fromIndex: number, toIndex: number) =>
      updateActionLists((als) => {
        if (fromIndex < 0 || fromIndex >= als.length || toIndex < 0 || toIndex >= als.length) return false;
        const [moved] = als.splice(fromIndex, 1);
        als.splice(toIndex, 0, moved);
      }, 'Failed to reorder action lists'),
    [updateActionLists],
  );

  const reorderActionItems = useCallback(
    (listName: string, fromIndex: number, toIndex: number) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        const active = al.items.filter((i) => !i.completed);
        const done = al.items.filter((i) => i.completed);
        if (fromIndex < 0 || fromIndex >= active.length || toIndex < 0 || toIndex >= active.length) return false;
        const [moved] = active.splice(fromIndex, 1);
        active.splice(toIndex, 0, moved);
        al.items = [...active, ...done];
      }, 'Failed to reorder actions'),
    [updateActionLists],
  );

  // ---- Action item operations ----

  const addAction = useCallback(
    (listName: string, text: string, assignees: string[], dueDate: string | null, priority: ActionPriority) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        al.items.push({
          id: uuidv4(),
          text: text.trim(),
          completed: false,
          assignees,
          dueDate,
          priority,
          createdAt: Date.now(),
        });
      }, 'Failed to add action'),
    [updateActionLists],
  );

  const editAction = useCallback(
    (listName: string, actionId: string, updates: Partial<Pick<ActionItem, 'text' | 'assignees' | 'dueDate' | 'priority'>>) =>
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
      }, 'Failed to edit action'),
    [updateActionLists],
  );

  const toggleAction = useCallback(
    (listName: string, actionId: string) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        const action = al.items.find((i) => i.id === actionId);
        if (!action) return false;
        action.completed = !action.completed;
      }, 'Failed to toggle action'),
    [updateActionLists],
  );

  const deleteAction = useCallback(
    (listName: string, actionId: string) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        al.items = al.items.filter((i) => i.id !== actionId);
      }, 'Failed to delete action'),
    [updateActionLists],
  );

  const clearCompletedActions = useCallback(
    (listName: string) =>
      updateActionLists((als) => {
        const al = als.find((a) => a.listName === listName);
        if (!al) return false;
        const before = al.items.length;
        al.items = al.items.filter((i) => !i.completed);
        if (al.items.length === before) return false;
      }, 'Failed to clear completed actions'),
    [updateActionLists],
  );

  return {
    data,
    loading,
    error,
    renameHousehold,
    setHouseholdIcon,
    promoteToAdmin,
    demoteFromAdmin,
    removeMember,
    addList,
    renameList,
    deleteList,
    addItem,
    toggleItem,
    deleteItem,
    editItem,
    setListIcon,
    setListCategory,
    addCategory,
    removeCategory,
    addActionCategory,
    removeActionCategory,
    toggleBonus,
    setListBonusEnabled,
    reorderLists,
    reorderItems,
    moveItem,
    clearCompleted,
    addInboxItem,
    deleteInboxItem,
    editInboxItem,
    reorderInbox,
    moveInboxToList,
    moveItemToInbox,
    addActionInboxItem,
    deleteActionInboxItem,
    editActionInboxItem,
    reorderActionInbox,
    moveActionInboxToList,
    moveActionToInbox,
    moveAction,
    addActionList,
    renameActionList,
    deleteActionList,
    setActionListIcon,
    setActionListCategory,
    reorderActionLists,
    reorderActionItems,
    addAction,
    editAction,
    toggleAction,
    deleteAction,
    clearCompletedActions,
  };
}

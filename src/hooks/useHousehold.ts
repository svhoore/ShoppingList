import { useEffect, useState, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { sortItems } from '../lib/utils';
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
  items: ShoppingItem[];
}

export interface HouseholdData {
  name: string;
  icon?: string;
  lists: ShoppingList[];
  members: string[];
  admins: string[];
  memberInfo: Record<string, MemberInfo>;
  customCategories?: string[];
}

/** Sort: active items first (preserving order), then completed (by createdAt) — delegated to utils */

export function useHousehold(householdId: string | null) {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setData({
            name: raw.name || '',
            icon: raw.icon || undefined,
            lists,
            members: raw.members || [],
            admins: raw.admins || [],
            memberInfo: raw.memberInfo || {},
            customCategories: raw.customCategories || [],
          });
        } else {
          setData({ name: '', lists: [], members: [], admins: [], memberInfo: {}, customCategories: [] });
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

  const getLists = useCallback(async (): Promise<ShoppingList[]> => {
    const snap = await getDoc(getRef());
    return snap.exists() ? (snap.data() as HouseholdData).lists || [] : [];
  }, [getRef]);

  /**
   * Helper: read lists, apply a mutation, then write back.
   * Race-condition note: we intentionally avoid Firestore transactions here
   * because they fail when offline. For a household shopping list the
   * last-writer-wins semantics of updateDoc are acceptable, and offline
   * support is more important.
   */
  const updateLists = useCallback(
    async (fn: (lists: ShoppingList[]) => boolean | void, errorMsg: string) => {
      try {
        setError(null);
        const lists = await getLists();
        if (fn(lists) === false) return;
        await updateDoc(getRef(), { lists });
      } catch (e) {
        console.error(errorMsg, e);
        setError(errorMsg);
      }
    },
    [getRef, getLists],
  );

  // ---- Household operations ----

  const renameHousehold = useCallback(
    async (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      await updateDoc(getRef(), { name: trimmed });
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
    async (name: string, icon = '📝', category?: string) => {
      const lists = await getLists();
      if (lists.some((l) => l.listName.toLowerCase() === name.toLowerCase())) return;
      lists.push({ listName: name.trim(), icon, category: category || '', items: [] });
      await updateDoc(getRef(), { lists });
    },
    [getRef, getLists],
  );

  const renameList = useCallback(
    async (oldName: string, newName: string) => {
      const lists = await getLists();
      const list = lists.find((l) => l.listName === oldName);
      if (list) {
        list.listName = newName.trim();
        await updateDoc(getRef(), { lists });
      }
    },
    [getRef, getLists],
  );

  const deleteList = useCallback(
    async (name: string) => {
      const lists = await getLists();
      const filtered = lists.filter((l) => l.listName !== name);
      await updateDoc(getRef(), { lists: filtered });
    },
    [getRef, getLists],
  );

  // ---- Item operations ----

  const addItem = useCallback(
    async (listName: string, text: string) => {
      const lists = await getLists();
      const list = lists.find((l) => l.listName === listName);
      if (!list) return;
      list.items.push({
        id: uuidv4(),
        text: text.trim(),
        completed: false,
        createdAt: Date.now(),
      });
      await updateDoc(getRef(), { lists });
    },
    [getRef, getLists],
  );

  const toggleItem = useCallback(
    async (listName: string, itemId: string) => {
      const lists = await getLists();
      const list = lists.find((l) => l.listName === listName);
      if (!list) return;
      const item = list.items.find((i) => i.id === itemId);
      if (item) {
        item.completed = !item.completed;
        await updateDoc(getRef(), { lists });
      }
    },
    [getRef, getLists],
  );

  const deleteItem = useCallback(
    async (listName: string, itemId: string) => {
      const lists = await getLists();
      const list = lists.find((l) => l.listName === listName);
      if (!list) return;
      list.items = list.items.filter((i) => i.id !== itemId);
      await updateDoc(getRef(), { lists });
    },
    [getRef, getLists],
  );

  const editItem = useCallback(
    async (listName: string, itemId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed) return;
      const lists = await getLists();
      const list = lists.find((l) => l.listName === listName);
      if (!list) return;
      const item = list.items.find((i) => i.id === itemId);
      if (item) {
        item.text = trimmed;
        await updateDoc(getRef(), { lists });
      }
    },
    [getRef, getLists],
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
        await updateDoc(getRef(), { customCategories: arrayRemove(categoryName) });
      } catch (e) {
        console.error('Failed to remove category', e);
        setError('Failed to remove category');
      }
    },
    [getRef],
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

  const activeCount = useCallback(
    (listName: string): number => {
      if (!data) return 0;
      const list = data.lists.find((l) => l.listName === listName);
      return list ? list.items.filter((i) => !i.completed).length : 0;
    },
    [data],
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
      updateLists((lists) => {
        const list = lists.find((l) => l.listName === listName);
        if (!list) return false;
        list.category = category;
      }, 'Failed to set category'),
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
    activeCount,
    setListIcon,
    setListCategory,
    addCategory,
    removeCategory,
    toggleBonus,
    reorderLists,
    reorderItems,
    clearCompleted,
  };
}

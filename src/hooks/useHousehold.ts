import { useEffect, useState, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface ShoppingList {
  listName: string;
  items: ShoppingItem[];
}

export interface HouseholdData {
  lists: ShoppingList[];
}

/** Sort: active items first (by createdAt), then completed (by createdAt) */
function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  const active = items.filter((i) => !i.completed).sort((a, b) => a.createdAt - b.createdAt);
  const done = items.filter((i) => i.completed).sort((a, b) => a.createdAt - b.createdAt);
  return [...active, ...done];
}

export function useHousehold(householdId: string | null) {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);

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
          const raw = snap.data() as HouseholdData;
          // Sort items in every list
          const lists = (raw.lists || []).map((l) => ({
            ...l,
            items: sortItems(l.items || []),
          }));
          setData({ lists });
        } else {
          setData({ lists: [] });
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

  // ---- List operations ----

  const addList = useCallback(
    async (name: string) => {
      const lists = await getLists();
      if (lists.some((l) => l.listName.toLowerCase() === name.toLowerCase())) return;
      lists.push({ listName: name.trim(), items: [] });
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

  const activeCount = useCallback(
    (listName: string): number => {
      if (!data) return 0;
      const list = data.lists.find((l) => l.listName === listName);
      return list ? list.items.filter((i) => !i.completed).length : 0;
    },
    [data],
  );

  return {
    data,
    loading,
    addList,
    renameList,
    deleteList,
    addItem,
    toggleItem,
    deleteItem,
    activeCount,
  };
}

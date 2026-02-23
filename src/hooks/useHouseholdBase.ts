import { useEffect, useState, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sortItems, sortActions } from '../lib/utils';
import type { MemberInfo } from '../context/HouseholdContext';

// ---- Types re-exported by useHousehold ----

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  bonus?: boolean;
  createdAt: number;
}

export const DEFAULT_CATEGORIES: readonly string[] = [];

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
  description?: string;
  imageUrl?: string;
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

// ---- Base context shared by operation factories ----

export interface HouseholdBaseContext {
  data: HouseholdData | null;
  loading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  dataRef: React.RefObject<HouseholdData | null>;
  getRef: () => ReturnType<typeof doc>;
  getLists: () => ShoppingList[];
  getActionLists: () => ActionList[];
  getInbox: () => ShoppingItem[];
  getActionInbox: () => ActionItem[];
  updateLists: (
    fn: (lists: ShoppingList[]) => boolean | void,
    errorMsg: string,
    extraFields?: Record<string, unknown>,
  ) => Promise<void>;
  updateActionLists: (
    fn: (actionLists: ActionList[]) => boolean | void,
    errorMsg: string,
    extraFields?: Record<string, unknown>,
  ) => Promise<void>;
}

// ---- Base hook ----

export function useHouseholdBase(householdId: string | null): HouseholdBaseContext {
  const [data, setData] = useState<HouseholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<HouseholdData | null>(null);

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

  const getLists = useCallback((): ShoppingList[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.lists || []));
  }, []);

  const getActionLists = useCallback((): ActionList[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.actionLists || []));
  }, []);

  const getInbox = useCallback((): ShoppingItem[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.inbox || []));
  }, []);

  const getActionInbox = useCallback((): ActionItem[] => {
    return JSON.parse(JSON.stringify(dataRef.current?.actionInbox || []));
  }, []);

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

  return { data, loading, error, setError, dataRef, getRef, getLists, getActionLists, getInbox, getActionInbox, updateLists, updateActionLists };
}

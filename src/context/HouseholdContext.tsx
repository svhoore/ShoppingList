import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { generateInviteCode, normalizeInviteCode } from '../lib/utils';

export interface HouseholdSummary {
  id: string;
  name: string;
  icon?: string;
}

export interface MemberInfo {
  displayName: string;
  email: string;
}

interface HouseholdContextValue {
  householdId: string | null;
  userHouseholds: HouseholdSummary[];
  loading: boolean;
  error: string | null;
  createHousehold: (name: string) => Promise<boolean>;
  joinHousehold: (code: string) => Promise<boolean>;
  switchHousehold: (id: string) => void;
  clearHousehold: () => void;
  leaveHousehold: () => Promise<void>;
  lookupHousehold: (code: string) => Promise<{ name: string } | null>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const STORAGE_KEY = 'osl_household_id';

/** Best display name from a Firebase user: displayName > email username > email > 'User' */
function getDisplayName(u: { displayName?: string | null; email?: string | null }): string {
  if (u.displayName) return u.displayName;
  if (u.email) return u.email.split('@')[0];
  return 'User';
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userHouseholds, setUserHouseholds] = useState<HouseholdSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setHouseholdId(stored);
    setLoading(false);
  }, []);

  // Real-time listener: all households the user is a member of
  useEffect(() => {
    if (!user) {
      setUserHouseholds([]);
      return;
    }
    const q = query(
      collection(db, 'households'),
      where('members', 'array-contains', user.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: HouseholdSummary[] = snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || d.id,
        icon: (d.data().icon as string) || undefined,
      }));
      setUserHouseholds(list);

      // If saved household is not in the list, clear it
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && !list.some((h) => h.id === stored)) {
        localStorage.removeItem(STORAGE_KEY);
        setHouseholdId(null);
      }

      // Keep memberInfo up-to-date for every household we're in
      const name = getDisplayName(user);
      const email = user.email || '';
      for (const d of snap.docs) {
        const info = d.data().memberInfo?.[user.uid];
        if (!info || info.displayName !== name || info.email !== email) {
          updateDoc(d.ref, {
            [`memberInfo.${user.uid}`]: { displayName: name, email },
          }).catch(() => {/* best-effort */});
        }
      }
    });
    return unsub;
  }, [user]);

  const createHousehold = useCallback(async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Household name must be at least 2 characters');
      return false;
    }
    if (!user) {
      setError('You must be signed in to create a household');
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const code = generateInviteCode();
      const ref = doc(db, 'households', code);
      await setDoc(ref, {
        name: trimmed,
        lists: [],
        members: [user.uid],
        admins: [user.uid],
        memberInfo: {
          [user.uid]: {
            displayName: getDisplayName(user),
            email: user.email || '',
          },
        },
      });
      localStorage.setItem(STORAGE_KEY, code);
      setHouseholdId(code);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Create household error:', e);
      setError('Failed to create household. Check your connection.');
      setLoading(false);
      return false;
    }
  }, [user]);

  const joinHousehold = useCallback(async (rawCode: string): Promise<boolean> => {
    const code = normalizeInviteCode(rawCode);
    if (!code || code.length < 6) {
      setError('Enter a valid invite code');
      return false;
    }
    if (!user) {
      setError('You must be signed in to join a household');
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const ref = doc(db, 'households', code);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError('Household not found. Check the invite code.');
        setLoading(false);
        return false;
      }
      const data = snap.data();
      const members: string[] = data.members || [];
      if (!members.includes(user.uid)) {
        await updateDoc(ref, {
          members: arrayUnion(user.uid),
          [`memberInfo.${user.uid}`]: {
            displayName: getDisplayName(user),
            email: user.email || '',
          },
        });
      }
      localStorage.setItem(STORAGE_KEY, code);
      setHouseholdId(code);
      setLoading(false);
      return true;
    } catch (e) {
      console.error('Join household error:', e);
      setError('Failed to join household. Check your connection.');
      setLoading(false);
      return false;
    }
  }, [user]);

  const switchHousehold = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setHouseholdId(id);
    setError(null);
  }, []);

  // Clear local selection without leaving the Firestore household
  const clearHousehold = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHouseholdId(null);
    setError(null);
  }, []);

  const leaveHousehold = useCallback(async () => {
    if (householdId && user) {
      try {
        const ref = doc(db, 'households', householdId);
        await updateDoc(ref, {
          members: arrayRemove(user.uid),
          admins: arrayRemove(user.uid),
          [`memberInfo.${user.uid}`]: deleteField(),
        });
      } catch (e) {
        console.error('Leave household error:', e);
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    setHouseholdId(null);
    setError(null);
  }, [householdId, user]);

  const lookupHousehold = useCallback(async (rawCode: string): Promise<{ name: string } | null> => {
    const code = normalizeInviteCode(rawCode);
    try {
      const ref = doc(db, 'households', code);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { name: (snap.data().name as string) || code };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  return (
    <HouseholdContext.Provider
      value={{
        householdId,
        userHouseholds,
        loading,
        error,
        createHousehold,
        joinHousehold,
        switchHousehold,
        clearHousehold,
        leaveHousehold,
        lookupHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHouseholdContext() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHouseholdContext must be used within HouseholdProvider');
  return ctx;
}

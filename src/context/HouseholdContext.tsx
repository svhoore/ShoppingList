import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

/* ---- Random invite code generator ---- */
function generateCode(): string {
  // 8 uppercase alphanumeric chars, excluding ambiguous 0/O/1/I/L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

/** Format code for display: "ABCD-EFGH" */
export function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

interface HouseholdContextValue {
  householdId: string | null;
  loading: boolean;
  error: string | null;
  createHousehold: (name: string) => Promise<boolean>;
  joinHousehold: (code: string) => Promise<boolean>;
  leaveHousehold: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const STORAGE_KEY = 'osl_household_id';

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setHouseholdId(stored);
    }
    setLoading(false);
  }, []);

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
      const code = generateCode();
      const ref = doc(db, 'households', code);
      await setDoc(ref, { name: trimmed, lists: [], members: [user.uid] });
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
    // Normalize: remove hyphens/spaces, uppercase
    const code = rawCode.replace(/[-\s]/g, '').toUpperCase();
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
        await updateDoc(ref, { members: arrayUnion(user.uid) });
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

  const leaveHousehold = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHouseholdId(null);
    setError(null);
  }, []);

  return (
    <HouseholdContext.Provider
      value={{ householdId, loading, error, createHousehold, joinHousehold, leaveHousehold }}
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

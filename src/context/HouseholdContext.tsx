import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HouseholdContextValue {
  householdId: string | null;
  loading: boolean;
  error: string | null;
  createHousehold: (id: string) => Promise<boolean>;
  joinHousehold: (id: string) => Promise<boolean>;
  leaveHousehold: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const STORAGE_KEY = 'osl_household_id';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
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

  const createHousehold = useCallback(async (rawId: string): Promise<boolean> => {
    const id = slugify(rawId);
    if (!id || id.length < 3) {
      setError('Household ID must be at least 3 characters');
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const ref = doc(db, 'households', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setError('This Household ID is already taken. Try joining it instead.');
        setLoading(false);
        return false;
      }
      await setDoc(ref, { lists: [] });
      localStorage.setItem(STORAGE_KEY, id);
      setHouseholdId(id);
      setLoading(false);
      return true;
    } catch (e) {
      setError('Failed to create household. Check your connection.');
      setLoading(false);
      return false;
    }
  }, []);

  const joinHousehold = useCallback(async (rawId: string): Promise<boolean> => {
    const id = slugify(rawId);
    if (!id || id.length < 3) {
      setError('Household ID must be at least 3 characters');
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const ref = doc(db, 'households', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError('Household not found. Check the ID or create a new one.');
        setLoading(false);
        return false;
      }
      localStorage.setItem(STORAGE_KEY, id);
      setHouseholdId(id);
      setLoading(false);
      return true;
    } catch (e) {
      setError('Failed to join household. Check your connection.');
      setLoading(false);
      return false;
    }
  }, []);

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

export { slugify };

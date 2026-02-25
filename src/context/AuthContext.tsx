import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Standalone PWA → popup (redirect leaves the app and never comes back)
// Mobile browser  → redirect (popup is blocked by Safari/Chrome)
// Desktop         → popup
const useRedirect = isMobile && !isStandalone;

console.log('[Auth Debug]', { isStandalone, isMobile, useRedirect, ua: navigator.userAgent });

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result (for iOS/mobile sign-in)
    getRedirectResult(auth)
      .then((result) => {
        console.log('[Auth Debug] getRedirectResult:', result);
      })
      .catch((err) => {
        const code = (err as { code?: string })?.code;
        const message = (err as { message?: string })?.message;
        console.error('[Auth Debug] Redirect error:', { code, message, err });
        if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
          setAuthError(`[DEBUG] ${code || 'unknown'}: ${message || String(err)}`);
        }
      });

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    try {
      setAuthError(null);
      const method = useRedirect ? 'redirect' : 'popup';
      console.log('[Auth Debug] signInWithGoogle using:', method);
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
      console.log('[Auth Debug] signIn resolved successfully');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = (err as { message?: string })?.message;
      console.error('[Auth Debug] signIn error:', { code, message, err });
      // User cancelled — not an error
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setAuthError(`[DEBUG] ${code || 'unknown'}: ${message || String(err)}`);
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

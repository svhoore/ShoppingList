import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HouseholdProvider, useHouseholdContext } from './context/HouseholdContext';
import UpdatePrompt from './components/UpdatePrompt';
import { IconShoppingBag } from './components/Icons';
import JoinScreen from './pages/JoinScreen';
import Dashboard from './pages/Dashboard';
import ListView from './pages/ListView';
import ActionsView from './pages/ActionsView';
import AllItemsView from './pages/AllItemsView';
import AllActionsView from './pages/AllActionsView';

function SignInScreen() {
  const { signInWithGoogle, authError } = useAuth();

  return (
    <div className="min-h-dvh bg-ios-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-ios-blue rounded-[22px] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <IconShoppingBag className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-ios-text">MyHouseholdMgmt</h1>
        <p className="text-ios-secondary text-sm mt-1 mb-8">
          Sign in to access your household lists
        </p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 bg-white rounded-xl shadow-sm text-ios-text font-semibold text-[15px] active:scale-[0.98] transition-transform border border-gray-200/60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
        {authError && (
          <p className="text-center text-xs text-ios-red mt-4 font-medium">{authError}</p>
        )}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { householdId, loading: householdLoading } = useHouseholdContext();

  if (authLoading || householdLoading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-ios-blue/30 border-t-ios-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <SignInScreen />;
  }

  if (!householdId) {
    return (
      <Routes>
        <Route path="/join/:code" element={<JoinScreen />} />
        <Route path="*" element={<JoinScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/list/all" element={<AllItemsView />} />
      <Route path="/list/:listName" element={<ListView />} />
      <Route path="/actions/all" element={<AllActionsView />} />
      <Route path="/actions/:listName" element={<ActionsView />} />
      <Route path="/join/:code" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HouseholdProvider>
          <UpdatePrompt />
          <AppRoutes />
        </HouseholdProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

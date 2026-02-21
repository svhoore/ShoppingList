import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HouseholdProvider, useHouseholdContext } from './context/HouseholdContext';
import UpdatePrompt from './components/UpdatePrompt';
import JoinScreen from './pages/JoinScreen';
import Dashboard from './pages/Dashboard';
import ListView from './pages/ListView';

function AppRoutes() {
  const { householdId, loading } = useHouseholdContext();

  if (loading) {
    return (
      <div className="min-h-dvh bg-ios-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-ios-blue/30 border-t-ios-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!householdId) {
    return (
      <Routes>
        <Route path="*" element={<JoinScreen />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/list/:listName" element={<ListView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <HouseholdProvider>
        <UpdatePrompt />
        <AppRoutes />
      </HouseholdProvider>
    </BrowserRouter>
  );
}

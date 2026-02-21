import { useState, type FormEvent } from 'react';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';

export default function JoinScreen() {
  const { createHousehold, joinHousehold, error, loading } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMode('create');
    await createHousehold(name);
    setMode('idle');
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setMode('join');
    await joinHousehold(code);
    setMode('idle');
  }

  return (
    <div className="min-h-dvh bg-ios-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-ios-blue rounded-[22px] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ios-text">Our Shopping List</h1>
          <p className="text-ios-secondary text-sm mt-1">
            Share a shopping list with your household
          </p>
        </div>

        {/* Create Card */}
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-5 mb-3">
          <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
            Create a new household
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith Family"
            className="w-full px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition-shadow"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={loading || !name.trim() || name.trim().length < 2}
            className="w-full mt-3 py-3 rounded-xl bg-ios-blue text-white font-semibold text-[15px] active:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {mode === 'create' && loading ? 'Creating…' : 'Create New'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-ios-secondary font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Join Card */}
        <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm p-5">
          <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
            Join with invite code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABCD-EFGH"
            className="w-full px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition-shadow font-mono tracking-widest text-center"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={loading || code.replace(/[-\s]/g, '').length < 6}
            className="w-full mt-3 py-3 rounded-xl bg-ios-bg text-ios-blue font-semibold text-[15px] border border-ios-blue/20 active:bg-ios-blue/5 disabled:opacity-40 transition-all"
          >
            {mode === 'join' && loading ? 'Joining…' : 'Join Existing'}
          </button>
        </form>

        {error && (
          <p className="text-center text-xs text-ios-red mt-4 font-medium">{error}</p>
        )}

        <p className="text-center text-xs text-ios-secondary mt-6">
          Signed in as {user?.email}
          <button
            onClick={signOut}
            className="ml-2 text-ios-red font-medium"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}

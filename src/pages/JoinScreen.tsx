import { useState, type FormEvent } from 'react';
import { useHouseholdContext, slugify } from '../context/HouseholdContext';

export default function JoinScreen() {
  const { createHousehold, joinHousehold, error, loading } = useHouseholdContext();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');

  const slug = slugify(input);

  async function handleSubmit(e: FormEvent, action: 'create' | 'join') {
    e.preventDefault();
    setMode(action);
    if (action === 'create') {
      await createHousehold(input);
    } else {
      await joinHousehold(input);
    }
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

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-2">
            Household ID
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. the-wilson-kitchen"
            className="w-full px-4 py-3 bg-ios-bg rounded-xl text-ios-text text-[16px] placeholder:text-ios-secondary/50 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 transition-shadow"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {slug && slug !== input.toLowerCase().trim() && (
            <p className="text-xs text-ios-secondary mt-1.5">
              Will be saved as: <span className="font-medium text-ios-text">{slug}</span>
            </p>
          )}
          {error && (
            <p className="text-xs text-ios-red mt-2 font-medium">{error}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={(e) => handleSubmit(e, 'create')}
              disabled={loading || !slug}
              className="flex-1 py-3 rounded-xl bg-ios-blue text-white font-semibold text-[15px] active:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {mode === 'create' && loading ? 'Creating…' : 'Create New'}
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'join')}
              disabled={loading || !slug}
              className="flex-1 py-3 rounded-xl bg-ios-bg text-ios-blue font-semibold text-[15px] border border-ios-blue/20 active:bg-ios-blue/5 disabled:opacity-40 transition-all"
            >
              {mode === 'join' && loading ? 'Joining…' : 'Join Existing'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-ios-secondary mt-6">
          No account needed. Just share the ID with your household.
        </p>
      </div>
    </div>
  );
}

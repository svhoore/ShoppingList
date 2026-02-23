import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useHouseholdContext } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { IconChevronRight, IconShoppingBag } from '../components/Icons';

export default function JoinScreen() {
  const { createHousehold, joinHousehold, switchHousehold, lookupHousehold, userHouseholds, error, loading } = useHouseholdContext();
  const { user, signOut } = useAuth();
  const { code: urlCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [pendingJoin, setPendingJoin] = useState<{ code: string; name: string } | null>(null);

  // When arriving via invite link, look up the household name before joining
  useEffect(() => {
    if (urlCode && user && !loading) {
      const normalized = urlCode.replace(/[-\s]/g, '').toUpperCase();
      setCode(normalized);
      lookupHousehold(urlCode).then((result) => {
        if (result) {
          setPendingJoin({ code: normalized, name: result.name });
        } else {
          // Household not found — fall through to manual join
          setMode('join');
          joinHousehold(urlCode).finally(() => setMode('idle'));
        }
      });
    }
  }, [urlCode, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
            <IconShoppingBag className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ios-text">MyHouseholdMgmt</h1>
          <p className="text-ios-secondary text-sm mt-1">
            Manage your household together
          </p>
        </div>

        {/* Existing Households */}
        {userHouseholds.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-3">
              <label className="block text-xs font-medium text-ios-secondary uppercase tracking-wide mb-3">
                Your Households
              </label>
              <div className="space-y-2">
                {userHouseholds.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => switchHousehold(h.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-ios-bg rounded-xl text-left active:bg-ios-blue/10 transition-colors"
                  >
                    <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center text-lg">
                      🏠
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ios-text text-[15px] truncate">{h.name}</p>
                      <p className="text-xs text-ios-secondary">Tap to open</p>
                    </div>
                    <IconChevronRight className="text-ios-secondary/40" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-ios-secondary font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </>
        )}

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
            maxLength={60}
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
            Join with invite link or code
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
            maxLength={12}
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

        {/* Join confirmation dialog (from invite link) */}
        <ConfirmDialog
          open={!!pendingJoin}
          title="Join Household"
          message={`Do you want to join "${pendingJoin?.name}"?`}
          confirmLabel="Join"
          confirmColor="blue"
          onConfirm={() => {
            if (pendingJoin) {
              setMode('join');
              joinHousehold(pendingJoin.code).finally(() => setMode('idle'));
              setPendingJoin(null);
            }
          }}
          onCancel={() => {
            setPendingJoin(null);
            navigate('/');
          }}
        />

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

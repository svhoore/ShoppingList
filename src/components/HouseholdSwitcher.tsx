import type { HouseholdSummary } from '../context/HouseholdContext';
import { IconCheck } from './Icons';

interface HouseholdSwitcherProps {
  householdId: string | null;
  userHouseholds: HouseholdSummary[];
  switchHousehold: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}

export default function HouseholdSwitcher({
  householdId, userHouseholds, switchHousehold, onCreateNew, onClose,
}: HouseholdSwitcherProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-ios-text mb-3">Switch Household</h3>
        <div className="space-y-2">
          {userHouseholds.map((h) => (
            <button
              key={h.id}
              onClick={() => { switchHousehold(h.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                h.id === householdId ? 'bg-ios-blue/10 border border-ios-blue/20' : 'bg-ios-bg active:bg-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-ios-blue/10 rounded-xl flex items-center justify-center text-lg">🏠</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ios-text text-[15px] truncate">{h.name}</p>
              </div>
              {h.id === householdId && (
                <IconCheck size={18} className="text-ios-blue flex-shrink-0" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { onCreateNew(); onClose(); }}
          className="w-full mt-4 py-2.5 rounded-xl text-ios-blue font-medium bg-ios-bg active:bg-gray-200 transition-colors text-[15px]"
        >
          Join / Create Another
        </button>
      </div>
    </div>
  );
}

import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
      <p className="text-sm text-ios-text">A new version is available</p>
      <button
        onClick={() => updateServiceWorker(true)}
        className="text-sm font-semibold text-ios-blue px-3 py-1.5 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

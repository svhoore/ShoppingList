import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Check for updates every 10 minutes (helps on iOS where SW events are unreliable)
const UPDATE_INTERVAL = 10 * 60 * 1000;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => { registration.update(); }, UPDATE_INTERVAL);
      }
    },
  });

  // Fallback for iOS: periodically check if the HTML has changed
  const [iosUpdate, setIosUpdate] = useState(false);
  useEffect(() => {
    // Only run fallback on iOS (all iOS browsers use WebKit)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    if (!isIOS) return;

    let lastETag = '';
    const check = async () => {
      try {
        const res = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
        const etag = res.headers.get('etag') || res.headers.get('last-modified') || '';
        if (lastETag && etag && etag !== lastETag) {
          setIosUpdate(true);
        }
        if (etag) lastETag = etag;
      } catch { /* offline or network error */ }
    };
    // Initial baseline after a short delay
    const init = setTimeout(check, 5000);
    const interval = setInterval(check, UPDATE_INTERVAL);
    return () => { clearTimeout(init); clearInterval(interval); };
  }, []);

  const showPrompt = needRefresh || iosUpdate;

  if (!showPrompt) return null;

  function handleRefresh() {
    if (needRefresh) {
      updateServiceWorker(true);
    } else {
      // iOS fallback: hard reload
      window.location.reload();
    }
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
      <p className="text-sm text-ios-text">A new version is available</p>
      <button
        onClick={handleRefresh}
        className="text-sm font-semibold text-ios-blue px-3 py-1.5 rounded-lg bg-ios-blue/10 active:bg-ios-blue/20 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}

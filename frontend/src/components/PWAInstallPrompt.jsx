import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSSafari =
      /iphone|ipad|ipod/.test(userAgent) &&
      !window.MSStream &&
      /safari/.test(userAgent) &&
      !/crios|fxios|opios/.test(userAgent);

    if (isIOSSafari) {
      setIsIOS(true);
      // Check if previously dismissed
      const dismissed = localStorage.getItem('pwa_ios_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }

    // Android / Chrome / Edge PWA event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSTip(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSTip(false);
    localStorage.setItem(
      isIOS ? 'pwa_ios_dismissed' : 'pwa_prompt_dismissed',
      'true'
    );
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-fade-in-up">
      <div className="bg-[#203e4f] text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1.5 flex items-center justify-center shrink-0 border border-white/10">
              <img
                src="/favicon.svg?v=sms"
                alt="Biyyaf School Crest"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-tight text-white">
                Biyyaf School App
              </h4>
              <p className="text-xs text-slate-300">
                Install on your phone for quick 1-tap access & offline use.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {showIOSTip ? (
          <div className="bg-white/10 rounded-xl p-3 text-xs text-slate-200 space-y-1">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>📲</span> To install on iPhone/iPad:
            </p>
            <p>
              1. Tap the <strong>Share</strong> button (📤) at the bottom.
            </p>
            <p>
              2. Scroll and tap <strong>"Add to Home Screen"</strong> (➕).
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-[#3b6b82] hover:bg-[#2e5365] active:scale-95 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-slate-300 hover:text-white px-3 py-2 rounded-xl transition"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

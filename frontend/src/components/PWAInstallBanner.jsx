import { useState, useEffect, useRef } from 'react';

export default function PWAInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if dismissed previously
    if (localStorage.getItem('pwa_dismissed') === 'true') return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      deferredPrompt.current = e;
      
      // Show the banner after 3 seconds
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS, beforeinstallprompt doesn't fire, so we show it after 3 seconds anyway
    // if not installed and not dismissed
    let iosTimer;
    if (ios) {
      iosTimer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      // We don't nullify the deferred prompt if they dismiss it via the browser UI,
      // but usually the browser will handle it. We'll just nullify it to be safe.
      deferredPrompt.current = null;
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-6" 
      style={{ animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
    >
      <style>
        {`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
      <div className="max-w-4xl mx-auto border rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-['Space_Grotesk']" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <img src="/favicon.svg" alt="PitchPulse" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>PitchPulse</span>
            <span className="text-sm" style={{ color: 'var(--text-sec)' }}>Add to home screen for quick access</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isIOS ? (
            <div className="text-xs font-medium px-3 py-2 rounded-lg text-center flex-1 sm:flex-none whitespace-nowrap" style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-15)' }}>
              Tap Share <span className="inline-block mx-1">↑</span> Add to Home Screen
            </div>
          ) : (
            <button 
              onClick={handleInstallClick}
              className="font-semibold px-6 py-2 rounded-xl transition-colors flex-1 sm:flex-none text-sm"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              Install
            </button>
          )}
          
          <button 
            onClick={handleDismiss}
            className="p-2 flex-shrink-0 transition-colors rounded-full"
            style={{ color: 'var(--text-sec)', backgroundColor: 'transparent' }}
            aria-label="Dismiss"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}

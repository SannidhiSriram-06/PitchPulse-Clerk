import { useEffect } from 'react';
import usePrefsStore from '../store/prefsStore';
import useThemeStore from '../store/themeStore';
import api from '../lib/api';

export default function CustomizePanel({ onClose }) {
  const { defaultView, setDefaultView, showWatchlist, setShowWatchlist, showSources, setShowSources } = usePrefsStore();
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const syncPrefs = async (updates) => {
    try {
      await api.patch('/api/user/preferences', updates);
    } catch (e) {
      console.error('Failed to sync prefs', e);
    }
  };

  const handleTheme = (val) => {
    if (theme !== val) {
      toggleTheme();
    }
  };

  const handleDefaultView = (val) => {
    setDefaultView(val);
    syncPrefs({ default_view: val });
  };

  const handleShowWatchlist = (val) => {
    setShowWatchlist(val);
    syncPrefs({ show_watchlist: val });
  };

  const handleShowSources = (val) => {
    setShowSources(val);
    syncPrefs({ show_sources: val });
  };

  return (
    <>

      <div className="fixed top-0 right-0 h-full w-[280px] z-50 border-l flex flex-col"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="font-semibold text-sm">Customize</span>
          <button onClick={onClose} className="text-lg leading-none transition-colors" style={{ color: 'var(--text-sec)' }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-sec)' }}>Theme</p>
            <div className="flex gap-2">
              {['dark', 'light'].map(t => (
                <button key={t} onClick={() => handleTheme(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize"
                  style={{
                    background: theme === t ? 'var(--accent)' : 'transparent',
                    color: theme === t ? 'var(--accent-text)' : 'var(--text-sec)',
                    borderColor: theme === t ? 'var(--accent)' : 'var(--border)'
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-sec)' }}>Default View</p>
            <div className="flex gap-2">
              {['tabs', 'cards'].map(v => (
                <button key={v} onClick={() => handleDefaultView(v)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize"
                  style={{
                    background: defaultView === v ? 'var(--accent)' : 'transparent',
                    color: defaultView === v ? 'var(--accent-text)' : 'var(--text-sec)',
                    borderColor: defaultView === v ? 'var(--accent)' : 'var(--border)'
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-sec)' }}>Panels</p>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Show Watchlist</span>
                <input type="checkbox" checked={showWatchlist} onChange={e => handleShowWatchlist(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Show Sources by default</span>
                <input type="checkbox" checked={showSources} onChange={e => handleShowSources(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
              </label>
            </div>
          </div>

        </div>
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-text)', border: 'none', cursor: 'pointer' }}>
            Save & Close
          </button>
        </div>
      </div>
    </>
  );
}

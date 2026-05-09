import { useEffect } from 'react';

export default function RateLimitModal({ resetInMinutes, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="border rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 relative"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 transition-colors"
          style={{ color: 'var(--text-sec)' }}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Hourly limit reached</h2>
        <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
          You've used your 3 free briefs this hour.
        </p>
        <p className="text-sm" style={{ color: 'var(--text-sec)' }}>
          {resetInMinutes
            ? `Resets in ${resetInMinutes} minutes.`
            : 'Resets in up to 60 minutes.'}
        </p>
        <p className="text-xs border-t pt-3" style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}>
          Upgrade to Pro for unlimited briefs — coming soon.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg font-semibold text-sm"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

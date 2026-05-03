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
        className="bg-[#111] border border-[#222] rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-white text-xl font-bold">Hourly limit reached</h2>
        <p className="text-gray-300 text-sm">
          You've used your 3 free briefs this hour.
        </p>
        <p className="text-gray-400 text-sm">
          {resetInMinutes
            ? `Resets in ${resetInMinutes} minutes.`
            : 'Resets in up to 60 minutes.'}
        </p>
        <p className="text-gray-500 text-xs border-t border-[#222] pt-3">
          Upgrade to Pro for unlimited briefs — coming soon.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-lg bg-[#C8FF00] text-black font-semibold text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function BriefCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}
      className="space-y-3">
      <div className="animate-pulse rounded h-5 w-3/4" style={{ background: 'var(--border)' }} />
      <div className="animate-pulse rounded h-4 w-full" style={{ background: 'var(--border)' }} />
      <div className="animate-pulse rounded h-4 w-5/6" style={{ background: 'var(--border)' }} />
      <div className="flex gap-2 pt-1">
        <div className="animate-pulse rounded h-3 w-20" style={{ background: 'var(--border)' }} />
        <div className="animate-pulse rounded h-3 w-16" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

export function WatchlistItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <div className="flex-1 space-y-1">
        <div className="animate-pulse rounded h-4 w-2/3" style={{ background: 'var(--border)' }} />
        <div className="animate-pulse rounded h-3 w-1/2" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

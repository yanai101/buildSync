import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import * as React from 'react'

// Detect stale JS chunk errors that happen after a new deploy.
// The browser tries to load an old asset URL that no longer exists on the CDN.
function isStaleChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Unable to preload CSS') ||
    /Loading chunk \d+ failed/.test(msg) ||
    msg.includes('error loading dynamically imported module')
  );
}

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('DefaultCatchBoundary Error:', error)

  // Auto-reload once on stale chunk errors (new deploy → old hash no longer on CDN)
  React.useEffect(() => {
    if (!isStaleChunkError(error)) return;
    const reloadKey = 'chunk_reload_attempted';
    if (sessionStorage.getItem(reloadKey)) {
      // Already tried once — avoid infinite reload loop
      sessionStorage.removeItem(reloadKey);
      return;
    }
    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  }, [error]);

  if (isStaleChunkError(error)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, fontFamily: "'Heebo', sans-serif" }}>
        <div style={{ fontSize: 32 }}>🔄</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>עדכון זמין</div>
        <div style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>טוען גרסה חדשה של האפליקציה...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            router.invalidate()
          }}
          className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className={`px-2 py-1 bg-gray-600 dark:bg-gray-700 rounded-sm text-white uppercase font-extrabold`}
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  )
}

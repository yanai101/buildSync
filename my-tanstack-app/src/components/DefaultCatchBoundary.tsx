import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import * as React from 'react'

import { AppLoadingScreen } from './Layout';

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

const RELOAD_ATTEMPTS_KEY = 'chunk_reload_attempts';
// Set while the stale-chunk screen is showing, so the reset below doesn't
// clear the retry counter during a failed boot.
let staleChunkErrorShown = false;

// Mounted in the root shell. Once the app has run healthily for a while,
// reset the retry counter (otherwise a long-lived PWA session stops
// auto-reloading after two deploys) and strip the `?t=` cache-buster.
export function StaleChunkRecovery() {
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('t')) {
      url.searchParams.delete('t');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    const timer = setTimeout(() => {
      if (!staleChunkErrorShown) sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('DefaultCatchBoundary Error:', error)

  const [showManualReload, setShowManualReload] = React.useState(false);

  // Auto-reload once on stale chunk errors (new deploy → old hash no longer on CDN)
  React.useEffect(() => {
    if (!isStaleChunkError(error)) return;
    
    // If it stays on this error screen for >3 seconds, show a fallback button
    const timer = setTimeout(() => setShowManualReload(true), 3000);
    
    staleChunkErrorShown = true;
    const attempts = Number(sessionStorage.getItem(RELOAD_ATTEMPTS_KEY) || '0');

    // Allow a couple of automatic retries (deploys can briefly leave the old
    // and new chunk hashes in an inconsistent state) before falling back to
    // the manual button. We deliberately do NOT unregister the service worker:
    // sw.js caches nothing, and unregistering drops the push subscription.
    if (attempts >= 2) {
      return () => clearTimeout(timer);
    }

    sessionStorage.setItem(RELOAD_ATTEMPTS_KEY, String(attempts + 1));
    window.location.reload();
    return () => clearTimeout(timer);
  }, [error]);

  if (isStaleChunkError(error)) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
        <AppLoadingScreen title="עדכון זמין" subtitle="טוען גרסה חדשה של האפליקציה..." />
        {showManualReload && (
          <div style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 100000 }}>
            <button 
              onClick={() => {
                // Use replace (not href) so this doesn't add a back-button entry,
                // and the cache-busting query forces a fresh document fetch.
                window.location.replace(
                  window.location.pathname + '?t=' + Date.now()
                );
              }}
              style={{
                padding: '12px 24px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              לחץ כאן לרענון האפליקציה
            </button>
            {/* Diagnostic: lets a user's screenshot tell a real stale chunk apart
                from a module that fails to evaluate on their browser. */}
            <div dir="ltr" style={{ fontSize: 10, opacity: 0.5, maxWidth: '90%', textAlign: 'center', wordBreak: 'break-word' }}>
              {error instanceof Error ? error.message : String(error)} · {navigator.userAgent}
            </div>
          </div>
        )}
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

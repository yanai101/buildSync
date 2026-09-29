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
    
    const attemptsKey = 'chunk_reload_attempts';
    const attempts = Number(sessionStorage.getItem(attemptsKey) || '0');

    // Allow a couple of automatic retries (deploys can briefly leave the old
    // and new chunk hashes in an inconsistent state) before falling back to
    // manual-only, instead of permanently disabling auto-reload after one try.
    if (attempts >= 2) {
      // On mobile PWAs (iOS especially), window.location.reload() doesn't clear SW cache.
      // We must forcefully unregister it so the next manual tap will work.
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          for (let reg of regs) reg.unregister();
        });
      }
      if ('caches' in window) {
        caches.keys().then(keys => {
          keys.forEach(key => caches.delete(key));
        });
      }
      return () => clearTimeout(timer);
    }

    sessionStorage.setItem(attemptsKey, String(attempts + 1));
    // Clear caches before soft reload
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
    }
    window.location.reload();
    return () => clearTimeout(timer);
  }, [error]);

  if (isStaleChunkError(error)) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
        <AppLoadingScreen title="עדכון זמין" subtitle="טוען גרסה חדשה של האפליקציה..." />
        {showManualReload && (
          <div style={{ position: 'absolute', bottom: '15%', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100000 }}>
            <button 
              onClick={async () => {
                if ('caches' in window) {
                  try {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((key) => caches.delete(key)));
                  } catch (e) {
                    console.error('Cache clear failed', e);
                  }
                }
                if ('serviceWorker' in navigator) {
                  try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let reg of regs) {
                      await reg.unregister();
                    }
                  } catch (e) {
                    console.error('SW unregister failed', e);
                  }
                }
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

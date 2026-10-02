// Single owner of automatic recovery from failed lazy-chunk loads
// ("Failed to fetch dynamically imported module"), e.g. a tab left open across a deploy.
//
// The inline <head> script below is the ONLY code allowed to auto-reload. It reloads at most
// once per failed chunk URL per tab session. A repeat failure for the same chunk, or any failure
// when sessionStorage is unavailable, never auto-reloads: DefaultCatchBoundary shows the
// "update available" screen with a manual refresh button instead.

export const PRELOAD_RELOAD_KEY = 'vite-preload-reload' // JSON: { [incident]: timestamp }
export const PRELOAD_DIAG_KEY = 'vite-preload-diag' // JSON: DiagEntry[] (temporary diagnostics)

// VERCEL_* are only set when building on Vercel; locally this is 'local'.
export const BUILD_ID: string = import.meta.env.VITE_BUILD_ID || 'local'

export type ChunkRecoveryState = {
  reloading: boolean
  build: string
  log: (entry: Record<string, unknown>) => void
}

declare global {
  interface Window {
    __chunkRecovery?: ChunkRecoveryState
  }
}

// Runs before any module script, so it is registered before the first dynamic import.
export const CHUNK_RECOVERY_SCRIPT = `
(function() {
  if (window.__chunkRecovery) return;
  var RELOAD_KEY = ${JSON.stringify(PRELOAD_RELOAD_KEY)};
  var DIAG_KEY = ${JSON.stringify(PRELOAD_DIAG_KEY)};
  function readJson(key, fallback) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback; } catch (e) { return fallback; }
  }
  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  var state = window.__chunkRecovery = {
    reloading: false,
    build: ${JSON.stringify(BUILD_ID)},
    log: function(entry) {
      entry.at = new Date().toISOString();
      entry.build = state.build;
      entry.href = location.href;
      entry.online = navigator.onLine;
      console.warn('[chunk-recovery]', entry);
      var log = readJson(DIAG_KEY, []);
      log.push(entry);
      writeJson(DIAG_KEY, log.slice(-20));
    }
  };
  window.addEventListener('vite:preloadError', function(event) {
    var error = event.payload;
    var message = String((error && error.message) || error);
    var urlMatch = message.match(/(https?:\\/\\/|\\/assets\\/)\\S+/);
    var failedUrl = urlMatch ? urlMatch[0] : null;
    // Safari's "Importing a module script failed." has no URL: fall back to the route path.
    var incident = failedUrl || ('path:' + location.pathname);

    // TanStack Router's lazyRouteComponent has its own reload-once keyed on this exact message.
    // Pre-mark it so the router never adds a second automatic reload on top of this one.
    try { sessionStorage.setItem('tanstack_router_reload:' + message, '1'); } catch (e) {}

    var attempts = readJson(RELOAD_KEY, {});
    var alreadyReloaded = Boolean(attempts[incident]);
    var action;
    if (state.reloading) {
      action = 'skip: reload already in progress';
    } else if (alreadyReloaded) {
      action = 'skip: already auto-reloaded for this chunk';
    } else {
      attempts[incident] = Date.now();
      // If the marker can't be persisted we can't prove this is the first attempt: don't reload.
      action = writeJson(RELOAD_KEY, attempts) ? 'reload' : 'skip: sessionStorage unavailable';
    }
    state.log({
      source: 'vite:preloadError',
      error: message,
      failedUrl: failedUrl,
      alreadyReloaded: alreadyReloaded,
      action: action
    });
    // No preventDefault(): the error still reaches the route, so DefaultCatchBoundary shows the
    // update screen (instead of a broken undefined module) until the reload, or for good.
    if (action === 'reload') {
      state.reloading = true;
      location.reload();
    }
  });
})();
`

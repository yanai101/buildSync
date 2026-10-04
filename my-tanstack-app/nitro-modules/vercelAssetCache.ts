import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { NitroModule } from 'nitro/types'

// Missing /assets/* files must not be cached; existing (content-hashed) ones stay immutable.
//
// By default nitro/vite adds a `/assets/**` route rule with `cache-control: immutable`. On Vercel
// that rule ends up in two places, both of which also hit 404s for missing chunks:
//   1. config.json: a header route BEFORE the filesystem check, so it applies to misses too.
//   2. the server function: the route rule sets the header on the function's own 404 response.
// A cached 404 then survives reloads, so the browser can never load that chunk again.
//
// Fix (Vercel preset only):
//   - Route rule = no-store. nitro/vite only adds its immutable rule when no cache-control is set.
//     On Vercel, existing files are served by the CDN and never reach the function, so only
//     misses see this rule.
//   - config.json: immutable moves to the `hit` phase (runs only when a real file matched), and
//     misses get no-store right after the filesystem check.
//
// The landing page is a static file at / (public/index.html). Its name isn't content-hashed, so it
// must revalidate on every visit; the `hit` phase pins that explicitly instead of relying on
// Vercel's default for static files.

type VercelRoute = {
  src?: string
  handle?: string
  headers?: Record<string, string>
  continue?: boolean
  important?: boolean
  dest?: string
}

const ASSETS_RULE = '/assets/**'
const ASSETS_SRC = '/assets/(.*)'
const IMMUTABLE = 'public, max-age=31536000, immutable'
const NO_STORE = 'no-store'
const LANDING_SRC = '/(index\\.html)?'
const REVALIDATE = 'public, max-age=0, must-revalidate'

export const vercelAssetCache: NitroModule = {
  name: 'vercel-asset-cache',
  setup(nitro) {
    if (!nitro.options.preset.startsWith('vercel')) return

    nitro.options.routeRules[ASSETS_RULE] = {
      ...nitro.options.routeRules[ASSETS_RULE],
      headers: { ...nitro.options.routeRules[ASSETS_RULE]?.headers, 'cache-control': NO_STORE },
    }

    // Runs after the preset's own `compiled` hook (which writes config.json): preset hooks are
    // registered before modules are installed, and hooks run in registration order.
    nitro.hooks.hook('compiled', async () => {
      const configPath = join(nitro.options.output.dir, 'config.json')
      const config = JSON.parse(await readFile(configPath, 'utf8')) as { routes: VercelRoute[] }
      const routes = config.routes

      const filesystem = routes.findIndex((r) => r.handle === 'filesystem')
      const preFsAssetRule = routes.findIndex((r) => r.src === ASSETS_SRC && r.headers?.['cache-control'] === NO_STORE)
      if (filesystem === -1 || preFsAssetRule === -1 || preFsAssetRule > filesystem || routes.some((r) => r.handle === 'hit')) {
        throw new Error('[vercel-asset-cache] Unexpected Vercel routes from Nitro; refusing to patch config.json')
      }

      routes.splice(preFsAssetRule, 1)
      // Routes right after `filesystem` only run when no static file matched (a missing asset).
      const afterFilesystem = routes.findIndex((r) => r.handle === 'filesystem') + 1
      routes.splice(afterFilesystem, 0, { src: ASSETS_SRC, headers: { 'cache-control': NO_STORE }, continue: true })
      routes.push(
        { handle: 'hit' },
        { src: ASSETS_SRC, headers: { 'cache-control': IMMUTABLE }, continue: true, important: true },
        { src: LANDING_SRC, headers: { 'cache-control': REVALIDATE }, continue: true, important: true },
      )

      await writeFile(configPath, JSON.stringify(config, null, 2))
    })
  },
}

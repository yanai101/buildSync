import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Test credentials live in the git-ignored `.env.e2e` (see `.env.e2e.example`).
if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

/**
 * End-to-end specs run against the PRODUCTION BUILD, not the dev server.
 *
 * Why this file exists: playwright.config.ts starts `npm run dev`, so every e2e
 * run there exercises the Vite dev server — which is not what Vercel serves.
 * SSR/prerender, the manual vendor chunking in vite.config.ts and the asset
 * rules in nitro-modules/vercelAssetCache.ts only exist in the built output, so
 * a green dev-server run can still ship a broken app.
 *
 * Use playwright.config.ts while iterating; use this one before merging:
 *
 *   npm run build && npm run test:e2e:build
 *
 * Set E2E_BASE_URL to point at a deployed preview instead, in which case no
 * local server is started.
 */
const deployedURL = process.env.E2E_BASE_URL;
// Deliberately NOT 3000: the dev server usually owns that port, and this config
// must never end up testing the dev server by accident.
const PORT = process.env.E2E_BUILD_PORT ?? '3100';
const baseURL = deployedURL ?? `http://localhost:${PORT}`;

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  // Drop teaser.spec.ts. It visits /dev/teasers, which does
  // `if (!import.meta.env.DEV) throw notFound()` (src/routes/dev.teasers.tsx),
  // so against a PRODUCTION build that route legitimately 404s. Inheriting the
  // base config's projects unchanged made it fail here for a reason unrelated
  // to whatever change was being verified — a false alarm in /verify is worse
  // than no check. The teaser gallery is covered by the dev-server config.
  projects: base.projects?.map((project) => {
    const match = project.testMatch;
    if (!(match instanceof RegExp)) return project;
    const withoutTeaser = match.source.replace(/\|?teaser/, '');
    return { ...project, testMatch: new RegExp(withoutTeaser) };
  }),
  // Against a deployed URL there is nothing to start locally.
  webServer: deployedURL
    ? undefined
    : {
        command: `PORT=${PORT} npm run start`,
        url: baseURL,
        // Never reuse: a dev server already on :3000 would silently defeat the
        // entire point of this config.
        reuseExistingServer: false,
        timeout: 120_000,
      },
});

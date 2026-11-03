import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
    // Playwright end-to-end specs live in e2e/ and run via `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});

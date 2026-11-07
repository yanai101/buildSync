import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    server: { deps: { inline: ['convex-test'] } },
    // Playwright end-to-end specs live in e2e/ and run via `npm run test:e2e`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      // istanbul, not v8. v8 can only count lines in files it actually
      // executed, so the ~26 convex modules no test imports were reported as
      // 0/0 and dropped out of the denominator entirely — coverage read 33.7%
      // instead of ~20%, and adding a test for a big untested file would have
      // made the number go DOWN. istanbul instruments from the AST, so an
      // unloaded file counts as genuinely uncovered.
      //
      // Keep this pinned to the SAME minor as vitest. A mismatched major (npm
      // installs the latest by default) fails with a misleading
      // "AssertionError: coverageFilesDirectory is required".
      provider: 'istanbul',
      reporter: ['text-summary', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure what is realistically unit-testable. The large screen
      // components are covered by Playwright instead (see e2e/), so including
      // them here would only produce a misleading denominator.
      include: [
        'convex/**/*.ts',
        'src/utils/**/*.ts',
        'src/server/**/*.ts',
        'src/hooks/**/*.ts',
      ],
      exclude: [
        '**/_generated/**',
        '**/*.test.ts',
        'convex/_test/**',
        'convex/seed.ts',
        'src/utils/mockData.ts',
      ],
      thresholds: {
        // Explicit integer floors, deliberately NOT `autoUpdate: true`.
        //
        // autoUpdate was tried first and had to be abandoned: it latches a
        // high-water mark from whichever run happens to measure highest, and
        // coverage here is not bit-reproducible across runs (we saw 19.87% then
        // 19.86%). The result is a gate that blocks `git push` over a 0.01%
        // phantom regression and cannot be satisfied by any code change.
        //
        // These floors sit just below the current numbers. Raise them
        // deliberately as tests land — an explicit, reviewable bump instead of
        // a silent one that can wedge a push.
        lines: 19,
        statements: 18,
        branches: 15,
        functions: 15,
        // Hard per-path floors for the modules that carry the risk. These are
        // the Phase 3 targets of the software-factory plan; uncomment each as
        // its tests land.
        // 'convex/_lib/**/*.ts': { lines: 80, functions: 80 },
        // 'convex/_lib/entitlements.ts': { lines: 100, functions: 100 },
        // 'src/utils/boqCalculations.ts': { lines: 90 },
      },
    },
  },
});

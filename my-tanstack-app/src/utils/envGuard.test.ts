import { describe, test, expect } from 'vitest';
import schema from '../../env.schema.json';
import { requireEnv, deploymentContext } from './envGuard';

interface Var {
  name: string;
  homes: string[];
  pattern?: string;
  enum?: string[];
  pairedWith?: string;
  platformProvided?: string;
  public?: boolean;
  dualHome?: boolean;
  required?: boolean;
}
const vars = schema.vars as Var[];
const byName = new Map(vars.map((v) => [v.name, v]));

describe('requireEnv', () => {
  test('returns the value when set', () => {
    expect(requireEnv('X', 'value', 'somewhere')).toBe('value');
  });

  test('throws naming the variable, the environment and where to set it', () => {
    let msg = '';
    try {
      requireEnv('VITE_CONVEX_URL', undefined, 'Vercel → Environment Variables');
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain('VITE_CONVEX_URL');
    expect(msg).toContain('Vercel → Environment Variables');
    // The Production-only scoping trap must be called out, because it is the
    // most common cause of a preview 500.
    expect(msg).toContain('Production');
    expect(msg).toContain('check-env.mjs');
  });

  test('treats empty string as missing (a blank Vercel var is not a value)', () => {
    expect(() => requireEnv('X', '', 'somewhere')).toThrow(/Missing X/);
  });

  test('deploymentContext never throws', () => {
    expect(typeof deploymentContext()).toBe('string');
  });
});

describe('env.schema.json integrity', () => {
  test('every var has either homes or platformProvided', () => {
    for (const v of vars) {
      const ok = v.homes.length > 0 || !!v.platformProvided;
      expect(ok, `${v.name} declares neither a home nor platformProvided`).toBe(true);
    }
  });

  test('every regex pattern compiles', () => {
    for (const v of vars) if (v.pattern) expect(() => new RegExp(v.pattern!), v.name).not.toThrow();
  });

  test('pairedWith is symmetric', () => {
    for (const v of vars) {
      if (!v.pairedWith) continue;
      const other = byName.get(v.pairedWith);
      expect(other, `${v.name} is paired with unknown var ${v.pairedWith}`).toBeDefined();
      expect(other!.pairedWith, `${v.pairedWith} does not point back at ${v.name}`).toBe(v.name);
    }
  });

  test('homes use only known tokens', () => {
    const allowed = new Set([
      'convex:dev', 'convex:prod', 'convex:defaults',
      'vercel:production', 'vercel:preview', 'vercel:development',
      'local', 'local:e2e',
    ]);
    for (const v of vars) {
      for (const h of v.homes) expect(allowed.has(h), `${v.name} has unknown home "${h}"`).toBe(true);
    }
  });

  test('dualHome is set exactly when a var lives in both Convex and Vercel', () => {
    for (const v of vars) {
      const inConvex = v.homes.some((h) => h.startsWith('convex:'));
      const inVercel = v.homes.some((h) => h.startsWith('vercel:'));
      // CONVEX_DEPLOY_KEY is consumed by the deploy command, not by app code,
      // so it is Vercel-only despite its name.
      expect(!!v.dualHome, `${v.name}: dualHome should be ${inConvex && inVercel}`).toBe(inConvex && inVercel);
    }
  });

  test('requiredIn only names homes the var actually declares', () => {
    for (const v of vars as (Var & { requiredIn?: string[] })[]) {
      if (!v.requiredIn) continue;
      for (const h of v.requiredIn) {
        expect(
          v.homes.includes(h),
          `${v.name} is requiredIn "${h}" but does not declare it as a home`,
        ).toBe(true);
      }
    }
  });

  test('a var exposed to the browser is marked public, and only VITE_ vars are', () => {
    for (const v of vars) {
      if (v.name.startsWith('VITE_')) expect(v.public, `${v.name} is a VITE_ var and must be marked public`).toBe(true);
      if (v.public) expect(v.name.startsWith('VITE_'), `${v.name} is marked public but is not a VITE_ var`).toBe(true);
    }
  });
});

describe('env.schema.json covers every variable the code actually reads', () => {
  // ?raw so this works without node:fs under the edge-runtime test environment.
  const sources = {
    ...import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
    ...import.meta.glob('../../convex/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  } as Record<string, string>;

  // Vars that are intentionally undeclared: test-only or framework built-ins.
  const ignore = new Set(['DEV', 'MODE', 'PROD', 'SSR', 'BASE_URL', 'CI', 'VITE_BUILD_ID']);

  test('finds source files to scan', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  test('no undeclared env var is read anywhere', () => {
    const found = new Map<string, string>();
    for (const [file, code] of Object.entries(sources)) {
      if (file.includes('_generated') || file.endsWith('.test.ts')) continue;
      for (const m of code.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)) {
        if (!ignore.has(m[1]) && !found.has(m[1])) found.set(m[1], file);
      }
    }
    const undeclared = [...found.entries()]
      .filter(([name]) => !byName.has(name))
      .map(([name, file]) => `${name} (read in ${file})`);
    expect(
      undeclared,
      `These env vars are read by the code but missing from env.schema.json:\n  ${undeclared.join('\n  ')}`,
    ).toEqual([]);
  });
});

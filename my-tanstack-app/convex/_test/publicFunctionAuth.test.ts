/**
 * Structural guard: every PUBLIC Convex function that accepts a projectId must
 * authenticate or authorise its caller.
 *
 * AGENTS.md requires role boundaries to hold at the query level, not merely in
 * the UI. A public `query`/`mutation`/`action` is callable by anyone who can
 * reach the deployment URL, so one that takes a projectId and performs no check
 * acts on a project the caller may have nothing to do with.
 *
 * This is deliberately a STATIC scan rather than a runtime sweep: calling every
 * function for real would require constructing valid arguments for each, which
 * is brittle and would quietly skip the ones it could not build. Reading the
 * source cannot be skipped.
 */
import { describe, test, expect } from 'vitest';

const sources = Object.entries(
  import.meta.glob('../**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>,
).filter(([f]) => !f.includes('_generated') && !f.includes('/_test/') && !f.endsWith('.test.ts'));

/**
 * Identifiers that establish who the caller is or what they may do. Matched by
 * shape rather than an explicit list, so a new helper counts automatically:
 * requireProjectMember, requireArchiveAccess, checkSuperAdmin, canUserViewBudget,
 * resolveAccess, getAuthUserId, …
 */
const AUTH_CALL = /\b(require[A-Z]\w*|check[A-Z]\w*|assert[A-Z]\w*|canUser\w*|resolveAccess|getAuthUserId)\b|ctx\.auth/;

interface PublicFn {
  id: string;
  body: string;
  declaresProjectId: boolean;
}

/** Splits a module into its `export const NAME = query|mutation|action({...})` chunks. */
function publicFunctions(file: string, code: string): PublicFn[] {
  return code
    .split(/\nexport const /)
    .slice(1)
    .filter((chunk) => /^\w+\s*=\s*(query|mutation|action)\(/.test(chunk))
    .map((chunk) => {
      const name = chunk.match(/^(\w+)/)?.[1] ?? '?';
      // Only the DECLARED args block. Matching any mention of projectId in the
      // body gives false positives — that mistake made this scan report 34
      // offenders when the real number was 7.
      const args = chunk.match(/args\s*:\s*\{([\s\S]*?)\n\s*\}\s*,\s*\n\s*(handler|returns)/);
      return {
        id: `${file.replace('../', '')}:${name}`,
        body: chunk,
        declaresProjectId: !!args && /\bprojectId\s*:/.test(args[1]),
      };
    });
}

const allPublic = sources.flatMap(([f, code]) => publicFunctions(f, code));
const projectScoped = allPublic.filter((fn) => fn.declaresProjectId);

/**
 * Public, project-scoped functions with NO authentication or authorisation.
 *
 * Every entry is a real hole: the function accepts a projectId and acts on it
 * without establishing who is calling. Verified by reading each handler.
 *
 *   checklists.ts:addChecklist      inserts a checklist into any project
 *   dashboard.ts:getOverview        returns stages, BUDGET CATEGORIES, activity,
 *                                   alerts, orders and defects for any project
 *   mutations.ts:createContractor   inserts a contractor into any project
 *   projects.ts:saveProjectSetup    writes project setup for any project
 *   projects.ts:updateBudgetTotal   rewrites any project's total budget
 *   stages.ts:createFromTemplate    patches any project and replaces its stages
 *   stages.ts:addStage              appends a stage to any project
 *
 * This list exists to stop the problem GROWING while the holes are closed one
 * at a time. Shrink it — never add to it. When a function is fixed, remove its
 * entry; the test then fails if it is still listed, so the list cannot rot.
 */
const KNOWN_UNAUTHENTICATED = [
  'checklists.ts:addChecklist',
  'dashboard.ts:getOverview',
  'mutations.ts:createContractor',
  'projects.ts:saveProjectSetup',
  'stages.ts:addStage',
  'stages.ts:createFromTemplate',
  'projects.ts:updateBudgetTotal',
].sort();

describe('public function authorisation sweep', () => {
  test('the scan actually found the backend', () => {
    expect(sources.length).toBeGreaterThan(30);
    expect(allPublic.length).toBeGreaterThan(100);
    expect(projectScoped.length).toBeGreaterThan(40);
  });

  test('no NEW public project-scoped function lacks an auth check', () => {
    const unauthenticated = projectScoped
      .filter((fn) => !AUTH_CALL.test(fn.body))
      .map((fn) => fn.id)
      .sort();

    expect(
      unauthenticated,
      'A public Convex function takes a projectId but never establishes who is ' +
        'calling. Add a guard from convex/_lib/projectAccess.ts. If an entry ' +
        'disappeared because you FIXED it, delete it from KNOWN_UNAUTHENTICATED.',
    ).toEqual(KNOWN_UNAUTHENTICATED);
  });

  test('the known-hole list only names functions that still exist', () => {
    const ids = new Set(allPublic.map((fn) => fn.id));
    const stale = KNOWN_UNAUTHENTICATED.filter((id) => !ids.has(id));
    expect(stale, 'These are listed as known holes but no longer exist').toEqual([]);
  });

  test('the overwhelming majority of project-scoped functions ARE guarded', () => {
    const guarded = projectScoped.filter((fn) => AUTH_CALL.test(fn.body)).length;
    // Records the ratio so a mass regression is visible, not just a single one.
    expect(guarded / projectScoped.length).toBeGreaterThan(0.8);
  });
});

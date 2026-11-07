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

/**
 * Extracts the DECLARED `args: { ... }` block by matching braces.
 *
 * Two mistakes were made here before, and both understated the problem:
 *   - matching any mention of projectId in the body reported 34 offenders when
 *     the real figure was different, because a body may merely mention it;
 *   - a regex requiring a newline before the closing brace silently SKIPPED
 *     every single-line `args: { projectId: v.id('projects') },` — which hid
 *     nearly half the project-scoped functions, 101 rather than 53.
 * Brace matching handles both forms.
 */
function argsBlock(chunk: string): string | null {
  const key = chunk.search(/\bargs\s*:\s*\{/);
  if (key < 0) return null;
  const start = chunk.indexOf('{', key);
  let depth = 0;
  for (let i = start; i < chunk.length; i++) {
    if (chunk[i] === '{') depth++;
    else if (chunk[i] === '}') {
      depth--;
      if (depth === 0) return chunk.slice(start + 1, i);
    }
  }
  return null;
}

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
      const args = argsBlock(chunk);
      return {
        id: `${file.replace('../', '')}:${name}`,
        body: chunk,
        declaresProjectId: args !== null && /\bprojectId\s*:/.test(args),
      };
    });
}

const allPublic = sources.flatMap(([f, code]) => publicFunctions(f, code));
const projectScoped = allPublic.filter((fn) => fn.declaresProjectId);

/**
 * Public, project-scoped functions with NO authentication or authorisation.
 *
 * EMPTY, and it must stay that way. All 14 that were found have been guarded:
 *
 *   projects.ts:updateBudgetTotal        -> requireProjectOwner
 *   projects.ts:saveProjectSetup         -> requireProjectOwner
 *   projects.ts:getWithDetails           -> requireProjectMember
 *   projects.ts:getOwnerSubscription     -> requireProjectMember
 *   dashboard.ts:getOverview             -> requireProjectMember + financial redaction
 *   dashboard.ts:seedAlert               -> requireProjectMember
 *   dashboard.ts:deleteAllAlerts         -> requireProjectMember
 *   checklists.ts:list                   -> requireProjectMember
 *   checklists.ts:addChecklist           -> requireProjectMember
 *   mutations.ts:createContractor        -> requireProjectMember
 *   stages.ts:addStage                   -> requireProjectMember
 *   stages.ts:createFromTemplate         -> requireProjectMember
 *   stages.ts:backfillStageContractors   -> requireProjectOwner
 *   quotes.ts:listTopics                 -> requireProjectMember when project-scoped
 *
 * Do not add to this list to make a failing build pass. Guard the function.
 */
const KNOWN_UNAUTHENTICATED: string[] = [];

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

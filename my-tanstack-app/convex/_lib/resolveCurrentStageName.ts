import { QueryCtx, MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * Resolves the name of the current (next-to-complete) stage for a project.
 *
 * Logic:
 *  1. First stage (by sortOrder) that is NOT 'done' AND has at least one
 *     contractor linked via the `stageContractors` table → current stage.
 *  2. If no such stage exists, fall back to the first non-done stage
 *     (even without a contractor) so the field is never stale.
 *  3. If every stage is 'done' → "הושלם".
 *  4. If no stages exist → "חדש".
 *
 * Always uses the `by_project_sort` index so results are deterministically
 * ordered by `sortOrder`.
 */
export async function resolveCurrentStageName(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>,
): Promise<string> {
  const stages = await ctx.db
    .query('stages')
    .withIndex('by_project_sort', (q) => q.eq('projectId', projectId))
    .collect();

  if (stages.length === 0) return 'חדש';

  const nonDone = stages.filter((s) => s.status !== 'done');
  if (nonDone.length === 0) return 'הושלם';

  // Prefer the first non-done stage that has a linked contractor
  for (const stage of nonDone) {
    const hasContractor = await ctx.db
      .query('stageContractors')
      .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
      .first();
    if (hasContractor) return stage.name;
  }

  // Fallback: first non-done stage (no contractor linked yet)
  return nonDone[0].name;
}

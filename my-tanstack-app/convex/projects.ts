import { query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query('projects')
      .filter((q) => q.eq(q.field('ownerUserId'), userId))
      .collect();
  },
});

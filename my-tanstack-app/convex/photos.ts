import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .collect();

    const tasks = await ctx.db
      .query('stageTasks')
      .collect(); // In production, filter by stage IDs

    return stages.map(s => ({
      ...s,
      id: Number(s.sortOrder), // Map to legacy ID if needed
      progress: s.progressPct,
      tasks: tasks
        .filter(t => t.stageId === s._id)
        .map(t => ({
          ...t,
          id: t._id, // Keep ID for updates
        })),
    }));
  },
});

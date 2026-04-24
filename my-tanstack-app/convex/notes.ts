import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query('messages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    return notes.map(n => ({
      ...n,
      id: n._id,
      fromName: n.fromName,
      role: n.role,
      text: n.text,
      thread: n.thread,
      resolved: n.resolved,
      date: 'היום', // Should format from _creationTime
      time: '12:00',
    }));
  },
});

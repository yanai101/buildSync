import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

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

export const getWithDetails = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const rooms = await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    return {
      ...project,
      rooms: rooms.map(r => ({
        uid: r._id,
        name: r.name,
        type: r.type,
        floor: r.floor,
        size: r.sizeSqm,
        isWet: r.isWet,
        needsAc: r.needsAc,
      })),
    };
  },
});

export const createProject = mutation({
  args: {
    name: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert('projects', {
      name: args.name,
      address: args.address,
      ownerUserId: userId ?? undefined,
      ownerName: "בעל הבית",
      managerName: "טרם הוגדר",
      inspectorName: "טרם הוגדר",
      startDate: new Date().toISOString(),
      expectedEnd: new Date().toISOString(),
      floors: 1,
      areaSqm: 0,
      progressPct: 0,
      budgetTotal: 0,
      spent: 0,
      committed: 0,
      currentStageName: "חדש",
    });
  }
});

export const saveProjectSetup = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.string(),
    address: v.string(),
    ownerName: v.optional(v.string()),
    managerName: v.optional(v.string()),
    inspectorName: v.optional(v.string()),
    floors: v.optional(v.number()),
    areaSqm: v.optional(v.number()),
    rooms: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { 
      name: args.name, 
      address: args.address,
      ownerName: args.ownerName ?? "בעל הבית",
      managerName: args.managerName ?? "טרם הוגדר",
      inspectorName: args.inspectorName ?? "טרם הוגדר",
      floors: args.floors ?? 1,
      areaSqm: args.areaSqm ?? 0,
    });
    
    const existingRooms = await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const r of existingRooms) {
      await ctx.db.delete(r._id);
    }
    
    for (const r of args.rooms) {
      await ctx.db.insert('projectRooms', {
        projectId: args.projectId,
        name: r.name,
        type: r.type,
        floor: Number(r.floor),
        sizeSqm: Number(r.size),
        isWet: r.isWet || false,
        needsAc: r.needsAc || false,
        sortOrder: 0,
      });
    }
  },
});

export const deleteProject = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.ownerUserId !== userId) {
       throw new Error("Unauthorized");
    }

    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const stage of stages) {
      const tasks = await ctx.db
        .query('stageTasks')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .collect();
      for (const t of tasks) await ctx.db.delete(t._id);
      await ctx.db.delete(stage._id);
    }

    const tables = [
      'projectRooms', 'boqItems', 'expenses', 'notes', 'messages',
      'photos', 'budgetCategories', 'activityFeed', 
      'timelineBars', 'priceQuotes', 'contractors'
    ];

    for (const table of tables) {
      try {
        const records = await ctx.db
          .query(table as any)
          .withIndex('by_project', (q: any) => q.eq('projectId', args.projectId))
          .collect();
        for (const rec of records) {
          await ctx.db.delete(rec._id);
        }
      } catch (e) {}
    }

    await ctx.db.delete(args.projectId);
  }
});

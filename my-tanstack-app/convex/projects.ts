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
      .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', userId))
      .order('desc')
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
    ownerName: v.optional(v.string()),
    managerName: v.optional(v.string()),
    inspectorName: v.optional(v.string()),
    floors: v.optional(v.number()),
    areaSqm: v.optional(v.number()),
    budgetTotal: v.optional(v.number()),
    startDate: v.optional(v.string()),
    expectedEnd: v.optional(v.string()),
    // One-time floor-waste setting captured at creation. Cannot be modified
    // afterwards — `saveProjectSetup` does not accept this argument.
    floorWastePct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ctx.db.insert('projects', {
      name: args.name,
      address: args.address,
      ownerUserId: userId ?? undefined,
      ownerName: args.ownerName || "בעל הבית",
      managerName: args.managerName || "טרם הוגדר",
      inspectorName: args.inspectorName || "טרם הוגדר",
      startDate: args.startDate || new Date().toISOString(),
      expectedEnd: args.expectedEnd || new Date().toISOString(),
      floors: args.floors || 1,
      areaSqm: args.areaSqm || 0,
      progressPct: 0,
      budgetTotal: args.budgetTotal || 0,
      spent: 0,
      committed: 0,
      currentStageName: "חדש",
      ...(args.floorWastePct !== undefined ? { floorWastePct: args.floorWastePct } : {}),
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
    budgetTotal: v.optional(v.number()),
    rooms: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // Note: floorWastePct is intentionally NOT accepted here. It is set once
    // at project creation (see createProject) and locked thereafter.
    const projectPatch = {
      name: args.name,
      address: args.address,
      ownerName: args.ownerName ?? "בעל הבית",
      managerName: args.managerName ?? "טרם הוגדר",
      inspectorName: args.inspectorName ?? "טרם הוגדר",
      floors: args.floors ?? 1,
      areaSqm: args.areaSqm ?? 0,
      ...(args.budgetTotal !== undefined ? { budgetTotal: args.budgetTotal } : {}),
    };

    await ctx.db.patch(args.projectId, projectPatch);
    
    const existingRooms = await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    const existingById = new Map(existingRooms.map((room) => [room._id, room]));
    const keptRoomIds = new Set<string>();

    for (const r of args.rooms) {
      const patch = {
        projectId: args.projectId,
        name: r.name,
        type: r.type,
        floor: Number(r.floor),
        sizeSqm: Number(r.size),
        isWet: r.isWet || false,
        needsAc: r.needsAc || false,
        sortOrder: 0,
      };
      const existingRoom = existingById.get(r.uid);
      if (existingRoom) {
        keptRoomIds.add(existingRoom._id);
        await ctx.db.patch(existingRoom._id, patch);
      } else {
        const insertedId = await ctx.db.insert('projectRooms', patch);
        keptRoomIds.add(insertedId);
      }
    }

    for (const room of existingRooms) {
      if (!keptRoomIds.has(room._id)) {
        await ctx.db.delete(room._id);
      }
    }
  },
});

export const updateBudgetTotal = mutation({
  args: {
    projectId: v.id('projects'),
    budgetTotal: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.budgetTotal < 0) {
      throw new Error('Budget total cannot be negative');
    }

    await ctx.db.patch(args.projectId, {
      budgetTotal: args.budgetTotal,
    });
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

    // 1. Delete stages and their descendants
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const stage of stages) {
      const milestones = await ctx.db
        .query('stageMilestones')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .collect();
      for (const m of milestones) {
        const links = await ctx.db
          .query('stageMilestoneTasks')
          .withIndex('by_milestone', (q) => q.eq('milestoneId', m._id))
          .collect();
        for (const l of links) await ctx.db.delete(l._id);
        await ctx.db.delete(m._id);
      }

      const tasks = await ctx.db
        .query('stageTasks')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .collect();
      for (const t of tasks) await ctx.db.delete(t._id);

      const stageContractors = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .collect();
      for (const sc of stageContractors) await ctx.db.delete(sc._id);

      await ctx.db.delete(stage._id);
    }

    // 2. Delete contractors and their descendants
    const contractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const contractor of contractors) {
      const cmilestones = await ctx.db
        .query('contractorPaymentMilestones')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
        .collect();
      for (const m of cmilestones) await ctx.db.delete(m._id);

      const cnotes = await ctx.db
        .query('contractorNotes')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
        .collect();
      for (const n of cnotes) await ctx.db.delete(n._id);

      await ctx.db.delete(contractor._id);
    }

    // 3. Delete photos and their descendants
    const photos = await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const photo of photos) {
      const pnotes = await ctx.db
        .query('photoNotes')
        .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
        .collect();
      for (const n of pnotes) await ctx.db.delete(n._id);

      const pannotations = await ctx.db
        .query('photoAnnotations')
        .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
        .collect();
      for (const a of pannotations) await ctx.db.delete(a._id);

      const versions = await ctx.db
        .query('photoFileVersions')
        .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
        .collect();
      for (const v of versions) {
        // we'll delete project files and storage globally in step 4
        await ctx.db.delete(v._id);
      }
      await ctx.db.delete(photo._id);
    }

    // 4. Delete project files and storage
    const projectFiles = await ctx.db
      .query('projectFiles')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const pf of projectFiles) {
      try { await ctx.storage.delete(pf.storageId); } catch {}
      await ctx.db.delete(pf._id);
    }

    const checklists = await ctx.db
      .query('checklists')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    
    for (const checklist of checklists) {
      const cItems = await ctx.db
        .query('checklistItems')
        .withIndex('by_checklist', (q) => q.eq('checklistId', checklist._id))
        .collect();
      for (const ci of cItems) await ctx.db.delete(ci._id);
      // checklists themselves are deleted in the next step
    }

    // 5. Delete other project-level tables
    const projectTables = [
      'projectRooms', 'boqItems', 'expenses', 'messages',
      'budgetCategories', 'activityFeed', 'timelineBars', 
      'priceQuotes', 'projectInvitations', 'checklists'
    ] as const;

    for (const table of projectTables) {
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

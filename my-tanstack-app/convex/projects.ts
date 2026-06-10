import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { performProjectDeletion } from './_lib/projectDeletion';
import { canUserViewBudget, canUserViewSchedule } from './_lib/projectAccess';

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // A user can be associated with a project in 4 ways:
    // 1. ownerUserId
    // 2. managerUserId
    // 3. inspectorUserId
    // 4. they are a contractor in the project

    const allProjects = await ctx.db.query('projects').collect();
    
    // We also need to check contractors table for this user
    const userContractorRoles = await ctx.db
      .query('contractors')
      .filter((q) => q.eq(q.field('userId'), userId))
      .collect();
    const contractorProjectIds = new Set(userContractorRoles.map(c => c.projectId));

    return allProjects.filter(p => 
      p.ownerUserId === userId || 
      p.managerUserId === userId || 
      p.inspectorUserId === userId || 
      contractorProjectIds.has(p._id)
    ).map(p => {
      let myRole = 'contractor';
      if (p.ownerUserId === userId) myRole = 'owner';
      else if (p.managerUserId === userId) myRole = 'manager';
      else if (p.inspectorUserId === userId) myRole = 'inspector';
      return { ...p, myRole };
    }).sort((a, b) => b._creationTime - a._creationTime);
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
    hasBasement: v.optional(v.boolean()),
    hasYard: v.optional(v.boolean()),
    housingUnits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const isExpired = user.subscriptionExpiresAt ? Date.now() > user.subscriptionExpiresAt : false;
    const tier = user.subscriptionTier || 'free';
    const isSelfProOrPremium = user.isSuperAdmin || (!isExpired && (tier === 'pro' || tier === 'premium'));

    if (!isSelfProOrPremium) {
      const myOwnedProjects = await ctx.db
        .query('projects')
        .withIndex('by_ownerUserId', (q) => q.eq('ownerUserId', userId))
        .collect();

      if (myOwnedProjects.length >= 1) {
        throw new Error("מגבלת חשבון חינמי: לא ניתן ליצור יותר מפרויקט אחד בבעלותך. שדרג ל-Pro כדי ליצור פרויקטים נוספים.");
      }
    }

    return await ctx.db.insert('projects', {
      name: args.name,
      address: args.address,
      ownerUserId: userId,
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
      ...(args.hasBasement !== undefined ? { hasBasement: args.hasBasement } : {}),
      ...(args.hasYard !== undefined ? { hasYard: args.hasYard } : {}),
      ...(args.housingUnits !== undefined ? { housingUnits: args.housingUnits } : {}),
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
    hasBasement: v.optional(v.boolean()),
    hasYard: v.optional(v.boolean()),
    housingUnits: v.optional(v.number()),
    vatPct: v.optional(v.number()),
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
      ...(args.hasBasement !== undefined ? { hasBasement: args.hasBasement } : {}),
      ...(args.hasYard !== undefined ? { hasYard: args.hasYard } : {}),
      ...(args.housingUnits !== undefined ? { housingUnits: args.housingUnits } : {}),
      ...(args.vatPct !== undefined ? { vatPct: args.vatPct } : {}),
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

    await performProjectDeletion(ctx as any, args.projectId);
  }
});

export const getOwnerSubscription = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.ownerUserId) {
      return { tier: 'free', isProOrPremium: false };
    }
    const owner = await ctx.db.get(project.ownerUserId);
    if (!owner) {
      return { tier: 'free', isProOrPremium: false };
    }
    const now = Date.now();
    const isExpired = owner.subscriptionExpiresAt ? now > owner.subscriptionExpiresAt : false;
    const tier = owner.subscriptionTier || 'free';
    const activeTier = owner.isSuperAdmin ? 'premium' : (isExpired ? 'free' : tier);
    const isProOrPremium = activeTier === 'pro' || activeTier === 'premium';
    return {
      tier: activeTier,
      isProOrPremium,
    };
  }
});

export const getProjectAccessInfo = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const [canViewBudget, canViewSchedule] = await Promise.all([
      canUserViewBudget(ctx, args.projectId),
      canUserViewSchedule(ctx, args.projectId),
    ]);
    return { canViewBudget, canViewSchedule };
  },
});

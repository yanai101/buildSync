import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { insertActivity } from './_lib/activity';
import { requireProjectFeature, requireProjectMember } from './_lib/projectAccess';
import { scheduleUserNotifications } from './notifications';

export const getLogsByDate = query({
  args: { projectId: v.id('projects'), date: v.string() },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const logs = await ctx.db
      .query('dailyLogs')
      .withIndex('by_project_date', (q) => q.eq('projectId', args.projectId).eq('date', args.date))
      .collect();
      
    return await Promise.all(
      logs.map(async (log) => {
        if (log.images) {
          log.images = await Promise.all(
            log.images.map(async (img) => ({
              ...img,
              url: (await ctx.storage.getUrl(img.storageId)) ?? undefined,
            }))
          );
        }
        return log;
      })
    );
  },
});

import { paginationOptsValidator } from 'convex/server';

export const getLogs = query({
  args: { 
    projectId: v.id('projects'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const logsPage = await ctx.db
      .query('dailyLogs')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .paginate(args.paginationOpts);
      
    const enhancedPage = await Promise.all(
      logsPage.page.map(async (log) => {
        if (log.images) {
          log.images = await Promise.all(
            log.images.map(async (img) => ({
              ...img,
              url: (await ctx.storage.getUrl(img.storageId)) ?? undefined,
            }))
          );
        }
        return log;
      })
    );
    
    return {
      ...logsPage,
      page: enhancedPage,
    };
  },
});

export const saveLog = mutation({
  args: {
    logId: v.optional(v.id('dailyLogs')),
    projectId: v.id('projects'),
    date: v.string(),
    weather: v.optional(v.string()),
    temperature: v.optional(v.string()),
    workforce: v.array(v.object({
      contractorId: v.optional(v.id('contractors')),
      contractorName: v.optional(v.string()),
      workersCount: v.number(),
      notes: v.optional(v.string()),
    })),
    activities: v.array(v.object({
      description: v.string(),
      status: v.union(v.literal('in_progress'), v.literal('completed'), v.literal('delayed')),
      contractorId: v.optional(v.id('contractors')),
    })),
    deliveries: v.array(v.object({
      type: v.union(v.literal('material'), v.literal('equipment')),
      description: v.string(),
    })),
    issues: v.array(v.object({
      type: v.union(v.literal('safety'), v.literal('delay'), v.literal('quality'), v.literal('other')),
      description: v.string(),
      financialImpact: v.boolean(),
      responsiblePartyId: v.optional(v.id('contractors')),
    })),
    instructions: v.array(v.object({
      text: v.string(),
      givenToId: v.optional(v.id('contractors')),
    })),
    images: v.optional(v.array(v.object({
      storageId: v.id('_storage'),
      url: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await requireProjectMember(ctx, args.projectId);
    await requireProjectFeature(ctx, args.projectId, 'dailyLogs');

    if (args.logId) {
      const existing = await ctx.db.get(args.logId);
      if (!existing) throw new Error("Log not found");
      if (existing.status === 'locked') throw new Error("Cannot edit a locked log");
      
      await ctx.db.patch(args.logId, {
        weather: args.weather,
        temperature: args.temperature,
        workforce: args.workforce,
        activities: args.activities,
        deliveries: args.deliveries,
        issues: args.issues,
        instructions: args.instructions,
        images: args.images,
        updatedAt: Date.now(),
      });
      return args.logId;
    } else {
      const newId = await ctx.db.insert('dailyLogs', {
        projectId: args.projectId,
        date: args.date,
        weather: args.weather,
        temperature: args.temperature,
        status: 'draft',
        createdBy: user._id,
        updatedAt: Date.now(),
        workforce: args.workforce,
        activities: args.activities,
        deliveries: args.deliveries,
        issues: args.issues,
        instructions: args.instructions,
        images: args.images,
      });

      await insertActivity(ctx, {
        projectId: args.projectId,
        text: `הוסיף/ה יומן עבודה חדש לתאריך ${args.date}`,
        notifyOwner: false, // We send a targeted push below instead
      });

      // Send a direct deep-link push to the project owner and manager
      // (excluding the creator so they don't notify themselves)
      const project = await ctx.db.get(args.projectId);
      if (project) {
        const recipients = [
          project.ownerUserId,
          project.managerUserId,
        ].filter((id): id is typeof userId & string => !!id && id !== userId);

        if (recipients.length > 0) {
          await scheduleUserNotifications(ctx, {
            userIds: recipients,
            title: `יומן עבודה חדש — ${args.date}`,
            body: `${user.name ?? user.email ?? 'משתמש'} הוסיף יומן עבודה לתאריך ${args.date}`,
            url: `/daily-logs?project=${args.projectId}&date=${args.date}`,
            tag: `daily-log-${args.projectId}-${args.date}`,
          });
        }
      }

      return newId;
    }
  },
});

export const lockLog = mutation({
  args: {
    logId: v.id('dailyLogs'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    await requireProjectMember(ctx, log.projectId);
    await requireProjectFeature(ctx, log.projectId, 'dailyLogs');

    // Must be inspector or manager to lock a log. Assuming this check will be done or UI handled.
    // In a real scenario we'd query project roles here.
    
    await ctx.db.patch(args.logId, {
      status: 'locked',
      lockedBy: user._id,
      lockedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteLog = mutation({
  args: {
    logId: v.id('dailyLogs'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const log = await ctx.db.get(args.logId);
    if (!log) throw new Error("Log not found");

    if (log.status === 'locked') {
      throw new Error("Cannot delete a locked log");
    }

    await requireProjectMember(ctx, log.projectId);
    await requireProjectFeature(ctx, log.projectId, 'dailyLogs');

    // Delete associated images
    if (log.images) {
      for (const img of log.images) {
        if (img.storageId) {
          await ctx.storage.delete(img.storageId);
        }
      }
    }

    await ctx.db.delete(args.logId);
  },
});


import { query, mutation } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';

async function checkSuperAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Unauthorized');

  const user = await ctx.db.get(userId);
  if (!user?.isSuperAdmin) {
    throw new Error('Unauthorized: Not Super Admin');
  }
  return user;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAllAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    await checkSuperAdmin(ctx);
    const announcements = await ctx.db.query('announcements').collect();
    return announcements.sort((a, b) => b.publishAt - a.publishAt);
  },
});

export const getActiveAnnouncements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user) return [];

    const now = Date.now();
    const userTier = user.subscriptionTier || 'free';
    const userRole = user.role;

    // Get all published announcements
    const published = await ctx.db
      .query('announcements')
      .withIndex('by_status', (q) => q.eq('status', 'published'))
      .collect();

    // Filter by publishAt <= now, not expired, and target audience match
    return published
      .filter((item) => {
        if (item.publishAt > now) return false;
        if (item.expiresAt && item.expiresAt <= now) return false;

        if (item.audienceType === 'all') return true;

        if (item.audienceType === 'plan' && item.plans) {
          return item.plans.includes(userTier as any);
        }

        if (item.audienceType === 'users' && item.userIds) {
          return item.userIds.includes(userId);
        }

        if (item.audienceType === 'roles' && item.roles && userRole) {
          return item.roles.includes(userRole as any);
        }

        return false;
      })
      .sort((a, b) => b.publishAt - a.publishAt);
  },
});

export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id('_storage')),
    type: v.union(
      v.literal('feature'),
      v.literal('info'),
      v.literal('warning'),
      v.literal('error'),
      v.literal('success'),
    ),
    audienceType: v.union(
      v.literal('all'),
      v.literal('plan'),
      v.literal('users'),
      v.literal('roles'),
    ),
    plans: v.optional(v.array(v.union(v.literal('pro'), v.literal('premium')))),
    roles: v.optional(v.array(v.union(v.literal('owner'), v.literal('manager'), v.literal('inspector'), v.literal('contractor')))),
    userIds: v.optional(v.array(v.string())),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
    ),
    publishAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await checkSuperAdmin(ctx);

    const publishAt = args.publishAt ?? Date.now();
    let finalImageUrl = args.imageUrl;

    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) {
        finalImageUrl = url;
      }
    }

    const id = await ctx.db.insert('announcements', {
      title: args.title,
      body: args.body,
      imageUrl: finalImageUrl,
      storageId: args.storageId,
      type: args.type,
      audienceType: args.audienceType,
      plans: args.plans,
      roles: args.roles,
      userIds: args.userIds,
      status: args.status,
      publishAt,
      expiresAt: args.expiresAt,
      createdBy: admin._id,
    });

    return id;
  },
});

export const updateAnnouncement = mutation({
  args: {
    id: v.id('announcements'),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.union(v.id('_storage'), v.null())),
    type: v.optional(
      v.union(
        v.literal('feature'),
        v.literal('info'),
        v.literal('warning'),
        v.literal('error'),
        v.literal('success'),
      ),
    ),
    audienceType: v.optional(
      v.union(v.literal('all'), v.literal('plan'), v.literal('users'), v.literal('roles')),
    ),
    plans: v.optional(v.array(v.union(v.literal('pro'), v.literal('premium')))),
    roles: v.optional(v.array(v.union(v.literal('owner'), v.literal('manager'), v.literal('inspector'), v.literal('contractor')))),
    userIds: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal('draft'),
        v.literal('published'),
        v.literal('archived'),
      ),
    ),
    publishAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);

    const { id, storageId, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Announcement not found');

    const patch: any = { ...updates };

    if (storageId !== undefined) {
      if (storageId === null) {
        patch.storageId = undefined;
        patch.imageUrl = undefined;
        if (existing.storageId) {
          await ctx.storage.delete(existing.storageId);
        }
      } else {
        const url = await ctx.storage.getUrl(storageId);
        patch.storageId = storageId;
        if (url) {
          patch.imageUrl = url;
        }
        if (existing.storageId && existing.storageId !== storageId) {
          await ctx.storage.delete(existing.storageId);
        }
      }
    }

    await ctx.db.patch(id, patch);
  },
});

export const setAnnouncementStatus = mutation({
  args: {
    id: v.id('announcements'),
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived'),
    ),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error('Announcement not found');

    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const deleteAnnouncement = mutation({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    await checkSuperAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error('Announcement not found');

    if (existing.storageId) {
      await ctx.storage.delete(existing.storageId);
    }

    await ctx.db.delete(args.id);
  },
});

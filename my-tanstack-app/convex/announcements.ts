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
    ),
    plans: v.optional(v.array(v.union(v.literal('pro'), v.literal('premium')))),
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

    const id = await ctx.db.insert('announcements', {
      title: args.title,
      body: args.body,
      imageUrl: args.imageUrl,
      type: args.type,
      audienceType: args.audienceType,
      plans: args.plans,
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
      v.union(v.literal('all'), v.literal('plan'), v.literal('users')),
    ),
    plans: v.optional(v.array(v.union(v.literal('pro'), v.literal('premium')))),
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

    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Announcement not found');

    const patch: any = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        patch[key] = val;
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

    await ctx.db.delete(args.id);
  },
});

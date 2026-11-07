/**
 * Manual-debugging helpers.
 *
 * Every export here is `internalQuery` / `internalMutation` ON PURPOSE:
 * internal functions are NOT reachable from a browser or any client SDK, but
 * they ARE runnable from the Convex dashboard and from the CLI, which is what
 * manual testing actually uses:
 *
 *   npx convex run debug:whoAmI '{}'
 *   npx convex run debug:listUsers '{}'
 *   npx convex run debug:listUsers '{"email":"someone@example.com"}'
 *
 * These replace four modules that did the same thing as PUBLIC functions and
 * were live in production: debugQuery.ts, testUser.ts, testUsers.ts (which
 * returned the entire users table to any unauthenticated caller) and fix.ts.
 * Never widen anything in this file to `query` or `mutation`.
 */
import { v } from 'convex/values';
import { internalQuery } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

/** Replaces debugQuery.test — the caller's identity plus project ownership. */
export const whoAmI = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get(userId) : null;
    const projects = await ctx.db.query('projects').collect();
    return {
      userId,
      userRole: user?.role ?? null,
      isSuperAdmin: user?.isSuperAdmin ?? false,
      projects: projects.map((p) => ({ id: p._id, name: p.name, ownerUserId: p.ownerUserId })),
    };
  },
});

/**
 * Replaces testUsers.default (all users) and testUser.default (a hardcoded
 * email). Pass `email` to filter, omit it to list everyone.
 */
export const listUsers = internalQuery({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, { email }) => {
    const users = email
      ? await ctx.db.query('users').filter((q) => q.eq(q.field('email'), email)).collect()
      : await ctx.db.query('users').collect();
    return users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isSuperAdmin: u.isSuperAdmin ?? false,
      isSuspended: u.isSuspended ?? false,
      subscriptionTier: u.subscriptionTier,
    }));
  },
});

import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import type { Id } from './_generated/dataModel';

/**
 * One-time cleanup for accounts that were split across providers before
 * `convex/auth.ts` gained its email-linking `createOrUpdateUser` callback.
 *
 * Convex Auth creates one `users` row per identity the first time it's seen.
 * Before the callback existed, a person who signed up with email+password
 * and later signed in with Google (same address) ended up as two unrelated
 * `users` docs — each with its own role and its own project associations
 * (`inspectorUserId`, `ownerUserId`, etc. are per-project fields, not a
 * shared membership table — see convex/projects.ts `listMine`). Whichever
 * project pointed at the "other" account looked, from that account's side,
 * like the person had no projects at all.
 *
 * This mutation merges `removeUserId` into `keepUserId`:
 *  - moves every authAccounts row (each provider) onto keepUserId,
 *  - drops removeUserId's sessions/refresh tokens (forces a clean re-login),
 *  - repoints every domain-table `...UserId` field from removeUserId to
 *    keepUserId,
 *  - fills in keepUserId's missing profile fields (name/phone/image/role)
 *    from removeUserId, without overwriting anything keepUserId already has,
 *  - deletes the now-empty removeUserId user document.
 *
 * Not exposed to the client. Run from the CLI against the target
 * deployment, e.g.:
 *   npx convex run accountMerge:mergeDuplicateUsers \
 *     '{"keepUserId":"<id>","removeUserId":"<id>"}' --prod
 *
 * Safety: requires both accounts to share the same normalized email, and
 * refuses to run if that doesn't hold — this is a merge tool, not a
 * generic account-transplant tool.
 */
export const mergeDuplicateUsers = internalMutation({
  args: {
    keepUserId: v.id('users'),
    removeUserId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const { keepUserId, removeUserId } = args;
    if (keepUserId === removeUserId) {
      throw new Error('keepUserId and removeUserId must differ');
    }

    const keep = await ctx.db.get(keepUserId);
    const remove = await ctx.db.get(removeUserId);
    if (!keep) throw new Error(`keepUserId ${keepUserId} not found`);
    if (!remove) throw new Error(`removeUserId ${removeUserId} not found`);

    const normEmail = (e: string | undefined) => e?.trim().toLowerCase();
    if (
      !normEmail(keep.email) ||
      normEmail(keep.email) !== normEmail(remove.email)
    ) {
      throw new Error(
        `Refusing to merge: emails differ or are missing (keep=${keep.email ?? 'none'}, remove=${remove.email ?? 'none'})`,
      );
    }

    const summary: Record<string, number> = {};

    // 1. Move every auth provider account onto the kept user.
    const authAccounts = await (ctx.db.query('authAccounts') as any)
      .withIndex('userIdAndProvider', (q: any) => q.eq('userId', removeUserId))
      .collect();
    for (const acc of authAccounts) {
      await ctx.db.patch(acc._id, { userId: keepUserId });
    }
    summary.authAccounts = authAccounts.length;

    // 2. Drop the removed user's sessions/refresh tokens so nothing is left
    // pointing at a soon-to-be-deleted user document. They'll simply sign
    // in again (via either provider, both now on the kept account).
    const sessions = await (ctx.db.query('authSessions') as any)
      .withIndex('userId', (q: any) => q.eq('userId', removeUserId))
      .collect();
    for (const s of sessions) {
      const refreshTokens = await (ctx.db.query('authRefreshTokens') as any)
        .withIndex('sessionId', (q: any) => q.eq('sessionId', s._id))
        .collect();
      for (const rt of refreshTokens) await ctx.db.delete(rt._id);
      await ctx.db.delete(s._id);
    }
    summary.authSessions = sessions.length;

    // 3. Repoint domain-table references. Tables with a userId index use
    // it; the rest (no such index exists) are scanned in full — this is a
    // one-time admin operation on a small table, not a hot path.
    const patchField = async (
      table: string,
      field: string,
      indexName?: string,
    ) => {
      const query = indexName
        ? (ctx.db.query(table as any) as any).withIndex(indexName, (q: any) =>
            q.eq(field, removeUserId),
          )
        : ctx.db.query(table as any);
      const rows = await query.collect();
      let n = 0;
      for (const row of rows) {
        if ((row as any)[field] === removeUserId) {
          await ctx.db.patch(row._id, { [field]: keepUserId });
          n++;
        }
      }
      summary[`${table}.${field}`] = n;
    };

    await patchField('projects', 'ownerUserId', 'by_ownerUserId');
    await patchField('projects', 'managerUserId');
    await patchField('projects', 'inspectorUserId');
    await patchField('contractors', 'userId');
    await patchField('photos', 'uploaderUserId');
    await patchField('projectFiles', 'uploaderUserId');
    await patchField('projectInvitations', 'invitedByUserId');
    await patchField('projectInvitations', 'consumedByUserId');
    await patchField('personalFiles', 'ownerUserId', 'by_owner');
    await patchField('messages', 'fromUserId');
    await patchField('messages', 'recipientUserId');
    await patchField('activityFeed', 'actorUserId');
    await patchField('promoRedemptions', 'userId', 'by_user');
    await patchField('supportTickets', 'userId', 'by_user');
    await patchField('pushSubscriptions', 'userId', 'by_user');
    await patchField('subscriptionEvents', 'userId', 'by_user');

    // 4. Fill in any profile fields the kept user is missing — never
    // overwrite something it already has (mirrors the gentle-patch policy
    // in convex/auth.ts).
    const profilePatch: Record<string, unknown> = {};
    const fillIfMissing = <K extends keyof typeof keep>(field: K) => {
      if (keep[field] === undefined && remove[field] !== undefined) {
        profilePatch[field as string] = remove[field];
      }
    };
    fillIfMissing('name');
    fillIfMissing('phone');
    fillIfMissing('image');
    fillIfMissing('role');
    fillIfMissing('avatarLetter');
    fillIfMissing('avatarColor');
    if (Object.keys(profilePatch).length > 0) {
      await ctx.db.patch(keepUserId, profilePatch);
    }
    summary.profileFieldsFilled = Object.keys(profilePatch).length;

    // 5. Remove the now-empty duplicate user document.
    await ctx.db.delete(removeUserId);

    return { keepUserId, removeUserId, summary };
  },
});

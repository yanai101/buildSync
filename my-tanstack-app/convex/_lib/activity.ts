import { MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';

export async function insertActivity(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>;
    text: string;
    role?: 'owner' | 'manager' | 'inspector' | 'contractor';
  },
) {
  const userId = await getAuthUserId(ctx);
  let actorName = 'מערכת';
  let role: 'owner' | 'manager' | 'inspector' | 'contractor' = args.role ?? 'owner';

  if (userId) {
    const user = await ctx.db.get(userId);
    if (user) {
      actorName = user.name || user.email || actorName;
      role = (user.role as any) || role;
    }
  }

  return await ctx.db.insert('activityFeed', {
    projectId: args.projectId,
    actorUserId: userId ?? undefined,
    actorName,
    role,
    text: args.text,
    createdAt: Date.now(),
  });
}

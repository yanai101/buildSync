import { MutationCtx } from '../_generated/server';
import { Id } from '../_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { scheduleUserNotifications } from '../notifications';

export async function insertActivity(
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>;
    text: string;
    role?: 'owner' | 'manager' | 'inspector' | 'contractor';
    // Set to false for noisy/system events that shouldn't push-notify the owner.
    notifyOwner?: boolean;
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

  const now = Date.now();
  const project = await ctx.db.get(args.projectId);
  await ctx.db.patch(args.projectId, { lastActivityAt: now });

  const activityId = await ctx.db.insert('activityFeed', {
    projectId: args.projectId,
    actorUserId: userId ?? undefined,
    actorName,
    role,
    text: args.text,
    createdAt: now,
  });

  // Notify the project owner about the latest activity, unless they're the
  // one who triggered it (or the caller opted out for noisy events).
  if (args.notifyOwner !== false && project?.ownerUserId && project.ownerUserId !== userId) {
    await scheduleUserNotifications(ctx, {
      userIds: [project.ownerUserId],
      title: `פעולה חדשה בפרויקט ${project.name ?? ''}`.trim(),
      body: `${actorName}: ${args.text}`,
      url: `/dashboard?project=${args.projectId}`,
    });
  }

  return activityId;
}

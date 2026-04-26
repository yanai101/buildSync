import { getAuthUserId } from '@convex-dev/auth/server';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type Ctx = QueryCtx | MutationCtx;

export const requireProjectFileUser = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const [user, project] = await Promise.all([
    ctx.db.get(userId),
    ctx.db.get(projectId),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  const isProjectMember =
    project.ownerUserId === userId ||
    project.managerUserId === userId ||
    project.inspectorUserId === userId;
  const hasProjectTeamRole =
    user?.role === 'owner' ||
    user?.role === 'manager' ||
    user?.role === 'inspector';

  if (!isProjectMember && !hasProjectTeamRole) {
    throw new Error('Only project team members can upload files');
  }

  return { userId, user, project };
};

export const requireProjectFileManager = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const { userId, user, project } = await requireProjectFileUser(ctx, projectId);
  const isProjectManager = project.ownerUserId === userId || project.managerUserId === userId;
  const hasManagerRole = user?.role === 'owner' || user?.role === 'manager';

  if (!isProjectManager && !hasManagerRole) {
    throw new Error('Only an owner or manager can manage project files');
  }

  return { userId, user, project };
};

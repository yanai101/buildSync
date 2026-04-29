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

  const contractorRecord = await ctx.db
    .query('contractors')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('userId'), userId))
    .first();

  const isProjectMember =
    project.ownerUserId === userId ||
    project.managerUserId === userId ||
    project.inspectorUserId === userId ||
    contractorRecord !== null;

  const hasProjectTeamRole =
    user?.role === 'owner' ||
    user?.role === 'manager' ||
    user?.role === 'inspector' ||
    user?.role === 'contractor';

  if (!isProjectMember && !hasProjectTeamRole) {
    throw new Error('Only project team members can access files');
  }

  return { userId, user, project, isContractor: contractorRecord !== null };
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

export const requireProjectOwner = async (ctx: Ctx, projectId: Id<'projects'>) => {
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

  if (project.ownerUserId !== userId) {
    throw new Error('Only the project owner can perform this action');
  }

  return { userId, user, project };
};

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

  if (!isProjectMember && !hasProjectTeamRole && !user?.isSuperAdmin) {
    throw new Error('Only project team members can access files');
  }

  return { userId, user, project, isContractor: contractorRecord !== null };
};

export const requireProjectFileManager = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const { userId, user, project } = await requireProjectFileUser(ctx, projectId);
  const isProjectManager = project.ownerUserId === userId || project.managerUserId === userId;
  const hasManagerRole = user?.role === 'owner' || user?.role === 'manager';

  if (!isProjectManager && !hasManagerRole && !user?.isSuperAdmin) {
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

  if (project.ownerUserId !== userId && !user?.isSuperAdmin) {
    throw new Error('Only the project owner can perform this action');
  }

  return { userId, user, project };
};

export const canUserViewBudget = async (ctx: Ctx, projectId: Id<'projects'>): Promise<boolean> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  const [user, project] = await Promise.all([
    ctx.db.get(userId),
    ctx.db.get(projectId),
  ]);

  if (!project) {
    return false;
  }

  // 1. Owner and SuperAdmin always have full budget view
  if (project.ownerUserId === userId || user?.isSuperAdmin) {
    return true;
  }

  // 2. Project Manager
  if (project.managerUserId === userId) {
    return project.managerCanViewBudget !== false;
  }

  // 3. Project Inspector
  if (project.inspectorUserId === userId) {
    return project.inspectorCanViewBudget !== false;
  }

  // 4. Contractor (look for a contractor record linked to this userId)
  const contractorRecord = await ctx.db
    .query('contractors')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('userId'), userId))
    .first();

  if (contractorRecord) {
    return contractorRecord.canViewBudget === true;
  }

  return false;
};

export const requireProjectBudgetView = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const allowed = await canUserViewBudget(ctx, projectId);
  if (!allowed) {
    throw new Error('אין לך הרשאה לצפות בנתוני התקציב של פרויקט זה');
  }
};

export const canUserViewSchedule = async (ctx: Ctx, projectId: Id<'projects'>): Promise<boolean> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return false;
  }

  const [user, project] = await Promise.all([
    ctx.db.get(userId),
    ctx.db.get(projectId),
  ]);

  if (!project) {
    return false;
  }

  // 1. Owner and SuperAdmin always have full schedule view
  if (project.ownerUserId === userId || user?.isSuperAdmin) {
    return true;
  }

  // 2. Project Manager (default true, but can be set to false)
  if (project.managerUserId === userId) {
    return project.managerCanViewSchedule !== false;
  }

  // 3. Project Inspector (default true, but can be set to false)
  if (project.inspectorUserId === userId) {
    return project.inspectorCanViewSchedule !== false;
  }

  // 4. Contractor (default true if not explicitly set to false!)
  const contractorRecord = await ctx.db
    .query('contractors')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .filter((q) => q.eq(q.field('userId'), userId))
    .first();

  if (contractorRecord) {
    return contractorRecord.canViewSchedule !== false;
  }

  return false;
};

export const requireProjectScheduleView = async (ctx: Ctx, projectId: Id<'projects'>) => {
  const allowed = await canUserViewSchedule(ctx, projectId);
  if (!allowed) {
    throw new Error('אין לך הרשאה לצפות בלוח הזמנים של פרויקט זה');
  }
};



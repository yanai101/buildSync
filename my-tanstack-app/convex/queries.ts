import { query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

const formatMessageDate = (creationTime: number) => {
  const date = new Date(creationTime);
  return {
    date: date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
    time: date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
  };
};

export const listStages = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);

    const normalized = await Promise.all(stages.map(async (stage) => {
      const tasks = await ctx.db
        .query('stageTasks')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .take(100);

      const sortedTasks = tasks.sort((a, b) => a.sortOrder - b.sortOrder);
      const taskUiIdByDbId = new Map(sortedTasks.map((task, index) => [
        task._id,
        task.legacyId ?? index + 1,
      ]));

      const milestones = await ctx.db
        .query('stageMilestones')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .take(50);

      const paymentMilestones = await Promise.all(
        milestones
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (milestone) => {
            const taskLinks = await ctx.db
              .query('stageMilestoneTasks')
              .withIndex('by_milestone', (q) => q.eq('milestoneId', milestone._id))
              .take(100);

            return {
              ...milestone,
              id: milestone._id,
              taskIds: taskLinks
                .map((link) => taskUiIdByDbId.get(link.taskId))
                .filter((id): id is number => id !== undefined),
              supervisorApproval: milestone.supervisorApprovalBy && milestone.supervisorApprovalAt
                ? { by: milestone.supervisorApprovalBy, at: milestone.supervisorApprovalAt }
                : null,
              paidAt: milestone.paidAt ?? null,
            };
          }),
      );

      return {
        ...stage,
        id: stage.legacyId ?? stage.sortOrder + 1,
        status: stage.status,
        progress: stage.progressPct,
        start: stage.startDate,
        end: stage.endDate,
        contractor: stage.contractorRole ?? '',
        icon: stage.icon ?? '',
        tasks: sortedTasks.map((task, index) => ({
          ...task,
          id: task.legacyId ?? index + 1,
        })),
        supervisorApproval: stage.supervisorApprovalBy && stage.supervisorApprovalAt
          ? { by: stage.supervisorApprovalBy, at: stage.supervisorApprovalAt }
          : null,
        payment: {
          ...stage.payment,
          paidAt: stage.payment.paidAt ?? null,
          milestones: paymentMilestones.length ? paymentMilestones : undefined,
        },
      };
    }));

    return normalized.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const listRooms = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listBoq = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('boqItems')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listPhotos = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);

    return await Promise.all(photos.map(async (photo) => {
      const notes = await ctx.db
        .query('photoNotes')
        .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
        .take(100);
      const projectFile = photo.projectFileId
        ? await ctx.db.get(photo.projectFileId)
        : null;
      const latestVersion = await ctx.db
        .query('photoFileVersions')
        .withIndex('by_photo_versionNumber', (q) => q.eq('photoId', photo._id))
        .order('desc')
        .take(1);
      const latestVersionFile = latestVersion[0]
        ? await ctx.db.get(latestVersion[0].annotatedProjectFileId)
        : null;
      const storageUrl = projectFile
        ? await ctx.storage.getUrl(projectFile.storageId)
        : null;
      const latestVersionUrl = latestVersionFile
        ? await ctx.storage.getUrl(latestVersionFile.storageId)
        : null;
      const displayFile = photo.tag === 'אישור' ? projectFile : (latestVersionFile ?? projectFile);

      return {
        ...photo,
        id: photo._id,
        stage: photo.stageLabel,
        date: photo.takenOn,
        originalFileUrl: storageUrl ?? photo.fileUrl,
        fileUrl: photo.tag === 'אישור'
          ? storageUrl ?? photo.fileUrl
          : latestVersionUrl ?? storageUrl ?? photo.fileUrl,
        versionNumber: photo.tag === 'אישור' ? 0 : latestVersion[0]?.versionNumber ?? 0,
        latestVersionId: photo.tag === 'אישור' ? null : latestVersion[0]?._id ?? null,
        file: displayFile
          ? {
            id: displayFile._id,
            originalName: displayFile.originalName,
            storedName: displayFile.storedName,
            originalSize: displayFile.originalSize,
            storedSize: displayFile.storedSize,
            storedMimeType: displayFile.storedMimeType,
            width: displayFile.width,
            height: displayFile.height,
          }
          : null,
        notesCount: notes.length,
      };
    }));
  },
});

export const listNotes = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user?.role) {
      return [];
    }

    const thread =
      user.role === 'owner'
        ? null
        : user.role === 'contractor'
          ? 'contractor'
          : 'internal';

    const notes = thread
      ? await ctx.db
        .query('messages')
        .withIndex('by_project_thread', (q) => q.eq('projectId', args.projectId).eq('thread', thread))
        .take(200)
      : await ctx.db
        .query('messages')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .take(200);

    return notes.map(n => ({
      ...n,
      id: n._id,
      ...formatMessageDate(n._creationTime),
    }));
  },
});

export const listExpenses = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('expenses')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const listContractors = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const contractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);

    return await Promise.all(contractors.map(async (contractor) => {
      const milestones = await ctx.db
        .query('contractorPaymentMilestones')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
        .take(100);

      return {
        ...contractor,
        id: contractor._id,
        avatar: contractor.avatarLetter ?? contractor.name[0] ?? '',
        color: contractor.avatarColor ?? '#E07A38',
        company: contractor.company ?? '',
        phone: contractor.phone ?? '',
        email: contractor.email ?? '',
        milestones: milestones
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((milestone) => ({
            ...milestone,
            id: milestone._id,
            taskIds: [],
            status: milestone.paid ? 'paid' : 'pending',
            paidAt: milestone.paidAt ?? null,
          })),
      };
    }));
  },
});

export const listBudgetCategories = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('budgetCategories')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});
export const getProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

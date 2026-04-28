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
    const projectContractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);
    const contractorById = new Map(projectContractors.map((contractor) => [String(contractor._id), contractor]));

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

      const contractorLinks = await ctx.db
        .query('stageContractors')
        .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
        .take(100);
      let stageContractors = contractorLinks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((link) => contractorById.get(String(link.contractorId)))
        .filter((contractor): contractor is (typeof projectContractors)[number] => Boolean(contractor));

      if (stageContractors.length === 0) {
        const legacyContractor =
          (stage.contractorId ? contractorById.get(String(stage.contractorId)) : null) ??
          projectContractors.find((contractor) => contractor.name === stage.contractorRole) ??
          projectContractors.find((contractor) => contractor.role === stage.contractorRole);
        if (legacyContractor) {
          stageContractors = [legacyContractor];
        }
      }

      const contractorRefs = stageContractors.map((contractor) => ({
        id: contractor._id,
        _id: contractor._id,
        name: contractor.name,
        role: contractor.role,
        company: contractor.company ?? '',
        avatar: contractor.avatarLetter ?? contractor.name[0] ?? '',
        color: contractor.avatarColor ?? '#E07A38',
        paymentMode: contractorLinks.find((link) => link.contractorId === contractor._id)?.paymentMode ?? 'stage_synced',
      }));
      const syncedContractorPayments = await Promise.all(
        contractorLinks
          .filter((link) => (link.paymentMode ?? 'stage_synced') === 'stage_synced')
          .map(async (link) => {
            const contractor = contractorById.get(String(link.contractorId));
            const contractorMilestones = await ctx.db
              .query('contractorPaymentMilestones')
              .withIndex('by_contractor', (q) => q.eq('contractorId', link.contractorId))
              .take(200);
            return {
              contractorId: link.contractorId,
              contractorName: contractor?.name ?? '',
              milestones: contractorMilestones
                .filter((milestone) => milestone.sourceMode === 'stage_synced' && milestone.sourceStageId === stage._id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((milestone) => ({
                  ...milestone,
                  id: milestone._id,
                  taskIds: [],
                  status: milestone.paid ? 'paid' : 'pending',
                  paidAt: milestone.paidAt ?? null,
                })),
            };
          }),
      );

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
        contractor: contractorRefs.map((contractor) => contractor.name).join(', ') || (stage.contractorRole ?? ''),
        contractorIds: contractorRefs.map((contractor) => contractor._id),
        contractors: contractorRefs,
        hasSyncedContractorPayments: syncedContractorPayments.length > 0,
        contractorPayments: syncedContractorPayments,
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
    const items = await ctx.db
      .query('boqItems')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    return await Promise.all(items.map(async (item) => {
      let resolvedImageUrl: string | null = null;
      if (item.projectFileId) {
        const projectFile = await ctx.db.get(item.projectFileId);
        if (projectFile) {
          resolvedImageUrl = await ctx.storage.getUrl(projectFile.storageId);
        }
      } else if (item.imageUrl && !item.imageUrl.startsWith('blob:')) {
        // Keep non-blob URLs (e.g. http/https) as-is
        resolvedImageUrl = item.imageUrl;
      }
      return { ...item, imageUrl: resolvedImageUrl ?? undefined };
    }));
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
    const projectStages = await ctx.db
      .query('stages')
      .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
      .take(200);
    const stageById = new Map(projectStages.map((stage) => [String(stage._id), stage]));

    return await Promise.all(contractors.map(async (contractor) => {
      const milestones = await ctx.db
        .query('contractorPaymentMilestones')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
        .take(100);
      const stageLinks = await ctx.db
        .query('stageContractors')
        .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
        .take(200);
      const stageLinkByStageId = new Map(stageLinks.map((link) => [String(link.stageId), link]));
      const linkedStages = stageLinks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((link) => stageById.get(String(link.stageId)))
        .filter((stage): stage is (typeof projectStages)[number] => Boolean(stage));
      const linkedStageIds = new Set(linkedStages.map((stage) => String(stage._id)));
      for (const stage of projectStages) {
        if (linkedStageIds.has(String(stage._id))) continue;
        if (
          stage.contractorId === contractor._id ||
          stage.contractorRole === contractor.name ||
          stage.contractorRole === contractor.role
        ) {
          linkedStages.push(stage);
          linkedStageIds.add(String(stage._id));
        }
      }
      const sortedLinkedStages = linkedStages.sort((a, b) => a.sortOrder - b.sortOrder);
      const stageProgressPct = sortedLinkedStages.length
        ? Math.round(sortedLinkedStages.reduce((sum, stage) => sum + stage.progressPct, 0) / sortedLinkedStages.length)
        : 0;
      const linkedPaymentModes = stageLinks.map((link) => link.paymentMode ?? 'stage_synced');
      const paymentMode = linkedPaymentModes.length === 0
        ? 'custom'
        : linkedPaymentModes.some((mode) => mode === 'stage_synced')
          ? 'stage_synced'
          : 'custom';

      return {
        ...contractor,
        id: contractor._id,
        avatar: contractor.avatarLetter ?? contractor.name[0] ?? '',
        color: contractor.avatarColor ?? '#E07A38',
        company: contractor.company ?? '',
        phone: contractor.phone ?? '',
        email: contractor.email ?? '',
        paymentMode,
        stageProgressPct,
        stages: sortedLinkedStages.map((stage) => ({
          id: stage._id,
          stageId: stage._id,
          name: stage.name,
          status: stage.status,
          progressPct: stage.progressPct,
          startDate: stage.startDate,
          endDate: stage.endDate,
          sortOrder: stage.sortOrder,
          paymentMode: stageLinkByStageId.get(String(stage._id))?.paymentMode ?? 'stage_synced',
        })),
        milestones: milestones
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((milestone) => ({
            ...milestone,
            id: milestone._id,
            taskIds: [],
            status: milestone.paid ? 'paid' : 'pending',
            paidAt: milestone.paidAt ?? null,
            sourceMode: milestone.sourceMode ?? 'custom',
            sourceStageId: milestone.sourceStageId,
            sourceStageMilestoneId: milestone.sourceStageMilestoneId,
            sourceTaskId: milestone.sourceTaskId,
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

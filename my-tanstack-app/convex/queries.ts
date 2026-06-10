import { query } from './_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import type { Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { getSyncedPaymentReadiness } from './_lib/contractorPaymentSync';
import { requireProjectScheduleView } from './_lib/projectAccess';

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
    await requireProjectScheduleView(ctx, args.projectId);
    const stages = await ctx.db
      .query('stages')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);
    const projectContractors = await ctx.db
      .query('contractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(200);
    const contractorById = new Map(projectContractors.map((contractor) => [String(contractor._id), contractor]));
    const allStageContractorLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(1000);
    const directLinksByStageId = new Map<string, typeof allStageContractorLinks>();
    for (const link of allStageContractorLinks) {
      if ((link.paymentMode ?? 'stage_synced') === 'stage_synced') continue;
      const key = String(link.stageId);
      const current = directLinksByStageId.get(key) ?? [];
      current.push(link);
      directLinksByStageId.set(key, current);
    }
    const stageById = new Map(stages.map((stage) => [String(stage._id), stage]));
    const contractorStagePaymentTotalById = new Map<string, number>();
    for (const [stageId, links] of directLinksByStageId) {
      if (links.length !== 1) continue;
      const stage = stageById.get(stageId);
      if (!stage) continue;
      const contractorId = String(links[0].contractorId);
      contractorStagePaymentTotalById.set(
        contractorId,
        (contractorStagePaymentTotalById.get(contractorId) ?? 0) + (stage.payment.amount || 0),
      );
    }
    const contractorStagePaymentWarningById = new Map<string, {
      contractorId: string;
      contractorName: string;
      stagePaymentTotal: number;
      contractorBudget: number;
      reason: string;
    }>();
    for (const contractor of projectContractors) {
      const stagePaymentTotal = contractorStagePaymentTotalById.get(String(contractor._id));
      if (stagePaymentTotal === undefined) continue;
      if (Math.round(stagePaymentTotal) === Math.round(contractor.budget)) continue;
      contractorStagePaymentWarningById.set(String(contractor._id), {
        contractorId: String(contractor._id),
        contractorName: contractor.name,
        stagePaymentTotal,
        contractorBudget: contractor.budget,
        reason: `סכום השלבים של ${contractor.name} (${stagePaymentTotal.toLocaleString('he-IL')} ₪) לא תואם לסכום החוזה (${contractor.budget.toLocaleString('he-IL')} ₪)`,
      });
    }

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
        budget: contractor.budget,
        paid: contractor.paid,
        avatar: contractor.avatarLetter ?? contractor.name[0] ?? '',
        color: contractor.avatarColor ?? '#E07A38',
        paymentMode: contractorLinks.find((link) => link.contractorId === contractor._id)?.paymentMode ?? 'stage_synced',
      }));
      const directPaymentContractors = contractorRefs.filter((contractor) => contractor.paymentMode !== 'stage_synced');
      const linkedContractorBudgetTotal = directPaymentContractors.reduce(
        (sum, contractor) => sum + (contractor.budget ?? 0),
        0,
      );
      const paymentAmountMismatch =
        directPaymentContractors.length > 0 &&
        Math.round(stage.payment.amount || 0) !== Math.round(linkedContractorBudgetTotal);
      const paymentMismatchReason = paymentAmountMismatch
        ? `סכום השלב ${stage.payment.amount.toLocaleString('he-IL')} ₪ לא תואם לסכום החוזה של הקבלנים ${linkedContractorBudgetTotal.toLocaleString('he-IL')} ₪`
        : null;
      const contractorPaymentWarnings = directPaymentContractors
        .map((contractor) => contractorStagePaymentWarningById.get(String(contractor._id)))
        .filter((warning): warning is NonNullable<typeof warning> => Boolean(warning));
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
              milestones: await Promise.all(contractorMilestones
                .filter((milestone) => milestone.sourceMode === 'stage_synced' && milestone.sourceStageId === stage._id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map(async (milestone) => {
                  const readiness = await getSyncedPaymentReadiness(ctx, milestone);
                  return {
                    ...milestone,
                    id: milestone._id,
                    taskIds: [],
                    status: milestone.paid ? 'paid' : 'pending',
                    paidAt: milestone.paidAt ?? null,
                    readyToPay: readiness.ready,
                    lockedReason: readiness.reason,
                  };
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
        linkedContractorBudgetTotal,
        paymentAmountMismatch,
        paymentMismatchReason,
        contractorPaymentWarnings,
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
  args: {
    projectId: v.id('projects'),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .paginate(args.paginationOpts);

    const photos = result.page;

    // 1. Batch-fetch all photo notes counts
    const notesPerPhoto = new Map<string, number>();
    await Promise.all(
      photos.map(async (photo) => {
        const notes = await ctx.db
          .query('photoNotes')
          .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
          .take(100);
        notesPerPhoto.set(String(photo._id), notes.length);
      }),
    );

    // 2. Batch-fetch all projectFiles referenced by photos
    const projectFileIds = [
      ...new Set(photos.map((p) => p.projectFileId).filter(Boolean)),
    ] as Id<'projectFiles'>[];
    const projectFileDocs = (await Promise.all(projectFileIds.map((id) => ctx.db.get(id)))).filter(
      (f): f is NonNullable<Awaited<ReturnType<typeof ctx.db.get<'projectFiles'>>>> => f !== null && 'storageId' in f,
    );
    const projectFileById = new Map(projectFileDocs.map((f) => [String(f._id), f]));

    // 3. Batch-fetch latest photo versions
    const latestVersionsByPhoto = new Map<string, any>();
    await Promise.all(
      photos.map(async (photo) => {
        const versions = await ctx.db
          .query('photoFileVersions')
          .withIndex('by_photo_versionNumber', (q) => q.eq('photoId', photo._id))
          .order('desc')
          .take(1);
        if (versions[0]) latestVersionsByPhoto.set(String(photo._id), versions[0]);
      }),
    );

    // 4. Batch-fetch annotated project files from latest versions
    const annotatedFileIds = [
      ...new Set(
        [...latestVersionsByPhoto.values()]
          .map((v) => v.annotatedProjectFileId)
          .filter(Boolean),
      ),
    ] as Id<'projectFiles'>[];
    const annotatedFileDocs = (await Promise.all(annotatedFileIds.map((id) => ctx.db.get(id)))).filter(
      (f): f is NonNullable<Awaited<ReturnType<typeof ctx.db.get<'projectFiles'>>>> => f !== null && 'storageId' in f,
    );
    const annotatedFileById = new Map(annotatedFileDocs.map((f) => [String(f._id), f]));

    // 5. Batch-fetch all unique storage URLs in one pass
    const allStorageIds = new Set<string>();
    for (const f of [...projectFileDocs, ...annotatedFileDocs]) {
      if (f?.storageId) allStorageIds.add(String(f.storageId));
    }
    const storageUrlById = new Map<string, string | null>();
    await Promise.all(
      [...allStorageIds].map(async (storageId) => {
        const url = await ctx.storage.getUrl(storageId as any);
        storageUrlById.set(storageId, url);
      }),
    );

    const page = photos.map((photo) => {
      const projectFile = photo.projectFileId
        ? projectFileById.get(String(photo.projectFileId)) ?? null
        : null;
      const latestVersion = latestVersionsByPhoto.get(String(photo._id)) ?? null;
      const latestVersionFile = latestVersion
        ? annotatedFileById.get(String(latestVersion.annotatedProjectFileId)) ?? null
        : null;

      const storageUrl = projectFile
        ? storageUrlById.get(String(projectFile.storageId)) ?? null
        : null;
      const latestVersionUrl = latestVersionFile
        ? storageUrlById.get(String(latestVersionFile.storageId)) ?? null
        : null;
      const displayFile = photo.tag === 'אישור' ? projectFile : (latestVersionFile ?? projectFile);

      return {
        ...photo,
        id: photo._id,
        stage: photo.stageLabel,
        date: photo.takenOn,
        originalFileUrl: storageUrl ?? photo.fileUrl,
        fileUrl:
          photo.tag === 'אישור'
            ? storageUrl ?? photo.fileUrl
            : latestVersionUrl ?? storageUrl ?? photo.fileUrl,
        versionNumber: photo.tag === 'אישור' ? 0 : latestVersion?.versionNumber ?? 0,
        latestVersionId: photo.tag === 'אישור' ? null : latestVersion?._id ?? null,
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
        notesCount: notesPerPhoto.get(String(photo._id)) ?? 0,
      };
    });

    return { ...result, page };
  },
});

/** Lightweight count query — used by the UI to show "50 of 120" */
export const getPhotosCount = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query('photos')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
    return photos.length;
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

    const showAll = user.role === 'owner' || user.role === 'manager' || user.role === 'inspector';

    const notes = showAll
      ? await ctx.db
        .query('messages')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .take(200)
      : await ctx.db
        .query('messages')
        .withIndex('by_project_thread', (q) => q.eq('projectId', args.projectId).eq('thread', 'contractor'))
        .take(200);

    let filteredNotes = notes;
    let contractor: any = null;

    if (showAll) {
      // Internal users see: the shared "Team" broadcast, their own 1:1 DMs
      // (sent or received), and all contractor-thread messages.
      filteredNotes = notes.filter((n) => {
        if (n.thread === 'contractor') return true;
        // thread === 'internal'
        if (n.recipientUserId === undefined) return true; // Team broadcast
        return n.fromUserId === userId || n.recipientUserId === userId;
      });
    } else {
      contractor = await ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .filter((q) => q.eq(q.field('userId'), userId))
        .first();

      filteredNotes = notes.filter((n) => {
        if (n.fromUserId === userId) return true;
        if (!contractor) return false;
        return n.recipientContractorId === undefined || n.recipientContractorId === contractor._id;
      });
    }

    // Build a userId -> name lookup from the project's internal slots so we
    // can label directed DMs without a query per message.
    const project = await ctx.db.get(args.projectId);
    const userNameById = new Map<string, string>();
    if (project) {
      if (project.ownerUserId) userNameById.set(String(project.ownerUserId), project.ownerName ?? 'בעל הבית');
      if (project.managerUserId) userNameById.set(String(project.managerUserId), project.managerName ?? 'בעל בנייה');
      if (project.inspectorUserId) userNameById.set(String(project.inspectorUserId), project.inspectorName ?? 'מפקח');
    }

    const resultNotes = [];
    for (const n of filteredNotes) {
      let recipientName = undefined;
      if (n.recipientContractorId) {
        const rc = await ctx.db.get(n.recipientContractorId);
        recipientName = rc?.name;
      }
      let recipientUserName = undefined;
      if (n.recipientUserId) {
        recipientUserName = userNameById.get(String(n.recipientUserId));
        if (!recipientUserName) {
          const ru = await ctx.db.get(n.recipientUserId);
          recipientUserName = ru?.name ?? ru?.email;
        }
      }
      resultNotes.push({
        ...n,
        id: n._id,
        recipientName,
        recipientUserName,
        ...formatMessageDate(n._creationTime),
      });
    }

    return resultNotes;
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
    const allStageContractorLinks = await ctx.db
      .query('stageContractors')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .take(1000);
    const directLinksByStageId = new Map<string, typeof allStageContractorLinks>();
    for (const link of allStageContractorLinks) {
      if ((link.paymentMode ?? 'stage_synced') === 'stage_synced') continue;
      const key = String(link.stageId);
      const current = directLinksByStageId.get(key) ?? [];
      current.push(link);
      directLinksByStageId.set(key, current);
    }

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
      const stagePaymentTotal = sortedLinkedStages.reduce((sum, stage) => {
        const directLinks = directLinksByStageId.get(String(stage._id)) ?? [];
        const isOnlyDirectContractor =
          directLinks.length === 1 &&
          directLinks[0].contractorId === contractor._id;
        return isOnlyDirectContractor ? sum + (stage.payment.amount || 0) : sum;
      }, 0);
      const hasDirectStagePayment = sortedLinkedStages.some((stage) => {
        const directLinks = directLinksByStageId.get(String(stage._id)) ?? [];
        return directLinks.length === 1 && directLinks[0].contractorId === contractor._id;
      });
      const stagePaymentMismatch =
        hasDirectStagePayment &&
        Math.round(stagePaymentTotal) !== Math.round(contractor.budget);
      const stagePaymentMismatchReason = stagePaymentMismatch
        ? `סכום השלבים המשויכים לקבלן (${stagePaymentTotal.toLocaleString('he-IL')} ₪) לא תואם לסכום החוזה (${contractor.budget.toLocaleString('he-IL')} ₪)`
        : null;

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
        stagePaymentTotal,
        stagePaymentMismatch,
        stagePaymentMismatchReason,
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
        milestones: await Promise.all(milestones
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(async (milestone) => {
            const readiness = await getSyncedPaymentReadiness(ctx, milestone);
            const files = milestone.fileIds ? await Promise.all(milestone.fileIds.map(async (fileId) => {
              const file = await ctx.db.get(fileId);
              if (!file) return null;
              const url = await ctx.storage.getUrl(file.storageId);
              return url ? { id: file._id, url, name: file.originalName } : null;
            })) : [];
            return {
              ...milestone,
              id: milestone._id,
              taskIds: [],
              status: milestone.paid ? 'paid' : 'pending',
              paidAt: milestone.paidAt ?? null,
              sourceMode: milestone.sourceMode ?? 'custom',
              sourceStageId: milestone.sourceStageId,
              sourceStageMilestoneId: milestone.sourceStageMilestoneId,
              sourceTaskId: milestone.sourceTaskId,
              readyToPay: readiness.ready,
              lockedReason: readiness.reason,
              files: files.filter((f): f is NonNullable<typeof f> => f !== null),
            };
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

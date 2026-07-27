import { query } from './_generated/server';
import { v } from 'convex/values';
import { requireProjectFeature, requireProjectOwner } from './_lib/projectAccess';

/**
 * Aggregates ALL project data into a single export manifest.
 * Returns structured JSON + signed storage URLs for every file.
 * Only the project owner with an active paid subscription may call this.
 */
export const generateExportManifest = query({
  args: {
    projectId: v.id('projects'),
    sections: v.object({
      dailyLogs: v.boolean(),
      photos: v.boolean(),
      stages: v.boolean(),
      contractors: v.boolean(),
      documents: v.boolean(),
      permits: v.boolean(),
      budget: v.boolean(),
      boq: v.boolean(),
      orders: v.boolean(),
      checklists: v.boolean(),
      timeline: v.boolean(),
      activityFeed: v.boolean(),
      priceQuotes: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const { project, userId, user } = await requireProjectOwner(ctx, args.projectId);

    // Exports are intentionally stricter than the shared owner helper: a
    // super-admin may support a project, but must not download its contents.
    if (project.ownerUserId !== userId || (user?.role && user.role !== 'owner')) {
      throw new Error('Only the project owner can export this project');
    }
    await requireProjectFeature(ctx, args.projectId, 'projectExport');

    const projectId = args.projectId;

    // ── Project & rooms (always included) ───────────────────────────────────
    const rooms = await ctx.db
      .query('projectRooms')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect();

    // ── Stages ──────────────────────────────────────────────────────────────
    let stagesData: any[] = [];
    if (args.sections.stages) {
      const stages = await ctx.db
        .query('stages')
        .withIndex('by_project_sort', (q) => q.eq('projectId', projectId))
        .collect();

      stagesData = await Promise.all(
        stages.map(async (stage) => {
          const [tasks, milestones, stageContractors] = await Promise.all([
            ctx.db
              .query('stageTasks')
              .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
              .collect(),
            ctx.db
              .query('stageMilestones')
              .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
              .collect(),
            ctx.db
              .query('stageContractors')
              .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
              .collect(),
          ]);
          return { ...stage, tasks, milestones, stageContractors };
        }),
      );
    }

    // ── Contractors & payment milestones ────────────────────────────────────
    let contractorsData: any[] = [];
    if (args.sections.contractors) {
      const contractors = await ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();

      contractorsData = await Promise.all(
        contractors.map(async (contractor) => {
          const [paymentMilestones, notes, files] = await Promise.all([
            ctx.db
              .query('contractorPaymentMilestones')
              .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
              .collect(),
            ctx.db
              .query('contractorNotes')
              .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
              .collect(),
            ctx.db
              .query('projectFiles')
              .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
              .collect(),
          ]);

          const filesWithUrls = await Promise.all(
            files.map(async (f) => ({
              ...f,
              url: await ctx.storage.getUrl(f.storageId),
            })),
          );

          return { ...contractor, paymentMilestones, notes, files: filesWithUrls };
        }),
      );
    }

    // ── Daily logs ──────────────────────────────────────────────────────────
    let dailyLogsData: any[] = [];
    if (args.sections.dailyLogs) {
      const logs = await ctx.db
        .query('dailyLogs')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .order('desc')
        .collect();

      dailyLogsData = await Promise.all(
        logs.map(async (log) => {
          const imagesWithUrls = log.images
            ? await Promise.all(
                log.images.map(async (img: any) => ({
                  ...img,
                  url: await ctx.storage.getUrl(img.storageId),
                })),
              )
            : [];
          return { ...log, images: imagesWithUrls };
        }),
      );
    }

    // ── Photos ──────────────────────────────────────────────────────────────
    let photosData: any[] = [];
    if (args.sections.photos) {
      const photos = await ctx.db
        .query('photos')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();

      photosData = await Promise.all(
        photos.map(async (photo) => {
          const [versions, notes] = await Promise.all([
            ctx.db
              .query('photoFileVersions')
              .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
              .order('asc')
              .collect(),
            ctx.db
              .query('photoNotes')
              .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
              .collect(),
          ]);

          // Get the original source file URL
          let originalUrl: string | null = null;
          let originalFileName: string | null = null;
          if (photo.projectFileId) {
            const sourceFile = await ctx.db.get(photo.projectFileId as any);
            if (sourceFile) {
              originalUrl = await ctx.storage.getUrl((sourceFile as any).storageId);
              originalFileName = (sourceFile as any).originalName ?? null;
            }
          }

          const versionsWithUrls = await Promise.all(
            versions.map(async (v) => {
              const annotatedFile = await ctx.db.get(v.annotatedProjectFileId);
              return {
                ...v,
                url: annotatedFile
                  ? await ctx.storage.getUrl((annotatedFile as any).storageId)
                  : null,
                fileName: annotatedFile ? (annotatedFile as any).originalName ?? null : null,
              };
            }),
          );

          return {
            ...photo,
            originalUrl,
            originalFileName,
            versions: versionsWithUrls,
            notes,
          };
        }),
      );
    }

    // ── Project archive (files saved in /personal-files) ────────────────────
    // The UI keeps the historical `documents` section key, but its contents
    // are deliberately project-scoped personal archive files — not a second
    // copy of photos, daily-log attachments, or quote files.
    let personalFilesData: any[] = [];
    if (args.sections.documents) {
      const personalFiles = await ctx.db
        .query('personalFiles')
        .withIndex('by_owner_and_project', (q) =>
          q.eq('ownerUserId', userId).eq('projectId', projectId),
        )
        .collect();

      personalFilesData = await Promise.all(
        personalFiles.map(async (f) => ({
          ...f,
          url: await ctx.storage.getUrl(f.storageId),
        })),
      );
    }

    // ── Permits ─────────────────────────────────────────────────────────────
    let permitsData: any[] = [];
    if (args.sections.permits) {
      const permits = await ctx.db
        .query('permits')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();

      permitsData = await Promise.all(
        permits.map(async (p) => ({
          ...p,
          url: p.fileId ? await ctx.storage.getUrl(p.fileId) : null,
        })),
      );
    }

    // ── Budget & expenses ────────────────────────────────────────────────────
    let budgetData: any = null;
    if (args.sections.budget) {
      const [categories, expenses] = await Promise.all([
        ctx.db
          .query('budgetCategories')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect(),
        ctx.db
          .query('expenses')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect(),
      ]);

      budgetData = { categories, expenses };
    }

    // ── BOQ ─────────────────────────────────────────────────────────────────
    let boqData: any[] = [];
    if (args.sections.boq) {
      boqData = await ctx.db
        .query('boqItems')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    }

    // ── Orders ──────────────────────────────────────────────────────────────
    let ordersData: any[] = [];
    if (args.sections.orders) {
      const orders = await ctx.db
        .query('orders')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
      ordersData = await Promise.all(
        orders.map(async (order) => ({
          ...order,
          deliveryDocuments: await Promise.all(
            (order.deliveryDocuments ?? []).map(async (document) => ({
              ...document,
              url: await ctx.storage.getUrl(document.storageId),
            })),
          ),
        })),
      );
    }

    // ── Checklists ──────────────────────────────────────────────────────────
    let checklistsData: any[] = [];
    if (args.sections.checklists) {
      const lists = await ctx.db
        .query('checklists')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();

      checklistsData = await Promise.all(
        lists.map(async (list) => {
          const items = await ctx.db
            .query('checklistItems')
            .withIndex('by_checklist', (q) => q.eq('checklistId', list._id))
            .collect();
          return { ...list, items };
        }),
      );
    }

    // ── Timeline ─────────────────────────────────────────────────────────────
    let timelineData: any[] = [];
    if (args.sections.timeline) {
      timelineData = await ctx.db
        .query('timelineBars')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .collect();
    }

    // ── Activity feed ────────────────────────────────────────────────────────
    let activityData: any[] = [];
    if (args.sections.activityFeed) {
      activityData = await ctx.db
        .query('activityFeed')
        .withIndex('by_project', (q) => q.eq('projectId', projectId))
        .order('desc')
        .collect();
    }

    // ── Price quotes ─────────────────────────────────────────────────────────
    let priceQuotesData: any[] = [];
    if (args.sections.priceQuotes) {
      const [quotes, topics] = await Promise.all([
        ctx.db
          .query('priceQuotes')
          .withIndex('by_project', (q) => q.eq('projectId', projectId))
          .collect(),
        ctx.db.query('quoteTopics').collect(),
      ]);
      const topicNameByKey = new Map(
        topics
          .filter((topic) => topic.isBuiltin || topic.projectId === projectId)
          .map((topic) => [topic.key, topic.name]),
      );

      priceQuotesData = await Promise.all(
        quotes.map(async (quote) => {
          const file = quote.projectFileId ? await ctx.db.get(quote.projectFileId) : null;
          return {
            ...quote,
            topicName: topicNameByKey.get(quote.topicKey) ?? quote.topicKey,
            fileUrl: file ? await ctx.storage.getUrl(file.storageId) : quote.fileUrl ?? null,
          };
        }),
      );
    }

    return {
      exportedAt: new Date().toISOString(),
      project: { ...project, rooms },
      stages: stagesData,
      contractors: contractorsData,
      dailyLogs: dailyLogsData,
      photos: photosData,
      personalFiles: personalFilesData,
      permits: permitsData,
      budget: budgetData,
      boq: boqData,
      orders: ordersData,
      checklists: checklistsData,
      timeline: timelineData,
      activityFeed: activityData,
      priceQuotes: priceQuotesData,
    };
  },
});

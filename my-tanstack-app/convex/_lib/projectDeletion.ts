import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { deleteRoomArchiveForProject } from './roomArchiveCleanup';

export async function performProjectDeletion(ctx: MutationCtx, projectId: Id<'projects'>) {
  // 1. Delete stages and their descendants
  const stages = await ctx.db
    .query('stages')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  
  for (const stage of stages) {
    const milestones = await ctx.db
      .query('stageMilestones')
      .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
      .collect();
    for (const m of milestones) {
      const links = await ctx.db
        .query('stageMilestoneTasks')
        .withIndex('by_milestone', (q) => q.eq('milestoneId', m._id))
        .collect();
      for (const l of links) await ctx.db.delete(l._id);
      await ctx.db.delete(m._id);
    }

    const tasks = await ctx.db
      .query('stageTasks')
      .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
      .collect();
    for (const t of tasks) await ctx.db.delete(t._id);

    const stageContractors = await ctx.db
      .query('stageContractors')
      .withIndex('by_stage', (q) => q.eq('stageId', stage._id))
      .collect();
    for (const sc of stageContractors) await ctx.db.delete(sc._id);

    await ctx.db.delete(stage._id);
  }

  // 2. Delete contractors and their descendants
  const contractors = await ctx.db
    .query('contractors')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  
  for (const contractor of contractors) {
    const cmilestones = await ctx.db
      .query('contractorPaymentMilestones')
      .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
      .collect();
    for (const m of cmilestones) await ctx.db.delete(m._id);

    const cnotes = await ctx.db
      .query('contractorNotes')
      .withIndex('by_contractor', (q) => q.eq('contractorId', contractor._id))
      .collect();
    for (const n of cnotes) await ctx.db.delete(n._id);

    await ctx.db.delete(contractor._id);
  }

  // 3. Delete photos and their descendants
  const photos = await ctx.db
    .query('photos')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  
  for (const photo of photos) {
    const pnotes = await ctx.db
      .query('photoNotes')
      .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
      .collect();
    for (const n of pnotes) await ctx.db.delete(n._id);

    const pannotations = await ctx.db
      .query('photoAnnotations')
      .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
      .collect();
    for (const a of pannotations) await ctx.db.delete(a._id);

    const versions = await ctx.db
      .query('photoFileVersions')
      .withIndex('by_photo', (q) => q.eq('photoId', photo._id))
      .collect();
    for (const v of versions) {
      await ctx.db.delete(v._id);
    }
    await ctx.db.delete(photo._id);
  }

  // 4. Delete project files and storage
  const projectFiles = await ctx.db
    .query('projectFiles')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  
  for (const pf of projectFiles) {
    try { await ctx.storage.delete(pf.storageId); } catch {}
    await ctx.db.delete(pf._id);
  }

  const checklists = await ctx.db
    .query('checklists')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();
  
  for (const checklist of checklists) {
    const cItems = await ctx.db
      .query('checklistItems')
      .withIndex('by_checklist', (q) => q.eq('checklistId', checklist._id))
      .collect();
    for (const ci of cItems) await ctx.db.delete(ci._id);
  }

  // 5a. Premium room photo archive (photos + storage + permissions)
  await deleteRoomArchiveForProject(ctx, projectId);

  // 5b. The owner's personal file locker for this project, plus its blobs.
  // Queried with a filter, not an index: personalFiles has by_owner,
  // by_owner_and_project and by_storage but NO by_project. That is exactly why
  // it could not simply be added to the generic list below — the index lookup
  // would throw and the old `catch (e) {}` would have swallowed it, cleaning
  // nothing and reporting nothing.
  const personalFiles = await ctx.db
    .query('personalFiles')
    .filter((q) => q.eq(q.field('projectId'), projectId))
    .collect();

  for (const file of personalFiles) {
    try { await ctx.storage.delete(file.storageId); } catch {}
    await ctx.db.delete(file._id);
  }

  // 5c. Uploaded plans, plus their blobs.
  const plans = await ctx.db
    .query('projectPlans')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect();

  for (const plan of plans) {
    if (plan.storageId) {
      try { await ctx.storage.delete(plan.storageId); } catch {}
    }
    await ctx.db.delete(plan._id);
  }

  // 5d. AI quote cache. Only a compound index exists; a prefix lookup is fine.
  const aiCache = await ctx.db
    .query('aiQuoteCache')
    .withIndex('by_project_topic', (q) => q.eq('projectId', projectId))
    .collect();
  for (const row of aiCache) await ctx.db.delete(row._id);

  // 5. Delete other project-level tables
  //
  // DELIBERATELY ABSENT: aiUsageLogs. It is the monthly AI quota counter
  // (convex/aiQuotes.ts reads it by userId + feature + at), so deleting it with
  // a project would let a user reset their AI allowance by deleting a project.
  // It is keyed on userId as much as projectId and must outlive the project.
  const projectTables = [
    'projectRooms', 'boqItems', 'expenses', 'messages',
    'budgetCategories', 'activityFeed', 'timelineBars',
    'priceQuotes', 'projectInvitations', 'checklists',
    'permits', 'dailyLogs', 'projectAlerts',
    'fundingSources', 'fundingTransactions', 'mortgageDraws', 'orders',
    'quickNotes', 'quoteExtractions',
  ] as const;

  for (const table of projectTables) {
    // No try/catch. It used to swallow every error here, which meant a table
    // missing a by_project index would be skipped in total silence — the exact
    // failure mode that left six tables behind. A broken cascade must be loud.
    const records = await ctx.db
      .query(table as any)
      .withIndex('by_project', (q: any) => q.eq('projectId', projectId))
      .collect();
    for (const rec of records) {
      await ctx.db.delete(rec._id);
    }
  }

  await ctx.db.delete(projectId);
}

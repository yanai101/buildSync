import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

const DAY_MS = 24 * 60 * 60 * 1000;

const dateOnly = (value: string) => value.slice(0, 10);

const parseDate = (value: string) => {
  const [year, month, day] = dateOnly(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

export const assertStageDateRange = (startDate: string, endDate: string) => {
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Invalid stage dates');
  }
  if (end < start) {
    throw new Error('Stage end date cannot be before start date');
  }
};

const diffDays = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS);

const addDays = (value: string, days: number) => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
};

export const patchStageDatesWithCascade = async (
  ctx: MutationCtx,
  args: {
    projectId: Id<'projects'>;
    stage: Doc<'stages'>;
    startDate: string;
    endDate: string;
    patch?: Partial<Doc<'stages'>>;
  },
) => {
  assertStageDateRange(args.startDate, args.endDate);

  const endDeltaDays = diffDays(args.stage.endDate, args.endDate);
  await ctx.db.patch(args.stage._id, {
    ...args.patch,
    startDate: args.startDate,
    endDate: args.endDate,
  });

  const shiftedStages: Array<{
    stageId: Id<'stages'>;
    startDate: string;
    endDate: string;
  }> = [{
    stageId: args.stage._id,
    startDate: args.startDate,
    endDate: args.endDate,
  }];

  if (endDeltaDays === 0) {
    return shiftedStages;
  }

  const stages = await ctx.db
    .query('stages')
    .withIndex('by_project_sort', (q) => q.eq('projectId', args.projectId))
    .take(200);
  const orderedStages = stages.sort((a, b) => a.sortOrder - b.sortOrder);
  const editedIndex = orderedStages.findIndex((stage) => stage._id === args.stage._id);
  if (editedIndex < 0) return shiftedStages;

  for (let index = editedIndex + 1; index < orderedStages.length; index++) {
    const stage = orderedStages[index];
    if (!stage.dependsOnPrevious) break;

    const nextStartDate = addDays(stage.startDate, endDeltaDays);
    const nextEndDate = addDays(stage.endDate, endDeltaDays);
    await ctx.db.patch(stage._id, {
      startDate: nextStartDate,
      endDate: nextEndDate,
    });
    shiftedStages.push({
      stageId: stage._id,
      startDate: nextStartDate,
      endDate: nextEndDate,
    });
  }

  return shiftedStages;
};

import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireProjectFileManager } from './_lib/projectAccess';
import { insertActivity } from './_lib/activity';
import { patchStageDatesWithCascade } from './_lib/stageSchedule';

export const updateStageDates = mutation({
  args: {
    projectId: v.id('projects'),
    stageId: v.id('stages'),
    startDate: v.string(),
    endDate: v.string(),
    dependsOnPrevious: v.optional(v.boolean()),
    cascade: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireProjectFileManager(ctx, args.projectId);

    const stage = await ctx.db.get(args.stageId);
    if (!stage || stage.projectId !== args.projectId) {
      throw new Error('Stage not found in this project');
    }

    let updatedStages: any[] = [];
    if (args.cascade === false) {
      await ctx.db.patch(stage._id, {
        startDate: args.startDate,
        endDate: args.endDate,
        ...(args.dependsOnPrevious !== undefined ? { dependsOnPrevious: args.dependsOnPrevious } : {})
      });
    } else {
      updatedStages = await patchStageDatesWithCascade(ctx, {
        projectId: args.projectId,
        stage,
        startDate: args.startDate,
        endDate: args.endDate,
        patch: args.dependsOnPrevious !== undefined ? { dependsOnPrevious: args.dependsOnPrevious } : undefined,
      });
    }

    await insertActivity(ctx, {
      projectId: args.projectId,
      text: `עודכן לוח הזמנים עבור שלב: ${stage.name}`,
    });

    return {
      stageId: args.stageId,
      startDate: args.startDate,
      endDate: args.endDate,
      updatedStages,
    };
  },
});

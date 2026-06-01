import { mutation } from "./_generated/server";

export const fixCorruptedNames = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Fix Stages
    const stages = await ctx.db.query("stages").collect();
    for (const stage of stages) {
      if (stage.name.includes(" - ")) {
        const cleanName = stage.name.split(" - ")[0].trim();
        await ctx.db.patch(stage._id, { name: cleanName });
      }
    }

    // 2. Fix Stage Tasks
    const tasks = await ctx.db.query("stageTasks").collect();
    for (const task of tasks) {
      let cleanName = task.name;
      while (cleanName.includes("סיום משימה:")) {
        cleanName = cleanName.replace("סיום משימה:", "").trim();
      }
      if (cleanName.includes(" - ")) {
        cleanName = cleanName.split(" - ")[0].trim();
      }
      if (cleanName !== task.name) {
        await ctx.db.patch(task._id, { name: cleanName });
      }
    }

    // 3. Fix Contractor Milestones
    const milestones = await ctx.db.query("contractorPaymentMilestones").collect();
    for (const m of milestones) {
      let changed = false;
      let cleanName = m.name;
      let cleanTrigger = m.triggerText || "";

      if (cleanName.includes(" - ")) {
        cleanName = cleanName.split(" - ")[0].trim();
        changed = true;
      }
      
      while (cleanTrigger.includes("סיום משימה:")) {
        cleanTrigger = cleanTrigger.replace("סיום משימה:", "").trim();
        changed = true;
      }
      if (cleanTrigger.includes(" - ")) {
        cleanTrigger = cleanTrigger.split(" - ")[0].trim();
        changed = true;
      }

      if (changed) {
        await ctx.db.patch(m._id, { name: cleanName, triggerText: cleanTrigger });
      }
    }

    return "Fixed!";
  }
});

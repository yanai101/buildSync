import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const test = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const projects = await ctx.db.query("projects").collect();
    const user = userId ? await ctx.db.get(userId) : null;
    return { userId, userRole: user?.role, projects: projects.map(p => ({ id: p._id, ownerUserId: p.ownerUserId })) };
  }
});

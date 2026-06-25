import { query } from "./_generated/server";
export default query(async (ctx) => {
  const users = await ctx.db.query("users").filter(q => q.eq(q.field("email"), "doraa@mail.com")).collect();
  return users;
});

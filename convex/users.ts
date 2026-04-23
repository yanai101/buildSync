import { mutation, query } from './_generated/server'

import {
  findUserByIdentity,
  requireAuthUser,
  upsertUserFromIdentity,
} from './lib/access'

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthUser(ctx)

    return await findUserByIdentity(ctx, identity)
  },
})

export const upsertMe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthUser(ctx)
    return await upsertUserFromIdentity(ctx, identity)
  },
})

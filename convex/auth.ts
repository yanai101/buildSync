import { query } from './_generated/server'

import { requireAuthUser } from './lib/access'

export const getSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthUser(ctx)
    return {
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email ?? null,
      name: identity.name ?? null,
    }
  },
})

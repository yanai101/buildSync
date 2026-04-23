import { ConvexError } from 'convex/values'

import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

type Ctx = QueryCtx | MutationCtx
type Identity = Awaited<ReturnType<Ctx['auth']['getUserIdentity']>>

const DEV_FALLBACK_USER_ID = 'dev-local-user'

export async function requireAuthUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity()
  if (identity) {
    return identity
  }

  // Dev fallback until Better Auth is wired to Convex auth provider.
  const runtimeEnv =
    (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
  if (runtimeEnv?.NODE_ENV !== 'production') {
    return {
      tokenIdentifier: DEV_FALLBACK_USER_ID,
      subject: DEV_FALLBACK_USER_ID,
      issuer: 'dev',
      name: 'Dev User',
      email: 'dev@buildflow.local',
      emailVerified: true,
    }
  }

  throw new ConvexError('UNAUTHORIZED')
}

export async function findUserByIdentity(ctx: Ctx, identity: NonNullable<Identity>) {
  const byToken = await ctx.db
    .query('users')
    .withIndex('by_auth_token', (q) =>
      q.eq('authTokenIdentifier', identity.tokenIdentifier),
    )
    .first()

  if (byToken) {
    return byToken
  }

  const email = identity.email ?? ''
  if (!email) {
    return null
  }

  return await ctx.db
    .query('users')
    .withIndex('by_email', (q) => q.eq('email', email))
    .first()
}

export async function upsertUserFromIdentity(
  ctx: Ctx,
  identity: NonNullable<Identity>,
): Promise<Doc<'users'>> {
  const existing = await findUserByIdentity(ctx, identity)
  const email = identity.email ?? ''
  const name = identity.name ?? undefined

  if (existing) {
    if (
      'patch' in ctx.db &&
      (existing.authTokenIdentifier !== identity.tokenIdentifier ||
        existing.email !== email ||
        existing.name !== name)
    ) {
      await ctx.db.patch(existing._id, {
        authTokenIdentifier: identity.tokenIdentifier,
        email,
        name,
      })
      return {
        ...existing,
        authTokenIdentifier: identity.tokenIdentifier,
        email,
        name,
      }
    }

    return existing
  }

  if (!('insert' in ctx.db)) {
    throw new ConvexError('USER_NOT_FOUND')
  }

  const userId = await ctx.db.insert('users', {
    authTokenIdentifier: identity.tokenIdentifier,
    email,
    name,
    createdAt: Date.now(),
  })

  return {
    _id: userId,
    _creationTime: Date.now(),
    authTokenIdentifier: identity.tokenIdentifier,
    email,
    name,
    createdAt: Date.now(),
  }
}

export async function requireExistingUser(ctx: Ctx, identity: NonNullable<Identity>) {
  const user = await findUserByIdentity(ctx, identity)

  if (!user) {
    throw new ConvexError('USER_NOT_FOUND')
  }

  return user
}

export async function requireProjectOwner(ctx: Ctx, projectId: Id<'projects'>) {
  const identity = await requireAuthUser(ctx)
  const user = await requireExistingUser(ctx, identity)
  const project = await ctx.db.get(projectId)

  if (!project) {
    throw new ConvexError('PROJECT_NOT_FOUND')
  }

  // MVP access model: only the owning user can access project resources.
  const isLegacyOwner = project.ownerUserId === identity.tokenIdentifier
  const isCurrentOwner = project.ownerUserId === user._id

  if (!isLegacyOwner && !isCurrentOwner) {
    throw new ConvexError('FORBIDDEN')
  }

  return { identity, user, project }
}

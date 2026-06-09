import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { createAccount, getAuthUserId } from '@convex-dev/auth/server';
import { internal } from './_generated/api';
import { requireProjectOwner } from './_lib/projectAccess';
import type { Doc, Id } from './_generated/dataModel';

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

const inviteRole = v.union(
  v.literal('manager'),
  v.literal('inspector'),
  v.literal('contractor'),
);

const generateCode = () => {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return `BSY-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
};

const isActive = (inv: Doc<'projectInvitations'>) =>
  !inv.consumedAt && !inv.revokedAt && inv.expiresAt > Date.now();

export const peekInvitation = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query('projectInvitations')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .unique();
    if (!inv) {
      return { valid: false as const, reason: 'not_found' as const };
    }
    if (inv.consumedAt) return { valid: false as const, reason: 'consumed' as const };
    if (inv.revokedAt) return { valid: false as const, reason: 'revoked' as const };
    if (inv.expiresAt <= Date.now()) {
      return { valid: false as const, reason: 'expired' as const };
    }

    const project = await ctx.db.get(inv.projectId);
    return {
      valid: true as const,
      role: inv.role,
      invitedName: inv.invitedName ?? null,
      invitedEmail: inv.invitedEmail ?? null,
      projectName: project?.name ?? '',
      expiresAt: inv.expiresAt,
    };
  },
});

export const createInvitation = mutation({
  args: {
    projectId: v.id('projects'),
    role: inviteRole,
    invitedEmail: v.optional(v.string()),
    invitedName: v.optional(v.string()),
    contractorId: v.optional(v.id('contractors')),
    allowBudgetView: v.optional(v.boolean()),
    allowScheduleView: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectOwner(ctx, args.projectId);

    if (args.contractorId) {
      const contractor = await ctx.db.get(args.contractorId);
      if (!contractor || contractor.projectId !== args.projectId) {
        throw new Error('Contractor does not belong to this project');
      }
      if (args.role !== 'contractor') {
        throw new Error('contractorId may only be set for contractor invitations');
      }
    }

    if (args.invitedEmail) {
      const existing = await ctx.db
        .query('projectInvitations')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .take(50);
      const dup = existing.find(
        (inv) =>
          inv.role === args.role &&
          inv.invitedEmail === args.invitedEmail &&
          isActive(inv),
      );
      if (dup) {
        throw new Error('כבר קיימת הזמנה פעילה לכתובת זו לתפקיד זה');
      }
    }

    let code = generateCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const collision = await ctx.db
        .query('projectInvitations')
        .withIndex('by_code', (q) => q.eq('code', code))
        .unique();
      if (!collision) break;
      code = generateCode();
    }

    const expiresAt = Date.now() + INVITE_TTL_MS;
    const id = await ctx.db.insert('projectInvitations', {
      projectId: args.projectId,
      code,
      role: args.role,
      invitedByUserId: userId,
      expiresAt,
      ...(args.invitedEmail ? { invitedEmail: args.invitedEmail } : {}),
      ...(args.invitedName ? { invitedName: args.invitedName } : {}),
      ...(args.contractorId ? { contractorId: args.contractorId } : {}),
      allowBudgetView: args.allowBudgetView,
      allowScheduleView: args.allowScheduleView,
    });

    return { id, code, expiresAt };
  },
});

export const listInvitations = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    const rows = await ctx.db
      .query('projectInvitations')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(100);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const visible = rows.filter((inv) => isActive(inv) || inv._creationTime >= cutoff);

    return await Promise.all(
      visible.map(async (inv) => {
        const consumedBy = inv.consumedByUserId
          ? await ctx.db.get(inv.consumedByUserId)
          : null;
        return {
          ...inv,
          id: inv._id,
          status: inv.consumedAt
            ? ('consumed' as const)
            : inv.revokedAt
              ? ('revoked' as const)
              : inv.expiresAt <= Date.now()
                ? ('expired' as const)
                : ('active' as const),
          consumedByName: consumedBy?.name ?? consumedBy?.email ?? null,
        };
      }),
    );
  },
});

export const revokeInvitation = mutation({
  args: { invitationId: v.id('projectInvitations') },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invitationId);
    if (!inv) return { revoked: false };
    await requireProjectOwner(ctx, inv.projectId);

    if (inv.consumedAt || inv.revokedAt) return { revoked: false };
    await ctx.db.patch(args.invitationId, { revokedAt: Date.now() });
    return { revoked: true };
  },
});

export const _peekInvitationInternal = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query('projectInvitations')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .unique();
    if (!inv) return null;
    return {
      _id: inv._id,
      projectId: inv.projectId,
      role: inv.role,
      contractorId: inv.contractorId ?? null,
      consumedAt: inv.consumedAt ?? null,
      revokedAt: inv.revokedAt ?? null,
      expiresAt: inv.expiresAt,
    };
  },
});

export const _completeRedemption = internalMutation({
  args: {
    invitationId: v.id('projectInvitations'),
    newUserId: v.id('users'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db.get(args.invitationId);
    if (!inv) throw new Error('Invitation disappeared');
    if (inv.consumedAt) throw new Error('ההזמנה כבר נוצלה');
    if (inv.revokedAt) throw new Error('ההזמנה בוטלה');
    if (inv.expiresAt <= Date.now()) throw new Error('ההזמנה פגה');

    const allowBudgetView = inv.allowBudgetView ?? (inv.role !== 'contractor');
    const allowScheduleView = inv.allowScheduleView !== false;

    if (inv.role === 'manager') {
      await ctx.db.patch(inv.projectId, { 
        managerUserId: args.newUserId,
        managerCanViewBudget: allowBudgetView,
        managerCanViewSchedule: allowScheduleView,
      });
    } else if (inv.role === 'inspector') {
      await ctx.db.patch(inv.projectId, { 
        inspectorUserId: args.newUserId,
        inspectorCanViewBudget: allowBudgetView,
        inspectorCanViewSchedule: allowScheduleView,
      });
    } else if (inv.role === 'contractor') {
      if (inv.contractorId) {
        await ctx.db.patch(inv.contractorId, { 
          userId: args.newUserId,
          canViewBudget: allowBudgetView,
          canViewSchedule: allowScheduleView,
        });
      } else {
        await ctx.db.insert('contractors', {
          projectId: inv.projectId,
          name: args.name,
          role: 'אחר',
          status: 'pending',
          rating: 0,
          budget: 0,
          paid: 0,
          userId: args.newUserId,
          canViewBudget: allowBudgetView,
          canViewSchedule: allowScheduleView,
        });
      }
    }

    await ctx.db.patch(inv._id, {
      consumedByUserId: args.newUserId,
      consumedAt: Date.now(),
    });
  },
});

export const redeemInvitation = action({
  args: {
    code: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    if (args.password.length < 8) {
      throw new Error('הסיסמה חייבת להכיל לפחות 8 תווים');
    }

    const inv = await ctx.runQuery(internal.invitations._peekInvitationInternal, {
      code: args.code,
    });
    if (!inv) throw new Error('הקוד לא נמצא');
    if (inv.consumedAt) throw new Error('ההזמנה כבר נוצלה');
    if (inv.revokedAt) throw new Error('ההזמנה בוטלה');
    if (inv.expiresAt <= Date.now()) throw new Error('ההזמנה פגה');

    const created = await createAccount(ctx, {
      provider: 'password',
      account: { id: args.email, secret: args.password },
      profile: {
        email: args.email,
        name: args.name,
        role: inv.role,
        ...(args.phone ? { phone: args.phone } : {}),
      },
    });

    const newUserId = created.user._id as Id<'users'>;

    await ctx.runMutation(internal.invitations._completeRedemption, {
      invitationId: inv._id,
      newUserId,
      name: args.name,
    });

    return { ok: true as const };
  },
});

export const redeemInvitationExistingUser = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    const inv = await ctx.db
      .query('projectInvitations')
      .withIndex('by_code', (q) => q.eq('code', args.code))
      .unique();
    
    if (!inv) throw new Error('הקוד לא נמצא');
    if (inv.consumedAt) throw new Error('ההזמנה כבר נוצלה');
    if (inv.revokedAt) throw new Error('ההזמנה בוטלה');
    if (inv.expiresAt <= Date.now()) throw new Error('ההזמנה פגה');

    const allowBudgetView = inv.allowBudgetView ?? (inv.role !== 'contractor');
    const allowScheduleView = inv.allowScheduleView !== false;

    try {
      if (inv.role === 'manager') {
        await ctx.db.patch(inv.projectId, { 
          managerUserId: userId,
          managerCanViewBudget: allowBudgetView,
          managerCanViewSchedule: allowScheduleView,
        });
      } else if (inv.role === 'inspector') {
        await ctx.db.patch(inv.projectId, { 
          inspectorUserId: userId,
          inspectorCanViewBudget: allowBudgetView,
          inspectorCanViewSchedule: allowScheduleView,
        });
      } else if (inv.role === 'contractor') {
        if (inv.contractorId) {
          const existingContractor = await ctx.db.get(inv.contractorId);
          if (existingContractor) {
            await ctx.db.patch(inv.contractorId, { 
              userId: userId,
              canViewBudget: allowBudgetView,
              canViewSchedule: allowScheduleView,
            });
          } else {
            // Contractor was deleted, create a new one
            await ctx.db.insert('contractors', {
              projectId: inv.projectId,
              name: user.name || user.email || 'קבלן',
              role: 'אחר',
              status: 'pending',
              rating: 0,
              budget: 0,
              paid: 0,
              userId: userId,
              canViewBudget: allowBudgetView,
              canViewSchedule: allowScheduleView,
            });
          }
        } else {
          await ctx.db.insert('contractors', {
            projectId: inv.projectId,
            name: user.name || user.email || 'קבלן',
            role: 'אחר',
            status: 'pending',
            rating: 0,
            budget: 0,
            paid: 0,
            userId: userId,
            canViewBudget: allowBudgetView,
            canViewSchedule: allowScheduleView,
          });
        }
      }
    } catch (e) {
      throw new Error(`שגיאה בעדכון הפרויקט: ${e instanceof Error ? e.message : 'שגיאה לא ידועה'}`);
    }

    try {
      await ctx.db.patch(inv._id, {
        consumedByUserId: userId,
        consumedAt: Date.now(),
      });
    } catch (e) {
      throw new Error(`שגיאה בעדכון ההזמנה: ${e instanceof Error ? e.message : 'שגיאה לא ידועה'}`);
    }

    return { ok: true };
  },
});

export const removeMember = mutation({
  args: {
    projectId: v.id('projects'),
    role: v.union(v.literal('manager'), v.literal('inspector')),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);
    if (args.role === 'manager') {
      await ctx.db.patch(args.projectId, { managerUserId: undefined });
    } else {
      await ctx.db.patch(args.projectId, { inspectorUserId: undefined });
    }
    return { ok: true };
  },
});

export const unlinkContractorLogin = mutation({
  args: { contractorId: v.id('contractors') },
  handler: async (ctx, args) => {
    const contractor = await ctx.db.get(args.contractorId);
    if (!contractor) throw new Error('Contractor not found');
    await requireProjectOwner(ctx, contractor.projectId);
    await ctx.db.patch(args.contractorId, { userId: undefined });
    return { ok: true };
  },
});

export const listProjectMembers = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error('Project not found');

    const [owner, manager, inspector, contractors] = await Promise.all([
      project.ownerUserId ? ctx.db.get(project.ownerUserId) : null,
      project.managerUserId ? ctx.db.get(project.managerUserId) : null,
      project.inspectorUserId ? ctx.db.get(project.inspectorUserId) : null,
      ctx.db
        .query('contractors')
        .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
        .take(200),
    ]);

    return {
      owner: owner
        ? { userId: owner._id, name: owner.name ?? owner.email ?? '', email: owner.email ?? null }
        : null,
      manager: manager
        ? { 
            userId: manager._id, 
            name: manager.name ?? manager.email ?? '', 
            email: manager.email ?? null,
            canViewBudget: project.managerCanViewBudget !== false,
            canViewSchedule: project.managerCanViewSchedule !== false,
          }
        : null,
      inspector: inspector
        ? { 
            userId: inspector._id, 
            name: inspector.name ?? inspector.email ?? '', 
            email: inspector.email ?? null,
            canViewBudget: project.inspectorCanViewBudget !== false,
            canViewSchedule: project.inspectorCanViewSchedule !== false,
          }
        : null,
      contractors: contractors.map((c) => ({
        contractorId: c._id,
        name: c.name,
        role: c.role,
        hasLogin: !!c.userId,
        canViewBudget: c.canViewBudget === true,
        canViewSchedule: c.canViewSchedule !== false,
      })),
    };
  },
});

export const updateMemberBudgetPermission = mutation({
  args: {
    projectId: v.id('projects'),
    role: v.union(v.literal('manager'), v.literal('inspector'), v.literal('contractor')),
    contractorId: v.optional(v.id('contractors')),
    canViewBudget: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    if (args.role === 'manager') {
      await ctx.db.patch(args.projectId, {
        managerCanViewBudget: args.canViewBudget,
      });
    } else if (args.role === 'inspector') {
      await ctx.db.patch(args.projectId, {
        inspectorCanViewBudget: args.canViewBudget,
      });
    } else if (args.role === 'contractor') {
      if (!args.contractorId) {
        throw new Error('Contractor ID is required for contractor permission updates');
      }
      const contractor = await ctx.db.get(args.contractorId);
      if (!contractor || contractor.projectId !== args.projectId) {
        throw new Error('Contractor not found or does not belong to this project');
      }
      await ctx.db.patch(args.contractorId, {
        canViewBudget: args.canViewBudget,
      });
    }

    return { success: true };
  },
});

export const updateMemberSchedulePermission = mutation({
  args: {
    projectId: v.id('projects'),
    role: v.union(v.literal('manager'), v.literal('inspector'), v.literal('contractor')),
    contractorId: v.optional(v.id('contractors')),
    canViewSchedule: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireProjectOwner(ctx, args.projectId);

    if (args.role === 'manager') {
      await ctx.db.patch(args.projectId, {
        managerCanViewSchedule: args.canViewSchedule,
      });
    } else if (args.role === 'inspector') {
      await ctx.db.patch(args.projectId, {
        inspectorCanViewSchedule: args.canViewSchedule,
      });
    } else if (args.role === 'contractor') {
      if (!args.contractorId) {
        throw new Error('Contractor ID is required for contractor permission updates');
      }
      const contractor = await ctx.db.get(args.contractorId);
      if (!contractor || contractor.projectId !== args.projectId) {
        throw new Error('Contractor not found or does not belong to this project');
      }
      await ctx.db.patch(args.contractorId, {
        canViewSchedule: args.canViewSchedule,
      });
    }

    return { success: true };
  },
});

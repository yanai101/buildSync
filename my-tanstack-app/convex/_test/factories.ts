/**
 * Typed fixture builders for convex-test.
 *
 * Why this exists: tests used to insert raw object literals, so every required
 * field added to a table broke a dozen test files at once — and because
 * convex-test's runtime validation is looser than the generated `Doc` types,
 * those literals passed at runtime while `tsc -p tsconfig.convex.json` failed.
 * Insert through these builders instead: a schema change then breaks ONE file.
 *
 * Membership model (see convex/_lib/projectAccess.ts): a user is a member of a
 * project if they are its ownerUserId / managerUserId / inspectorUserId, OR a
 * `contractors` row for that project carries their userId, OR they are a super
 * admin. `seedProject` builds one of each so authorization tests can cover the
 * whole matrix from a single call.
 */
import type { WithoutSystemFields } from 'convex/server';
import type { Doc, Id } from '../_generated/dataModel';
import type { convexTest } from 'convex-test';

type T = ReturnType<typeof convexTest>;

type NewUser = WithoutSystemFields<Doc<'users'>>;
type NewProject = WithoutSystemFields<Doc<'projects'>>;
type NewContractor = WithoutSystemFields<Doc<'contractors'>>;
type NewStage = WithoutSystemFields<Doc<'stages'>>;
type NewExpense = WithoutSystemFields<Doc<'expenses'>>;
type NewBudgetCategory = WithoutSystemFields<Doc<'budgetCategories'>>;
type NewMilestone = WithoutSystemFields<Doc<'contractorPaymentMilestones'>>;

export const makeUser = (over: Partial<NewUser> = {}): NewUser => ({
  name: 'בעלים',
  role: 'owner',
  ...over,
});

export const makeProject = (
  ownerUserId: Id<'users'>,
  over: Partial<NewProject> = {},
): NewProject => ({
  name: 'פרויקט בדיקה',
  address: 'רחוב הבדיקה 1, תל אביב',
  ownerUserId,
  startDate: '2026-01-01',
  expectedEnd: '2026-12-31',
  progressPct: 0,
  budgetTotal: 1_000_000,
  spent: 0,
  ...over,
});

export const makeContractor = (
  projectId: Id<'projects'>,
  over: Partial<NewContractor> = {},
): NewContractor => ({
  projectId,
  name: 'קבלן בדיקה',
  role: 'קבלן שלד',
  status: 'active',
  rating: 0,
  budget: 0,
  paid: 0,
  ...over,
});

export interface SeededProject {
  projectId: Id<'projects'>;
  /** Project owner — full access, including financials. */
  ownerId: Id<'users'>;
  /** Project manager — operational access, blocked from financials. */
  managerId: Id<'users'>;
  /** Professional inspector — field quality, blocked from pricing. */
  inspectorId: Id<'users'>;
  /** A user linked to the project through a `contractors` row. */
  contractorUserId: Id<'users'>;
  /** The `contractors` row linking contractorUserId to the project. */
  contractorId: Id<'contractors'>;
  /** Authenticated, but not a member of this project. Every guard must reject them. */
  outsiderId: Id<'users'>;
  /** Super admin — a member of every project by virtue of isSuperAdmin. */
  superAdminId: Id<'users'>;
}

/**
 * Inserts a project plus one user per role, and returns every id. Use with
 * `t.withIdentity({ subject: <id> })` to drive a function as that actor.
 */
export const seedProject = async (
  t: T,
  projectOver: Partial<NewProject> = {},
): Promise<SeededProject> =>
  t.run(async (ctx) => {
    const ownerId = await ctx.db.insert('users', makeUser({ name: 'בעלים', role: 'owner' }));
    const managerId = await ctx.db.insert('users', makeUser({ name: 'מנהל', role: 'manager' }));
    const inspectorId = await ctx.db.insert('users', makeUser({ name: 'מפקח', role: 'inspector' }));
    const contractorUserId = await ctx.db.insert('users', makeUser({ name: 'קבלן', role: 'contractor' }));
    const outsiderId = await ctx.db.insert('users', makeUser({ name: 'זר', role: 'owner' }));
    const superAdminId = await ctx.db.insert(
      'users',
      makeUser({ name: 'אדמין', role: 'owner', isSuperAdmin: true }),
    );

    const projectId = await ctx.db.insert(
      'projects',
      makeProject(ownerId, { managerUserId: managerId, inspectorUserId: inspectorId, ...projectOver }),
    );

    const contractorId = await ctx.db.insert(
      'contractors',
      makeContractor(projectId, { userId: contractorUserId }),
    );

    return {
      projectId,
      ownerId,
      managerId,
      inspectorId,
      contractorUserId,
      contractorId,
      outsiderId,
      superAdminId,
    };
  });

export const makeStage = (
  projectId: Id<'projects'>,
  over: Partial<NewStage> = {},
): NewStage => ({
  projectId,
  sortOrder: 0,
  name: 'שלב',
  // Valid values only: zStageStatus is ['done','active','pending'] and
  // payment.status is zPaymentStatus, a DIFFERENT union starting at 'draft'.
  // Existing tests insert 'in_progress'/'pending' for these, which the
  // generated types reject — convex-test's t.run ctx is loosely typed enough
  // to let it through at runtime.
  status: 'pending',
  progressPct: 0,
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  payment: { amount: 0, status: 'draft' },
  ...over,
});

export const makeExpense = (
  projectId: Id<'projects'>,
  over: Partial<NewExpense> = {},
): NewExpense => ({
  projectId,
  expenseDate: '2026-01-15',
  description: 'הוצאה',
  amount: 1000,
  // 'שולם' (paid) vs 'ממתין' (pending). getFinancialSummary counts ONLY the
  // former, matching on this Hebrew string literal.
  status: 'שולם',
  ...over,
});

export const makeBudgetCategory = (
  projectId: Id<'projects'>,
  over: Partial<NewBudgetCategory> = {},
): NewBudgetCategory => ({
  projectId,
  name: 'קטגוריה',
  budget: 1000,
  spent: 0,
  color: '#E07A38',
  sortOrder: 0,
  ...over,
});

export const makeMilestone = (
  contractorId: Id<'contractors'>,
  over: Partial<NewMilestone> = {},
): NewMilestone => ({
  contractorId,
  sortOrder: 0,
  name: 'אבן דרך',
  triggerText: 'בסיום',
  pct: 100,
  amount: 1000,
  paid: false,
  partialPayments: [],
  ...over,
});

// Per-owner demo seed. Called from the client right after the owner signs up
// (or the first time an owner with no project logs in). Fills every domain
// table with the BuildSync mock data and links ownership to the caller.
//
// Mock data comes from src/utils/mockData.ts (no client-only imports, safe
// to pull into Convex). A few values live inside React components — those
// are inlined here with a source note.

import { mutation } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import {
  PROJECT,
  STAGES,
  CONTRACTORS_DATA,
  BUDGET_CATS,
  PHOTOS_DATA,
  NOTES_INITIAL,
  BOQ_DATA,
  TIMELINE_DATA,
  TOTAL_WEEKS,
  QUOTE_TOPICS,
  QUOTES_DATA,
} from '../src/utils/mockData';

// ── Data normally inside React components (copied here for the seed) ─────────
// Source: src/components/LegacyScreens.tsx — ProjectSetupScreen DEFAULT_ROOMS
const DEFAULT_ROOMS = [
  { uid: 'r1', type: 'living', name: 'סלון', floor: 1, size: 40 },
  { uid: 'r2', type: 'kitchen', name: 'מטבח', floor: 1, size: 20 },
  { uid: 'r3', type: 'dining', name: 'פינת אוכל', floor: 1, size: 18 },
  { uid: 'r4', type: 'toilet', name: 'שירותי אורחים', floor: 1, size: 4 },
  { uid: 'r5', type: 'entrance', name: 'כניסה ומסדרון', floor: 1, size: 12 },
  { uid: 'r6', type: 'master', name: 'חדר שינה ראשי', floor: 2, size: 22 },
  { uid: 'r7', type: 'bedroom', name: 'חדר שינה 2', floor: 2, size: 16 },
  { uid: 'r8', type: 'bedroom', name: 'חדר שינה 3', floor: 2, size: 15 },
  { uid: 'r9', type: 'bathroom', name: 'חדר אמבטיה 1', floor: 2, size: 9 },
  { uid: 'r10', type: 'bathroom', name: 'חדר אמבטיה 2', floor: 2, size: 7 },
];

// Source: src/components/LegacyScreens.tsx — ROOM_TYPE_OPTS (wet/needsAC flags)
const ROOM_TYPE_FLAGS: Record<string, { wet: boolean; needsAC: boolean }> = {
  living: { wet: false, needsAC: true },
  dining: { wet: false, needsAC: false },
  kitchen: { wet: true, needsAC: false },
  master: { wet: false, needsAC: true },
  bedroom: { wet: false, needsAC: true },
  bathroom: { wet: true, needsAC: false },
  toilet: { wet: true, needsAC: false },
  entrance: { wet: false, needsAC: false },
  utility: { wet: true, needsAC: false },
  office: { wet: false, needsAC: true },
  storage: { wet: false, needsAC: false },
  garage: { wet: false, needsAC: false },
  balcony: { wet: false, needsAC: false },
};

// Source: src/components/LegacyScreens.tsx — STAGE_AMOUNTS + STAGE_MILESTONES
const STAGE_AMOUNTS: Record<number, number> = {
  1: 80000, 2: 85000, 3: 450000, 4: 60000, 5: 65000, 6: 50000, 7: 120000,
  8: 140000, 9: 40000, 10: 45000, 11: 120000, 12: 45000, 13: 30000, 14: 20000,
};

const STAGE_MILESTONES: Record<
  number,
  { key: string; name: string; pct: number; taskLegacyIds: number[] }[]
> = {
  3: [
    { key: 'm3a', name: "תקרה קומה א'", pct: 30, taskLegacyIds: [31, 32] },
    { key: 'm3b', name: "קירות קומה ב'", pct: 40, taskLegacyIds: [33] },
    { key: 'm3c', name: 'גג', pct: 30, taskLegacyIds: [34] },
  ],
  7: [
    { key: 'm7a', name: "טיח פנים קומה א'", pct: 25, taskLegacyIds: [71] },
    { key: 'm7b', name: "טיח פנים קומה ב'", pct: 25, taskLegacyIds: [72] },
    { key: 'm7c', name: 'טיח חוץ', pct: 30, taskLegacyIds: [73] },
    { key: 'm7d', name: 'גמר + אינסטלציה עדינה', pct: 20, taskLegacyIds: [74] },
  ],
};

// Source: src/components/LegacyScreens.tsx — BudgetScreen.expenses
const SEED_EXPENSES = [
  { date: '15/09/25', desc: 'תשלום לקבלן שלד — מקדמה', cat: 'שלד ויסודות', amount: 135000, status: 'שולם' as const },
  { date: '01/10/25', desc: 'תשלום לחשמלאי — ביניים', cat: 'חשמל', amount: 45000, status: 'שולם' as const },
  { date: '10/10/25', desc: 'חומרי טיח — פרץ טיח', cat: 'טיח', amount: 28000, status: 'שולם' as const },
  { date: '20/10/25', desc: 'תשלום לאינסטלטור', cat: 'אינסטלציה', amount: 40000, status: 'שולם' as const },
  { date: '25/10/25', desc: 'תשלום לקבלן טיח — ביניים', cat: 'טיח', amount: 44000, status: 'שולם' as const },
  { date: '01/11/25', desc: 'תשלום לחשמלאי — סיום גולמי', cat: 'חשמל', amount: 20000, status: 'ממתין' as const },
];

// Source: src/components/LegacyScreens.tsx — DashboardScreen.recentActivity
const SEED_ACTIVITY = [
  { role: 'inspector' as const, name: 'רון לוי', text: "בדיקת טיח קומה ב' — עבר. ניתן להמשיך." },
  { role: 'manager' as const, name: 'אבי כהן', text: 'צולמה התקדמות — 8 תמונות חדשות הועלו' },
  { role: 'contractor' as const, name: 'יעקב פרץ', text: "טיח פנים קומה ב' הושלם" },
  { role: 'owner' as const, name: 'יוסי רוזנברג', text: 'אושרה בחירת ספק ריצוף — כרמל ריצוף' },
];

// ── The seed ─────────────────────────────────────────────────────────────────

export const seedMyProject = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerUserId = await getAuthUserId(ctx);
    if (!ownerUserId) {
      throw new Error('Not authenticated — sign in before seeding a project.');
    }
    const owner = await ctx.db.get(ownerUserId);
    const ownerName = owner?.name || owner?.email || PROJECT.owner;

    // Idempotent per-owner: if this user already has a project, return it.
    const existingOwned = await ctx.db
      .query('projects')
      .filter((q) => q.eq(q.field('ownerUserId'), ownerUserId))
      .first();
    if (existingOwned) {
      return { alreadySeeded: true, projectId: existingOwned._id };
    }

    // ── project ──────────────────────────────────────────────────────────────
    const projectId: Id<'projects'> = await ctx.db.insert('projects', {
      name: PROJECT.name,
      address: PROJECT.address,
      ownerUserId,
      ownerName,
      managerName: PROJECT.manager,
      inspectorName: PROJECT.inspector,
      startDate: PROJECT.startDate,
      expectedEnd: PROJECT.expectedEnd,
      floors: 2,
      areaSqm: 200,
      progressPct: PROJECT.progress,
      currentStageName: PROJECT.currentStage,
      budgetTotal: PROJECT.budget,
      spent: PROJECT.spent,
      committed: PROJECT.committed,
      totalWeeks: TOTAL_WEEKS,
    });

    // ── project rooms ────────────────────────────────────────────────────────
    const roomIdByLegacyUid = new Map<string, Id<'projectRooms'>>();
    for (let i = 0; i < DEFAULT_ROOMS.length; i++) {
      const r = DEFAULT_ROOMS[i];
      const flags = ROOM_TYPE_FLAGS[r.type] ?? { wet: false, needsAC: false };
      const roomId = await ctx.db.insert('projectRooms', {
        projectId,
        legacyUid: r.uid,
        type: r.type as Doc<'projectRooms'>['type'],
        name: r.name,
        floor: r.floor,
        sizeSqm: r.size,
        isWet: flags.wet,
        needsAc: flags.needsAC,
        sortOrder: i,
      });
      roomIdByLegacyUid.set(r.uid, roomId);
    }

    // ── contractors (needed before stages can link to them) ──────────────────
    const contractorIdByLegacyId = new Map<number, Id<'contractors'>>();
    const contractorIdByRole = new Map<string, Id<'contractors'>>();
    for (const c of CONTRACTORS_DATA) {
      const id = await ctx.db.insert('contractors', {
        projectId,
        legacyId: c.id,
        name: c.name,
        company: c.company,
        role: c.role as Doc<'contractors'>['role'],
        phone: c.phone,
        email: c.email,
        status: c.status as Doc<'contractors'>['status'],
        rating: c.rating,
        budget: c.budget,
        paid: c.paid,
        avatarLetter: c.avatar,
        avatarColor: c.color,
      });
      contractorIdByLegacyId.set(c.id, id);
      if (!contractorIdByRole.has(c.role)) {
        contractorIdByRole.set(c.role, id);
      }
    }

    // ── stages + tasks + milestones + milestone-task joins ───────────────────
    const stageIdByLegacyId = new Map<number, Id<'stages'>>();
    const taskIdByLegacyId = new Map<number, Id<'stageTasks'>>();

    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i];
      const amount = STAGE_AMOUNTS[s.id] ?? 0;
      const paymentStatus: Doc<'stages'>['payment']['status'] =
        s.status === 'done' ? 'paid' : s.status === 'active' ? 'in_progress' : 'draft';

      const stageId = await ctx.db.insert('stages', {
        projectId,
        legacyId: s.id,
        sortOrder: i,
        name: s.name,
        icon: s.icon,
        status: s.status as Doc<'stages'>['status'],
        progressPct: s.progress,
        startDate: s.start,
        endDate: s.end,
        contractorRole: s.contractor,
        contractorId: contractorIdByRole.get(s.contractor),
        supervisorApprovalBy: s.status === 'done' ? 'רון לוי' : undefined,
        supervisorApprovalAt: s.status === 'done' ? s.end : undefined,
        payment: {
          amount,
          status: paymentStatus,
          paidAt: s.status === 'done' ? s.end : undefined,
        },
      });
      stageIdByLegacyId.set(s.id, stageId);

      for (let j = 0; j < s.tasks.length; j++) {
        const t = s.tasks[j];
        const taskId = await ctx.db.insert('stageTasks', {
          stageId,
          legacyId: t.id,
          name: t.name,
          done: t.done,
          assignee: t.assignee,
          required: true,
          sortOrder: j,
        });
        taskIdByLegacyId.set(t.id, taskId);
      }

      const msTemplate = STAGE_MILESTONES[s.id];
      if (msTemplate) {
        for (let k = 0; k < msTemplate.length; k++) {
          const m = msTemplate[k];
          const msAmount = Math.round((amount * m.pct) / 100);
          const msStatus: Doc<'stageMilestones'>['status'] =
            s.status === 'done' ? 'paid' : 'draft';
          const milestoneId = await ctx.db.insert('stageMilestones', {
            stageId,
            legacyKey: m.key,
            sortOrder: k,
            name: m.name,
            pct: m.pct,
            amount: msAmount,
            status: msStatus,
            supervisorApprovalBy: s.status === 'done' ? 'רון לוי' : undefined,
            supervisorApprovalAt: s.status === 'done' ? s.end : undefined,
            paidAt: s.status === 'done' ? s.end : undefined,
          });
          for (const legacyTaskId of m.taskLegacyIds) {
            const taskId = taskIdByLegacyId.get(legacyTaskId);
            if (taskId) {
              await ctx.db.insert('stageMilestoneTasks', { milestoneId, taskId });
            }
          }
        }
      }
    }

    // ── contractor payment milestones (seed 4-step default per contractor) ───
    // Mirrors DEFAULT_SCHEDULE in PaymentSchedule. Kept short here; the UI
    // can swap in role-specific templates from DEFAULT_PAYMENT_SCHEDULES later.
    const DEFAULT_SCHEDULE = [
      { name: 'מקדמה לפני התחלה', pct: 30, trigger: 'לפני תחילת עבודה' },
      { name: "תשלום ביניים א'", pct: 25, trigger: 'אחרי 30% מהעבודה' },
      { name: "תשלום ביניים ב'", pct: 25, trigger: 'אחרי 70% מהעבודה' },
      { name: 'תשלום סופי', pct: 20, trigger: 'סיום ואישור מפקח' },
    ];
    for (const c of CONTRACTORS_DATA) {
      const cId = contractorIdByLegacyId.get(c.id)!;
      let paidCum = 0;
      for (let i = 0; i < DEFAULT_SCHEDULE.length; i++) {
        const step = DEFAULT_SCHEDULE[i];
        const amount = Math.round((c.budget * step.pct) / 100);
        const paid = paidCum + amount <= c.paid;
        if (paid) paidCum += amount;
        await ctx.db.insert('contractorPaymentMilestones', {
          contractorId: cId,
          sortOrder: i,
          name: step.name,
          triggerText: step.trigger,
          pct: step.pct,
          amount,
          paid,
          paidAt: undefined,
        });
      }
    }

    // ── budget categories + expenses ─────────────────────────────────────────
    const budgetCategoryIdByName = new Map<string, Id<'budgetCategories'>>();
    for (let i = 0; i < BUDGET_CATS.length; i++) {
      const c = BUDGET_CATS[i];
      const id = await ctx.db.insert('budgetCategories', {
        projectId,
        name: c.name,
        budget: c.budget,
        spent: c.spent,
        color: c.color,
        sortOrder: i,
      });
      budgetCategoryIdByName.set(c.name, id);
    }
    for (const e of SEED_EXPENSES) {
      await ctx.db.insert('expenses', {
        projectId,
        categoryId: budgetCategoryIdByName.get(e.cat),
        expenseDate: e.date,
        description: e.desc,
        amount: e.amount,
        status: e.status,
      });
    }

    // ── BOQ items ────────────────────────────────────────────────────────────
    // BOQ_DATA is keyed by room legacy key ("living", "kitchen", ...) which
    // matches the mock ROOMS_LIST ids. The wizard creates rooms with different
    // uids ("r1", ...), so we resolve by `type` as a best-effort match.
    const roomIdByType = new Map<string, Id<'projectRooms'>>();
    for (const [uid, id] of roomIdByLegacyUid) {
      const def = DEFAULT_ROOMS.find((r) => r.uid === uid);
      if (def && !roomIdByType.has(def.type)) {
        roomIdByType.set(def.type, id);
      }
    }
    for (const [roomKey, items] of Object.entries(BOQ_DATA)) {
      for (const item of items as any[]) {
        await ctx.db.insert('boqItems', {
          projectId,
          roomId: roomIdByType.get(roomKey),
          roomLegacyKey: roomKey,
          legacyId: item.id,
          category: item.cat,
          name: item.name,
          qty: item.qty,
          userQty: item.qty,
          unit: item.unit,
          unitPrice: item.unitPrice,
          supplier: item.supplier,
          spec: item.spec,
          status: item.status as Doc<'boqItems'>['status'],
          source: 'manual',
        });
      }
    }

    // ── photos + annotations ─────────────────────────────────────────────────
    // Photos are linked to stages by label only in the mock data. Leave
    // stageId unset; the UI reads stageLabel for display.
    const photoIdByLegacyId = new Map<number, Id<'photos'>>();
    for (const p of PHOTOS_DATA) {
      const photoId = await ctx.db.insert('photos', {
        projectId,
        legacyId: p.id,
        takenOn: p.date,
        stageLabel: p.stage,
        location: p.location,
        tag: p.tag as Doc<'photos'>['tag'],
        label: p.label,
        color: p.color,
      });
      photoIdByLegacyId.set(p.id, photoId);
      for (const a of (p.annotations ?? []) as any[]) {
        await ctx.db.insert('photoAnnotations', {
          photoId,
          type: a.type as Doc<'photoAnnotations'>['type'],
          x: a.x,
          y: a.y,
          w: a.w,
          h: a.h,
          r: a.r,
          color: a.color,
          text: a.text,
        });
      }
    }

    // ── messages (threaded notes) ────────────────────────────────────────────
    // For messages authored by the owner, attribute to the authed user.
    for (const n of NOTES_INITIAL) {
      const isOwner = n.role === 'owner';
      await ctx.db.insert('messages', {
        projectId,
        legacyId: n.id,
        fromUserId: isOwner ? ownerUserId : undefined,
        fromName: isOwner ? ownerName : n.fromName,
        role: n.role as Doc<'messages'>['role'],
        thread: n.thread as Doc<'messages'>['thread'],
        text: n.text,
        resolved: n.resolved,
        date: n.date,
        time: n.time,
      });
    }

    // ── timeline bars ────────────────────────────────────────────────────────
    for (const t of TIMELINE_DATA) {
      await ctx.db.insert('timelineBars', {
        projectId,
        legacyId: t.id,
        stageId: stageIdByLegacyId.get(t.id),
        name: t.name,
        colWeek: t.col,
        spanWeeks: t.span,
        rowIndex: t.row,
        status: t.status as Doc<'timelineBars'>['status'],
      });
    }

    // ── quote topics (builtins) + price quotes ───────────────────────────────
    for (const t of QUOTE_TOPICS) {
      await ctx.db.insert('quoteTopics', {
        projectId: undefined, // builtins are global
        key: t.id,
        name: t.name,
        icon: t.icon,
        isBuiltin: true,
      });
    }
    for (const q of QUOTES_DATA) {
      await ctx.db.insert('priceQuotes', {
        projectId,
        topicKey: q.topicId,
        legacyId: q.id,
        supplier: q.supplier,
        contact: q.contact,
        phone: q.phone,
        email: q.email,
        total: q.total,
        validity: q.validity,
        notes: q.notes,
        status: q.status as Doc<'priceQuotes'>['status'],
        fileName: q.fileName,
        createdAt: q.createdAt,
      });
    }

    // ── activity feed ────────────────────────────────────────────────────────
    // Owner-role entries are attributed to the authed user.
    const now = Date.now();
    for (let i = 0; i < SEED_ACTIVITY.length; i++) {
      const a = SEED_ACTIVITY[i];
      const isOwner = a.role === 'owner';
      await ctx.db.insert('activityFeed', {
        projectId,
        actorUserId: isOwner ? ownerUserId : undefined,
        actorName: isOwner ? ownerName : a.name,
        role: a.role,
        text: a.text,
        createdAt: now - i * 3600_000,
      });
    }

    return { projectId, seeded: true };
  },
});

// ── Reset helper ─────────────────────────────────────────────────────────────
// Wipes every *domain* table. Users and Convex Auth tables are NOT touched —
// resetting them would sign everyone out and corrupt sessions. Dev only.

const DOMAIN_TABLES = [
  'activityFeed',
  'priceQuotes',
  'quoteTopics',
  'timelineBars',
  'expenses',
  'budgetCategories',
  'messages',
  'photoNotes',
  'photoAnnotations',
  'photos',
  'boqItems',
  'contractorPaymentMilestones',
  'contractors',
  'stageMilestoneTasks',
  'stageMilestones',
  'stageTasks',
  'stages',
  'projectRooms',
  'projects',
] as const;

async function wipeDomain(ctx: MutationCtx) {
  for (const table of DOMAIN_TABLES) {
    const docs = await ctx.db.query(table).collect();
    for (const d of docs) await ctx.db.delete(d._id);
  }
}

export const resetDomain = mutation({
  args: {},
  handler: async (ctx) => {
    await wipeDomain(ctx);
    return { ok: true };
  },
});

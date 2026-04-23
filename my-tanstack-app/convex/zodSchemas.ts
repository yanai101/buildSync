// Zod = source of truth. Convex validators are generated from these
// via convex-helpers/server/zod3 (see schema.ts).
//
// One field map per table — field names stay camelCase on the DB side,
// Hebrew values stay as-is because they're used raw in the UI.

import { z } from 'zod';
import { zid } from 'convex-helpers/server/zod3';

// ── Enums ────────────────────────────────────────────────────────────────────

export const zUserRole = z.enum(['owner', 'manager', 'inspector', 'contractor']);

export const zStageStatus = z.enum(['done', 'active', 'pending']);

export const zPaymentStatus = z.enum([
  'draft',
  'in_progress',
  'review_requested',
  'blocked',
  'ready',
  'paid',
  'disputed',
]);

export const zPhotoTag = z.enum(['התקדמות', 'בעיה', 'בדיקה', 'אישור']);

export const zAnnotationType = z.enum(['rect', 'circle', 'pen']);

export const zBoqStatus = z.enum(['approved', 'pending']);

export const zBoqSource = z.enum(['manual', 'wizard_smart', 'catalog']);

export const zQuoteStatus = z.enum(['pending', 'approved', 'rejected']);

export const zExpenseStatus = z.enum(['שולם', 'ממתין']);

export const zMessageThread = z.enum(['internal', 'contractor']);

export const zRoomType = z.enum([
  'living',
  'dining',
  'kitchen',
  'master',
  'bedroom',
  'bathroom',
  'toilet',
  'entrance',
  'utility',
  'office',
  'storage',
  'garage',
  'balcony',
]);

export const zContractorRole = z.enum([
  'קבלן עד מפתח',
  'קבלן שלד',
  'קבלן עפר',
  'קבלן טיח',
  'חשמלאי ראשי',
  'אינסטלטור',
  'קבלן ריצוף',
  'קבלן גג',
  'קבלן גבס',
  'קבלן נגרות',
  'צבעי',
  'קבלן גינה',
  'אחר',
]);

export const zContractorStatus = z.enum(['active', 'completed', 'pending']);

// ── Tables ───────────────────────────────────────────────────────────────────
// Note: the `users` table is owned by Convex Auth (see schema.ts). It's
// extended with `role`, `avatarLetter`, `avatarColor` directly in schema.ts
// rather than here — Convex Auth's base fields aren't Zod-shaped.

export const zProject = {
  name: z.string(),
  address: z.string(),
  ownerUserId: zid('users').optional(),
  managerUserId: zid('users').optional(),
  inspectorUserId: zid('users').optional(),
  // Denormalized names — the mock data tracks these as strings on PROJECT
  // before users exist. Keep them alongside the FKs.
  ownerName: z.string(),
  managerName: z.string(),
  inspectorName: z.string(),
  startDate: z.string(),
  expectedEnd: z.string(),
  floors: z.number(),
  areaSqm: z.number(),
  progressPct: z.number(),
  currentStageName: z.string().optional(),
  budgetTotal: z.number(),
  spent: z.number(),
  committed: z.number(),
  totalWeeks: z.number().optional(),
};

export const zProjectRoom = {
  projectId: zid('projects'),
  legacyUid: z.string().optional(),
  type: zRoomType,
  name: z.string(),
  floor: z.number(),
  sizeSqm: z.number(),
  isWet: z.boolean(),
  needsAc: z.boolean(),
  sortOrder: z.number(),
};

export const zStagePayment = z.object({
  amount: z.number(),
  status: zPaymentStatus,
  paidAt: z.string().optional(),
});

export const zStage = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  sortOrder: z.number(),
  name: z.string(),
  icon: z.string().optional(),
  status: zStageStatus,
  progressPct: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  contractorRole: z.string().optional(),
  contractorId: zid('contractors').optional(),
  supervisorApprovalBy: z.string().optional(),
  supervisorApprovalAt: z.string().optional(),
  extraProofPhotos: z.number(),
  payment: zStagePayment,
};

export const zStageTask = {
  stageId: zid('stages'),
  legacyId: z.number().optional(),
  name: z.string(),
  done: z.boolean(),
  assignee: z.string(),
  required: z.boolean(),
  sortOrder: z.number(),
};

export const zStageMilestone = {
  stageId: zid('stages'),
  legacyKey: z.string().optional(),
  sortOrder: z.number(),
  name: z.string(),
  pct: z.number(),
  amount: z.number(),
  status: zPaymentStatus,
  supervisorApprovalBy: z.string().optional(),
  supervisorApprovalAt: z.string().optional(),
  extraProofPhotos: z.number(),
  paidAt: z.string().optional(),
};

export const zStageMilestoneTask = {
  milestoneId: zid('stageMilestones'),
  taskId: zid('stageTasks'),
};

export const zContractor = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  name: z.string(),
  company: z.string().optional(),
  role: zContractorRole,
  phone: z.string().optional(),
  email: z.string().optional(),
  status: zContractorStatus,
  rating: z.number(),
  budget: z.number(),
  paid: z.number(),
  avatarLetter: z.string().optional(),
  avatarColor: z.string().optional(),
};

export const zContractorPaymentMilestone = {
  contractorId: zid('contractors'),
  sortOrder: z.number(),
  name: z.string(),
  triggerText: z.string(),
  pct: z.number(),
  amount: z.number(),
  paid: z.boolean(),
  paidAt: z.string().optional(),
};

export const zBoqItem = {
  projectId: zid('projects'),
  roomId: zid('projectRooms').optional(),
  // Legacy grouping key from BOQ_DATA ("living", "kitchen", ...) — kept so
  // data imported before rooms are created stays addressable.
  roomLegacyKey: z.string().optional(),
  legacyId: z.number().optional(),
  category: z.string(),
  name: z.string(),
  qty: z.number(),
  userQty: z.number().optional(),
  unit: z.string(),
  unitPrice: z.number(),
  supplier: z.string().optional(),
  spec: z.string().optional(),
  hint: z.string().optional(),
  status: zBoqStatus,
  source: zBoqSource,
};

export const zPhoto = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  takenOn: z.string(),
  stageId: zid('stages').optional(),
  stageLabel: z.string().optional(),
  location: z.string(),
  tag: zPhotoTag,
  label: z.string(),
  color: z.string().optional(),
  fileUrl: z.string().optional(),
  uploaderUserId: zid('users').optional(),
};

export const zPhotoAnnotation = {
  photoId: zid('photos'),
  type: zAnnotationType,
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
  r: z.number().optional(),
  color: z.string(),
  text: z.string().optional(),
};

export const zPhotoNote = {
  photoId: zid('photos'),
  authorUserId: zid('users').optional(),
  authorName: z.string(),
  role: zUserRole,
  text: z.string(),
};

export const zMessage = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  fromUserId: zid('users').optional(),
  fromName: z.string(),
  role: zUserRole,
  thread: zMessageThread,
  text: z.string(),
  resolved: z.boolean(),
  date: z.string().optional(),
  time: z.string().optional(),
};

export const zBudgetCategory = {
  projectId: zid('projects'),
  name: z.string(),
  budget: z.number(),
  spent: z.number(),
  color: z.string(),
  sortOrder: z.number(),
};

export const zExpense = {
  projectId: zid('projects'),
  categoryId: zid('budgetCategories').optional(),
  expenseDate: z.string(),
  description: z.string(),
  amount: z.number(),
  status: zExpenseStatus,
  contractorId: zid('contractors').optional(),
  milestoneId: zid('contractorPaymentMilestones').optional(),
};

export const zTimelineBar = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  stageId: zid('stages').optional(),
  name: z.string(),
  colWeek: z.number(),
  spanWeeks: z.number(),
  rowIndex: z.number(),
  status: zStageStatus,
};

export const zQuoteTopic = {
  projectId: zid('projects').optional(),
  key: z.string(),
  name: z.string(),
  icon: z.string(),
  isBuiltin: z.boolean(),
};

export const zPriceQuote = {
  projectId: zid('projects'),
  topicKey: z.string(),
  legacyId: z.number().optional(),
  supplier: z.string(),
  contact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  total: z.number(),
  validity: z.string().optional(),
  notes: z.string().optional(),
  status: zQuoteStatus,
  fileName: z.string().optional(),
  fileUrl: z.string().optional(),
  createdAt: z.string(),
};

export const zActivityFeedItem = {
  projectId: zid('projects'),
  actorUserId: zid('users').optional(),
  actorName: z.string(),
  role: zUserRole,
  text: z.string(),
  eventType: z.string().optional(),
  entityRef: z
    .object({
      table: z.string(),
      id: z.string(),
    })
    .optional(),
  createdAt: z.number(),
};

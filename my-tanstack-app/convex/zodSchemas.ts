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

export const zProjectFileUsage = z.enum(['photo', 'receipt', 'quote', 'document', 'daily_log']);

export const zProjectFileKind = z.enum(['image', 'pdf', 'document', 'other']);

export const zBoqStatus = z.enum(['approved', 'pending']);

export const zBoqSource = z.enum(['manual', 'wizard_smart', 'catalog']);

export const zQuoteStatus = z.enum(['pending', 'approved', 'rejected']);

export const zExpenseStatus = z.enum(['שולם', 'ממתין']);

export const zMessageThread = z.enum(['internal', 'contractor']);

export const zAlertType = z.enum(['warning', 'error', 'info', 'success']);

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
  'yard',
  'pool',
  'shelter',
  'cinema',
  'parking',
  'basement',
]);

export const zContractorRole = z.enum([
  'קבלן עד מפתח',
  'קבלן שלד',
  'קבלן עפר',
  'קבלן טיח',
  'חשמלאי ראשי',
  'אינסטלטור',
  'קבלן מיזוג',
  'קבלן ריצוף',
  'קבלן גג',
  'קבלן גבס',
  'קבלן נגרות',
  'צבעי',
  'קבלן גינה',
  'אחר',
]);

export const zContractorStatus = z.enum(['active', 'completed', 'pending']);

export const zPaymentSourceMode = z.enum(['stage_synced', 'custom']);

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
  ownerName: z.string().optional(),
  managerName: z.string().optional(),
  inspectorName: z.string().optional(),
  startDate: z.string(),
  expectedEnd: z.string(),
  floors: z.number().optional(),
  areaSqm: z.number().optional(),
  progressPct: z.number(),
  currentStageName: z.string().optional(),
  budgetTotal: z.number(),
  spent: z.number(),
  committed: z.number().optional(),
  totalWeeks: z.number().optional(),
  // Waste percentage applied to flooring qty calculations across the app.
  // Default 10 if unset.
  floorWastePct: z.number().optional(),
  hasBasement: z.boolean().optional(),
  hasYard: z.boolean().optional(),
  housingUnits: z.number().optional(),
  lastActivityAt: z.number().optional(),
  vatPct: z.number().optional(),
  managerCanViewBudget: z.boolean().optional(),
  inspectorCanViewBudget: z.boolean().optional(),
  managerCanViewSchedule: z.boolean().optional(),
  inspectorCanViewSchedule: z.boolean().optional(),
  inspectorCanViewArchivePhotos: z.boolean().optional(),
  inspectorCanViewArchiveDocs: z.boolean().optional(),
  managerCanViewArchivePhotos: z.boolean().optional(),
  managerCanViewArchiveDocs: z.boolean().optional(),
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
  receipts: z.array(z.string()).optional(),
  receiptName: z.string().optional(), // legacy
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
  dependsOnPrevious: z.boolean().optional(),
  contractorRole: z.string().optional(),
  contractorId: zid('contractors').optional(),
  supervisorApprovalBy: z.string().optional(),
  supervisorApprovalAt: z.string().optional(),
  extraProofPhotos: z.number().optional(), // legacy
  payment: zStagePayment,
};

export const zStageContractor = {
  projectId: zid('projects'),
  stageId: zid('stages'),
  contractorId: zid('contractors'),
  roleLabel: z.string().optional(),
  paymentMode: zPaymentSourceMode.optional(),
  sortOrder: z.number(),
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
  extraProofPhotos: z.number().optional(), // legacy
  paidAt: z.string().optional(),
  receipts: z.array(z.string()).optional(),
  receiptName: z.string().optional(), // legacy
  isLocked: z.boolean().optional(),
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
  userId: zid('users').optional(),
  includesVat: z.boolean().optional(),
  canViewBudget: z.boolean().optional(),
  canViewSchedule: z.boolean().optional(),
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
  partialPayments: z.array(z.object({
    id: z.string(),
    amount: z.number(),
    date: z.string(),
    expenseId: zid('expenses').optional(),
    note: z.string().optional(),
    fileIds: z.array(zid('projectFiles')).optional(),
  })).optional(),
  sourceMode: zPaymentSourceMode.optional(),
  sourceStageId: zid('stages').optional(),
  sourceStageMilestoneId: zid('stageMilestones').optional(),
  sourceTaskId: zid('stageTasks').optional(),
  isLocked: z.boolean().optional(),
  fileIds: z.array(zid('projectFiles')).optional(),
  vatAdded: z.boolean().optional(),
  vatAmount: z.number().optional(),
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
  notes: z.string().optional(),
  hint: z.string().optional(),
  status: zBoqStatus,
  source: zBoqSource,
  // Reference photo for the item
  imageUrl: z.string().optional(),
  projectFileId: zid('projectFiles').optional(),
  // Locked rows are auto-managed (e.g. per-room flooring) and cannot be
  // deleted or have their qty edited by users.
  isLocked: z.boolean().optional(),
  // Whether this row is "chosen" / active. Locked rows can be toggled off
  // (qty effectively 0) but never deleted. Default = true (enabled).
  isEnabled: z.boolean().optional(),
  paid: z.boolean().optional(),
  paidAt: z.string().optional(),
};

export const zDefectStatus = z.enum(['פתוח', 'בטיפול', 'תוקן', 'אושר']);
export const zPriority = z.enum(['נמוכה', 'רגילה', 'קריטית']);

export const zPhoto = {
  projectId: zid('projects'),
  legacyId: z.number().optional(),
  projectFileId: zid('projectFiles').optional(),
  takenOn: z.string(),
  stageId: zid('stages').optional(),
  stageLabel: z.string().optional(),
  location: z.string(),
  tag: zPhotoTag,
  label: z.string(),
  color: z.string().optional(),
  fileUrl: z.string().optional(),
  uploaderUserId: zid('users').optional(),
  // Snagging / Defect fields
  defectStatus: zDefectStatus.optional(),
  priority: zPriority.optional(),
  assigneeId: zid('contractors').optional(),
  dueDate: z.string().optional(),
};

export const zProjectFile = {
  projectId: zid('projects'),
  storageId: zid('_storage'),
  usage: zProjectFileUsage,
  kind: zProjectFileKind,
  originalName: z.string(),
  storedName: z.string(),
  originalMimeType: z.string(),
  storedMimeType: z.string(),
  originalSize: z.number(),
  storedSize: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  uploaderUserId: zid('users').optional(),
  contractorId: zid('contractors').optional(),
};

export const zProjectInvitation = {
  projectId: zid('projects'),
  code: z.string(),
  role: z.enum(['manager', 'inspector', 'contractor']),
  invitedEmail: z.string().optional(),
  invitedName: z.string().optional(),
  contractorId: zid('contractors').optional(),
  invitedByUserId: zid('users'),
  consumedByUserId: zid('users').optional(),
  consumedAt: z.number().optional(),
  expiresAt: z.number(),
  revokedAt: z.number().optional(),
  allowBudgetView: z.boolean().optional(),
  allowScheduleView: z.boolean().optional(),
  allowArchivePhotos: z.boolean().optional(),
  allowArchiveDocs: z.boolean().optional(),
};

export const zPersonalFile = {
  ownerUserId: zid('users'),
  // Optional during the one-time transition from the old global personal
  // archive. New files always receive a projectId.
  projectId: zid('projects').optional(),
  storageId: zid('_storage'),
  originalName: z.string(),
  storedName: z.string(),
  originalMimeType: z.string(),
  originalSize: z.number(),
  storedSize: z.number(),
  sectionId: z.string().optional(),
  note: z.string(),
  uploadedAt: z.number(),
};

export const zPhotoAnnotation = {
  photoId: zid('photos'),
  versionId: zid('photoFileVersions').optional(),
  type: zAnnotationType,
  x: z.number(),
  y: z.number(),
  w: z.number().optional(),
  h: z.number().optional(),
  r: z.number().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  color: z.string(),
  text: z.string().optional(),
};

export const zPhotoFileVersion = {
  photoId: zid('photos'),
  projectId: zid('projects'),
  sourceProjectFileId: zid('projectFiles').optional(),
  annotatedProjectFileId: zid('projectFiles'),
  versionNumber: z.number(),
  noteText: z.string().optional(),
  authorUserId: zid('users').optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  createdAt: z.string(),
};

export const zContractorNote = {
  projectId: zid('projects'),
  contractorId: zid('contractors'),
  authorUserId: zid('users').optional(),
  authorName: z.string(),
  role: zUserRole,
  text: z.string(),
};

export const zPhotoNote = {
  photoId: zid('photos'),
  versionId: zid('photoFileVersions').optional(),
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
  resolved: z.boolean().optional(),
  readAt: z.number().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  recipientContractorId: zid('contractors').optional(),
  // Directed 1:1 message between two internal users (e.g. owner <-> inspector).
  // When set, the message is a private DM and only visible to fromUserId/recipientUserId.
  recipientUserId: zid('users').optional(),
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
  stageId: zid('stages').optional(),
  stageMilestoneId: zid('stageMilestones').optional(),
  boqItemId: zid('boqItems').optional(),
  fileIds: z.array(zid('projectFiles')).optional(),
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
  projectFileId: zid('projectFiles').optional(),
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

export const zChecklist = {
  projectId: zid('projects'),
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(), // e.g. "שלד", "גמרים"
  sortOrder: z.number(),
  status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
  createdAt: z.number(),
};

export const zChecklistItem = {
  checklistId: zid('checklists'),
  text: z.string(),
  isCompleted: z.boolean().default(false),
  sortOrder: z.number(),
};

export const zPermitStatus = z.enum(['not_started', 'in_progress', 'approved', 'expired']);

export const zPermit = {
  projectId: zid('projects'),
  title: z.string(),
  authority: z.string().optional(),
  status: zPermitStatus,
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
  fileId: zid('_storage').optional(),
  sortOrder: z.number().optional(),
};

export const zDailyLog = {
  projectId: zid('projects'),
  date: z.string(),
  weather: z.string().optional(),
  temperature: z.string().optional(),
  status: z.enum(['draft', 'locked']),
  lockedBy: zid('users').optional(),
  lockedAt: z.number().optional(),
  createdBy: zid('users'),
  updatedAt: z.number(),

  workforce: z.array(z.object({
    contractorId: zid('contractors').optional(),
    contractorName: z.string().optional(),
    workersCount: z.number(),
    notes: z.string().optional()
  })),

  activities: z.array(z.object({
    description: z.string(),
    status: z.enum(['in_progress', 'completed', 'delayed']),
    contractorId: zid('contractors').optional(),
  })),

  deliveries: z.array(z.object({
    type: z.enum(['material', 'equipment']),
    description: z.string()
  })),

  issues: z.array(z.object({
    type: z.enum(['safety', 'delay', 'quality', 'other']),
    description: z.string(),
    financialImpact: z.boolean(),
    responsiblePartyId: zid('contractors').optional(),
  })),

  instructions: z.array(z.object({
    text: z.string(),
    givenToId: zid('contractors').optional(),
  })),

  images: z.array(z.object({
    storageId: zid('_storage'),
    url: z.string().optional() // Stored explicitly or resolved later
  })).optional(),
};

export const zOrderStatus = z.enum(['pending', 'partial', 'completed']);

export const zOrder = {
  projectId: zid('projects'),
  title: z.string(),
  supplier: z.string().optional(),
  status: zOrderStatus,
  orderedQuantity: z.number(),
  receivedQuantity: z.number().default(0),
  unit: z.string(),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  deliveryDocuments: z.array(z.object({
    storageId: zid('_storage'),
    name: z.string(),
  })).optional(),
};

export const zPromoCode = {
  code: z.string(),
  tier: z.enum(['pro', 'premium']),
  maxUses: z.number(),
  currentUses: z.number(),
  subscriptionDurationMonths: z.number(),
  expiresAt: z.number(),
};

export const zPromoRedemption = {
  promoCodeId: zid('promoCodes'),
  userId: zid('users'),
  redeemedAt: z.number(),
};

export const zProjectAlert = {
  projectId: zid('projects'),
  type: zAlertType,
  text: z.string(),
  isRead: z.boolean().default(false),
  dateLabel: z.string().optional(),
  createdAt: z.number(),
};

export const zSupportTicket = {
  userId: zid('users'),
  topic: z.enum(['bug', 'feature', 'billing', 'general', 'other']),
  message: z.string(),
  status: z.enum(['open', 'in-progress', 'resolved']),
  urlContext: z.string().optional(),
  resolvedAt: z.number().optional(),
};

export const zGuide = {
  title: z.string(),
  videoUrl: z.string(),
  duration: z.string().optional(),
  description: z.string(),
  topics: z.array(z.string()).optional(),
  tips: z.array(z.string()).optional(),
  faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  sortOrder: z.number().optional(),
};

export const zPushSubscription = {
  userId: zid('users'),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
};

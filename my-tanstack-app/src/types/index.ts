export interface Task {
  id: number;
  name: string;
  done: boolean;
  assignee: string;
  required?: boolean;
  paymentRequired?: boolean;
  paymentAmount?: number;
}

export interface Milestone {
  id: string;
  name: string;
  pct: number;
  taskIds: number[];
  amount: number;
  status: string;
  triggerText?: string;
  paid?: boolean;
  sortOrder?: number;
  supervisorApproval?: { by: string; at: string } | null;
  paidAt?: string | null;
  receipts?: string[];
  sourceMode?: 'stage_synced' | 'custom';
  sourceStageId?: string;
  sourceStageMilestoneId?: string;
  sourceTaskId?: string;
  readyToPay?: boolean;
  lockedReason?: string | null;
  isLocked?: boolean;
  files?: Array<{ id: string; url: string; name: string }>;
  vatAdded?: boolean;
  vatAmount?: number;
  partialPayments?: Array<{
    id: string;
    amount: number;
    date: string;
    expenseId?: string;
    note?: string;
  }>;
}

export interface Payment {
  amount: number;
  status: string;
  paidAt: string | null;
  receipts?: string[];
  milestones?: Milestone[];
}

export interface StageContractorRef {
  id: string;
  _id?: string;
  name: string;
  role?: string;
  company?: string;
  budget?: number;
  avatar?: string;
  color?: string;
  paymentMode?: 'stage_synced' | 'custom';
}

export interface Stage {
  id: number;
  name: string;
  status: string;
  progress: number;
  start: string;
  end: string;
  dependsOnPrevious?: boolean;
  contractor: string;
  contractorIds?: string[];
  contractors?: StageContractorRef[];
  icon: string;
  tasks: Task[];
  supervisorApproval?: { by: string; at: string } | null;
  payment?: Payment;
  hasSyncedContractorPayments?: boolean;
  linkedContractorBudgetTotal?: number;
  paymentAmountMismatch?: boolean;
  paymentMismatchReason?: string | null;
  contractorPaymentWarnings?: Array<{
    contractorId: string;
    contractorName: string;
    stagePaymentTotal: number;
    contractorBudget: number;
    reason: string;
  }>;
  contractorPayments?: Array<{
    contractorId: string;
    contractorName: string;
    milestones: Milestone[];
  }>;
}

export interface Project {
  name: string;
  address: string;
  owner: string;
  manager?: string;
  startDate: string;
  expectedEnd: string;
  floors?: number;
  housingUnits?: number;
  areaSqm?: number;
  progress: number;
  currentStage: string;
  budget: number;
  budgetTotal?: number;
  spent: number;
  committed: number;
}

export interface Contractor {
  id: number | string;
  _id?: string;
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  status: string;
  rating: number;
  budget: number;
  paid: number;
  avatar: string;
  color: string;
  avatarLetter?: string;
  avatarColor?: string;
  milestones?: Milestone[];
  paymentMode?: 'stage_synced' | 'custom';
  stageProgressPct?: number;
  stagePaymentTotal?: number;
  stagePaymentMismatch?: boolean;
  stagePaymentMismatchReason?: string | null;
  stages?: Array<{
    id: string;
    stageId?: string;
    name: string;
    status: string;
    progressPct: number;
    startDate: string;
    endDate: string;
    sortOrder: number;
    paymentMode?: 'stage_synced' | 'custom';
  }>;
  includesVat?: boolean;
}

export interface Room {
  uid: string;
  type: string;
  name: string;
  floor: number;
  size: number;
}

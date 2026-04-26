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
  supervisorApproval?: { by: string; at: string } | null;
  paidAt?: string | null;
  receipts?: string[];
}

export interface Payment {
  amount: number;
  status: string;
  paidAt: string | null;
  receipts?: string[];
  milestones?: Milestone[];
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
  icon: string;
  tasks: Task[];
  supervisorApproval?: { by: string; at: string } | null;
  payment?: Payment;
}

export interface Project {
  name: string;
  address: string;
  owner: string;
  startDate: string;
  expectedEnd: string;
  floors?: number;
  areaSqm?: number;
  progress: number;
  currentStage: string;
  budget: number;
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
}

export interface Room {
  uid: string;
  type: string;
  name: string;
  floor: number;
  size: number;
}

export interface Task {
  id: number;
  name: string;
  done: boolean;
  assignee: string;
  required?: boolean;
}

export interface Milestone {
  id: string;
  name: string;
  pct: number;
  taskIds: number[];
  amount: number;
  status: string;
  supervisorApproval?: { by: string; at: string } | null;
  extraProofPhotos?: number;
  paidAt?: string | null;
}

export interface Payment {
  amount: number;
  status: string;
  paidAt: string | null;
  milestones?: Milestone[];
}

export interface Stage {
  id: number;
  name: string;
  status: string;
  progress: number;
  start: string;
  end: string;
  contractor: string;
  icon: string;
  tasks: Task[];
  supervisorApproval?: { by: string; at: string } | null;
  payment?: Payment;
  extraProofPhotos?: number;
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
  id: number;
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
}

export interface Room {
  uid: string;
  type: string;
  name: string;
  floor: number;
  size: number;
}

export type ScenarioKey = "conservative" | "base" | "aggressive" | "exceptional";

export interface Profile {
  name: string;
  location: string;
  startDate: string; // ISO — career start (EY)
  currentPositionId: string;
  longTermGoal: string;
}

export interface Position {
  id: string;
  title: string;
  company: string;
  startYear: number;
  endYear: number;
  description: string;
  skills: string[];
  certifications: string[];
  requiredDeals: number;
  requiredModels: number;
  requiredMemos: number;
  requiredNetworkScore: number;
  compensation: number; // expected total comp (EUR) at this stage
  color: string;
}

export type SkillCategory =
  | "Technical"
  | "Transactions"
  | "Investing"
  | "Leadership"
  | "Origination";

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  level: number; // 0-100
  target: number; // 0-100
  notes: string;
  updatedAt: string;
  requires?: string[]; // names of prerequisite skills
}

export type DealType =
  | "M&A"
  | "LBO"
  | "Due Diligence"
  | "Investment Memo"
  | "Financial Model"
  | "Industry Research";

export type DealStatus = "Planned" | "In Progress" | "Completed" | "On Hold";

export interface Deal {
  id: string;
  name: string;
  type: DealType;
  date: string;
  industry: string;
  size: number; // EUR transaction / enterprise value
  description: string;
  status: DealStatus;
  lessons: string;
}

export type ContactCategory =
  | "Private Equity"
  | "Investment Banking"
  | "Corporate Finance"
  | "CEO"
  | "Founder"
  | "Lawyer"
  | "Accountant"
  | "LP Investor"
  | "Family Office"
  | "Consultant";

export interface Contact {
  id: string;
  name: string;
  firm: string;
  position: string;
  email: string;
  linkedin: string;
  category: ContactCategory;
  strength: number; // 1-10
  lastContact: string;
  nextFollowUp: string;
  notes: string;
}

export type EducationType =
  | "CFA"
  | "ACCA"
  | "MBA"
  | "Course"
  | "Certificate";

export type EducationStatus =
  | "Planned"
  | "In Progress"
  | "Completed"
  | "Passed";

export interface Education {
  id: string;
  name: string;
  type: EducationType;
  provider: string;
  progress: number; // 0-100
  deadline: string;
  status: EducationStatus;
  notes: string;
}

export interface CompYear {
  year: number;
  base: number;
  bonus: number;
  carry: number;
  coInvestment: number;
}

export interface AnnualNote {
  year: number;
  highlights: string;
  weaknesses: string;
  custom: string;
}

/* ----------------------- 3-Statement Trainer --------------------------- */
export interface PLData {
  revenue: number;
  cogs: number;
  // Operating expenses below gross profit (all excl. D&A):
  salaries: number; // wages, payroll, staff costs
  transport: number; // transport, logistics, distribution
  marketing: number; // marketing & selling
  opex: number; // other operating expenses (rent, admin, utilities, etc.)
  otherIncome: number;
  da: number; // depreciation & amortisation
  interest: number;
  tax: number;
}

export interface BSData {
  cash: number;
  receivables: number;
  inventory: number;
  otherCA: number;
  ppe: number;
  intangibles: number;
  otherNCA: number;
  payables: number;
  shortDebt: number;
  otherCL: number;
  longDebt: number;
  otherLTL: number;
  equity: number;
}

export interface StatementPeriod {
  id: string;
  label: string; // e.g. "FY2023" or "FY2026E"
  pl: PLData;
  bs: BSData;
  seasonality: number[]; // 12 monthly revenue weights
  segments: { name: string; value: number }[]; // revenue breakdown
  projected?: boolean; // true = analyst projection (not actuals)
  /** Line items exactly as reported in the SEC filing (1:1), keyed by label. */
  reported?: {
    is: Record<string, number>;
    bs: Record<string, number>;
  };
}

export interface StatementCase {
  id: string;
  name: string; // anonymised, e.g. "Business A"
  createdAt: string;
  currency: string;
  periods: StatementPeriod[];
  answers: Record<string, string>; // questionId -> user's answer
  guessSector: string;
  actualSector: string;
  actualBusiness: string;
  revealed: boolean;
  score: number; // self-assessed 0-100
  notes: string;
}

/* --------------------------- Training Academy -------------------------- */
export type TrainingCategory =
  | "Financial Modeling"
  | "Valuation"
  | "Accounting"
  | "LBO & PE"
  | "M&A"
  | "Excel";

export type TrainingStatus = "Not started" | "In Progress" | "Completed";

export interface TrainingResource {
  id: string;
  title: string;
  provider: string;
  category: TrainingCategory;
  url: string;
  cost: "Free" | "Freemium";
  description: string;
  status: TrainingStatus;
  progress: number; // 0-100
}

export interface AppState {
  profile: Profile;
  positions: Position[];
  skills: Skill[];
  deals: Deal[];
  contacts: Contact[];
  education: Education[];
  compensation: CompYear[];
  annualNotes: AnnualNote[];
  statementCases: StatementCase[];
  training: TrainingResource[];
  scenario: ScenarioKey;
  version: number;
}

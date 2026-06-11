import type { AppState, ScenarioKey } from "./types";
import { clamp } from "./utils";
import { statementProficiency } from "./statements";

export interface ScenarioConfig {
  key: ScenarioKey;
  label: string;
  description: string;
  /** Multiplier applied to total compensation. */
  compMultiplier: number;
  /** Additive bias to the partner-probability logit (in percentage points pre-squash). */
  probabilityBias: number;
  /** Expected end position title under this scenario. */
  expectedPosition: string;
  /** Expected lifetime deal count by 2041. */
  expectedDeals: number;
}

export const SCENARIOS: Record<ScenarioKey, ScenarioConfig> = {
  conservative: {
    key: "conservative",
    label: "Conservative",
    description:
      "Slower progression, one extra cycle per stage. Strong operator, never quite breaks into the partnership track.",
    compMultiplier: 0.72,
    probabilityBias: -22,
    expectedPosition: "Principal",
    expectedDeals: 38,
  },
  base: {
    key: "base",
    label: "Base Case",
    description:
      "The plan executes on schedule. CFA charter, clean buy-side move, steady deal sheet and a credible shot at Partner around 2040.",
    compMultiplier: 1,
    probabilityBias: 0,
    expectedPosition: "Partner (early)",
    expectedDeals: 55,
  },
  aggressive: {
    key: "aggressive",
    label: "Aggressive",
    description:
      "Fast-tracked. Early buy-side jump, strong origination, partner-track by mid-30s with meaningful carry.",
    compMultiplier: 1.45,
    probabilityBias: 16,
    expectedPosition: "Partner",
    expectedDeals: 68,
  },
  exceptional: {
    key: "exceptional",
    label: "Exceptional",
    description:
      "Top decile. Proprietary origination engine, raises a fund, becomes a name in CEE PE and a founding partner.",
    compMultiplier: 2.1,
    probabilityBias: 30,
    expectedPosition: "Founding / Senior Partner",
    expectedDeals: 85,
  },
};

export interface Factor {
  label: string;
  value: number; // normalized 0-100 contribution input
  weight: number; // 0-1
}

export interface Metrics {
  yearsExperience: number;
  dealsCompleted: number;
  dealsTotal: number;
  models: number;
  memos: number;
  contacts: number;
  networkScore: number;
  cfaProgress: number;
  avgSkill: number;
  technicalScore: number;
  leadershipScore: number;
  originationScore: number;
  statementProficiency: number;
  statementsCount: number;
  statementsCompleted: number;
  partnerReadiness: number;
  partnerProbability: number;
  factors: Factor[];
  overallProgress: number;
}

function avgSkillByCategory(state: AppState, categories: string[]): number {
  const rel = state.skills.filter((s) => categories.includes(s.category));
  if (rel.length === 0) return 0;
  return rel.reduce((a, s) => a + s.level, 0) / rel.length;
}

function skillsNamed(state: AppState, names: string[]): number {
  const rel = state.skills.filter((s) => names.includes(s.name));
  if (rel.length === 0) return 0;
  return rel.reduce((a, s) => a + s.level, 0) / rel.length;
}

export function computeMetrics(state: AppState): Metrics {
  const now = new Date();
  const start = new Date(state.profile.startDate);
  const yearsExperience = Math.max(
    0,
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  );

  const completed = state.deals.filter((d) => d.status === "Completed");
  const dealsCompleted = completed.length;
  const dealsTotal = state.deals.length;
  const models = state.deals.filter(
    (d) => d.type === "Financial Model" || d.type === "LBO"
  ).length;
  const memos = state.deals.filter((d) => d.type === "Investment Memo").length;
  const contacts = state.contacts.length;

  // Network score: weighted by relationship strength, scaled by breadth.
  const strengthSum = state.contacts.reduce((a, c) => a + c.strength, 0);
  const networkScore = clamp(
    Math.round(strengthSum * 1.6 + contacts * 1.2),
    0,
    100
  );

  const cfaItems = state.education.filter((e) => e.type === "CFA");
  const cfaProgress = cfaItems.length
    ? Math.round(
        cfaItems.reduce(
          (a, e) => a + (e.status === "Passed" ? 100 : e.progress),
          0
        ) / cfaItems.length
      )
    : 0;

  const avgSkill = state.skills.length
    ? state.skills.reduce((a, s) => a + s.level, 0) / state.skills.length
    : 0;

  const technicalScore = avgSkillByCategory(state, ["Technical", "Transactions"]);
  const leadershipScore = skillsNamed(state, [
    "Leadership",
    "Negotiation",
    "Portfolio Management",
  ]);
  const originationScore = skillsNamed(state, [
    "Deal Origination",
    "Fundraising",
    "Investor Relations",
    "Business Development",
  ]);

  const stmtProficiency = statementProficiency(state.statementCases || []);
  const statementsCount = (state.statementCases || []).length;
  const statementsCompleted = (state.statementCases || []).filter(
    (c) => c.revealed
  ).length;

  // Experience progress toward the 15-year partner horizon.
  const experienceProgress = clamp((yearsExperience / 15) * 100);

  // Deal volume progress toward the Partner target (55 deals).
  const dealProgress = clamp((dealsTotal / 55) * 100);
  const modelProgress = clamp((models / 65) * 100);

  // Partner readiness — weighted blend of every pillar.
  const readinessFactors: Factor[] = [
    { label: "Experience", value: experienceProgress, weight: 0.14 },
    { label: "CFA / Education", value: cfaProgress, weight: 0.1 },
    { label: "Technical mastery", value: technicalScore, weight: 0.14 },
    { label: "Statement fluency", value: stmtProficiency, weight: 0.12 },
    { label: "Deal track record", value: dealProgress, weight: 0.14 },
    { label: "Modelling output", value: modelProgress, weight: 0.06 },
    { label: "Network strength", value: networkScore, weight: 0.12 },
    { label: "Leadership", value: leadershipScore, weight: 0.08 },
    { label: "Origination & fundraising", value: originationScore, weight: 0.1 },
  ];
  const partnerReadiness = Math.round(
    readinessFactors.reduce((a, f) => a + f.value * f.weight, 0)
  );

  // Partner probability — logistic squash of a weighted score plus scenario bias.
  const rawScore =
    partnerReadiness * 0.55 +
    originationScore * 0.2 +
    leadershipScore * 0.15 +
    networkScore * 0.1;
  const bias = SCENARIOS[state.scenario].probabilityBias;
  // Center around ~52 so a fully-built profile lands high but not certain.
  const logit = (rawScore - 52 + bias) / 12;
  const partnerProbability = Math.round((1 / (1 + Math.exp(-logit))) * 100);

  const overallProgress = Math.round(
    experienceProgress * 0.2 +
      partnerReadiness * 0.5 +
      dealProgress * 0.15 +
      originationScore * 0.15
  );

  return {
    yearsExperience,
    dealsCompleted,
    dealsTotal,
    models,
    memos,
    contacts,
    networkScore,
    cfaProgress,
    avgSkill: Math.round(avgSkill),
    technicalScore: Math.round(technicalScore),
    leadershipScore: Math.round(leadershipScore),
    originationScore: Math.round(originationScore),
    statementProficiency: stmtProficiency,
    statementsCount,
    statementsCompleted,
    partnerReadiness,
    partnerProbability,
    factors: readinessFactors,
    overallProgress: clamp(overallProgress),
  };
}

export function currentPosition(state: AppState) {
  const year = new Date().getFullYear();
  const sorted = [...state.positions].sort((a, b) => a.startYear - b.startYear);
  const active =
    sorted.find((p) => year >= p.startYear && year < p.endYear) ||
    sorted.find((p) => p.id === state.profile.currentPositionId) ||
    sorted[0];
  return active;
}

export function nextPosition(state: AppState) {
  const cur = currentPosition(state);
  const sorted = [...state.positions].sort((a, b) => a.startYear - b.startYear);
  const idx = sorted.findIndex((p) => p.id === cur?.id);
  return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
}

import type { StatementPeriod, StatementCase, PLData, BSData } from "./types";
import { todayISO } from "./utils";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function emptyPL(): PLData {
  return { revenue: 0, cogs: 0, opex: 0, otherIncome: 0, da: 0, interest: 0, tax: 0 };
}

export function emptyBS(): BSData {
  return {
    cash: 0,
    receivables: 0,
    inventory: 0,
    otherCA: 0,
    ppe: 0,
    intangibles: 0,
    otherNCA: 0,
    payables: 0,
    shortDebt: 0,
    otherCL: 0,
    longDebt: 0,
    otherLTL: 0,
    equity: 0,
  };
}

export interface PeriodAnalysis {
  label: string;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  ebit: number;
  ebitMargin: number;
  pbt: number;
  netIncome: number;
  netMargin: number;
  // balance sheet
  totalCurrentAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebt: number;
  netDebt: number;
  workingCapital: number;
  currentRatio: number;
  netDebtToEbitda: number;
  // efficiency (days)
  dso: number;
  dio: number;
  dpo: number;
  cashConversionCycle: number;
  // returns
  roe: number;
  roa: number;
  balances: boolean;
  balanceGap: number;
}

function safeDiv(a: number, b: number): number {
  return b !== 0 ? a / b : 0;
}

export function analysePeriod(p: StatementPeriod): PeriodAnalysis {
  const { pl, bs } = p;
  const grossProfit = pl.revenue - pl.cogs;
  const ebitda = grossProfit - pl.opex + pl.otherIncome;
  const ebit = ebitda - pl.da;
  const pbt = ebit - pl.interest;
  const netIncome = pbt - pl.tax;

  const totalCurrentAssets = bs.cash + bs.receivables + bs.inventory + bs.otherCA;
  const totalAssets = totalCurrentAssets + bs.ppe + bs.intangibles + bs.otherNCA;
  const totalCurrentLiab = bs.payables + bs.shortDebt + bs.otherCL;
  const totalLiabilities = totalCurrentLiab + bs.longDebt + bs.otherLTL;
  const totalDebt = bs.shortDebt + bs.longDebt;
  const netDebt = totalDebt - bs.cash;
  const workingCapital = bs.receivables + bs.inventory - bs.payables;

  return {
    label: p.label,
    revenue: pl.revenue,
    grossProfit,
    grossMargin: safeDiv(grossProfit, pl.revenue) * 100,
    ebitda,
    ebitdaMargin: safeDiv(ebitda, pl.revenue) * 100,
    ebit,
    ebitMargin: safeDiv(ebit, pl.revenue) * 100,
    pbt,
    netIncome,
    netMargin: safeDiv(netIncome, pl.revenue) * 100,
    totalCurrentAssets,
    totalAssets,
    totalLiabilities,
    totalEquity: bs.equity,
    totalDebt,
    netDebt,
    workingCapital,
    currentRatio: safeDiv(totalCurrentAssets, totalCurrentLiab),
    netDebtToEbitda: safeDiv(netDebt, ebitda),
    dso: safeDiv(bs.receivables, pl.revenue) * 365,
    dio: safeDiv(bs.inventory, pl.cogs) * 365,
    dpo: safeDiv(bs.payables, pl.cogs) * 365,
    cashConversionCycle:
      safeDiv(bs.receivables, pl.revenue) * 365 +
      safeDiv(bs.inventory, pl.cogs) * 365 -
      safeDiv(bs.payables, pl.cogs) * 365,
    roe: safeDiv(netIncome, bs.equity) * 100,
    roa: safeDiv(netIncome, totalAssets) * 100,
    balances: Math.abs(totalAssets - (totalLiabilities + bs.equity)) < totalAssets * 0.01 + 1,
    balanceGap: totalAssets - (totalLiabilities + bs.equity),
  };
}

export interface CaseAnalysis {
  periods: PeriodAnalysis[];
  latest: PeriodAnalysis | null;
  prior: PeriodAnalysis | null;
  revenueCagr: number; // %
  ebitdaCagr: number; // %
  marginDelta: number; // ppt change in EBITDA margin latest vs first
  bridge: EbitdaBridge | null;
}

export interface EbitdaBridge {
  fromEbitda: number;
  toEbitda: number;
  volumeEffect: number; // revenue growth at prior EBITDA margin
  grossMarginEffect: number; // change in gross margin on new revenue
  opexLeverageEffect: number; // change in opex ratio
  otherEffect: number;
}

function cagr(start: number, end: number, periods: number): number {
  if (start <= 0 || periods <= 0) return 0;
  return (Math.pow(end / start, 1 / periods) - 1) * 100;
}

function buildBridge(prior: StatementPeriod, latest: StatementPeriod): EbitdaBridge {
  const a = analysePeriod(prior);
  const b = analysePeriod(latest);
  const priorMargin = safeDiv(a.ebitda, a.revenue);
  const dRev = b.revenue - a.revenue;
  const volumeEffect = dRev * priorMargin;
  const grossMarginEffect =
    (safeDiv(b.grossProfit, b.revenue) - safeDiv(a.grossProfit, a.revenue)) *
    b.revenue;
  const opexLeverageEffect =
    (safeDiv(a.ebitda, a.revenue) -
      safeDiv(b.grossProfit, b.revenue) -
      (safeDiv(a.ebitda, a.revenue) - safeDiv(a.grossProfit, a.revenue))) *
    0; // placeholder, refined below
  // Residual captures opex leverage + other items so the bridge reconciles.
  const explained = volumeEffect + grossMarginEffect;
  const otherEffect = b.ebitda - a.ebitda - explained;
  return {
    fromEbitda: a.ebitda,
    toEbitda: b.ebitda,
    volumeEffect,
    grossMarginEffect,
    opexLeverageEffect,
    otherEffect,
  };
}

export function analyseCase(c: StatementCase): CaseAnalysis {
  const periods = c.periods.map(analysePeriod);
  const latest = periods.length ? periods[periods.length - 1] : null;
  const prior = periods.length > 1 ? periods[periods.length - 2] : null;
  const n = periods.length;
  const revenueCagr =
    n > 1 ? cagr(periods[0].revenue, periods[n - 1].revenue, n - 1) : 0;
  const ebitdaCagr =
    n > 1 ? cagr(periods[0].ebitda, periods[n - 1].ebitda, n - 1) : 0;
  const marginDelta =
    n > 1 ? periods[n - 1].ebitdaMargin - periods[0].ebitdaMargin : 0;
  const bridge =
    c.periods.length > 1
      ? buildBridge(c.periods[c.periods.length - 2], c.periods[c.periods.length - 1])
      : null;
  return { periods, latest, prior, revenueCagr, ebitdaCagr, marginDelta, bridge };
}

/* ----------------------------- Projection ------------------------------ */
export interface ProjectedYear {
  label: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  netIncome: number;
}

export function projectForward(
  c: StatementCase,
  growthOverride: number | null,
  years = 3
): ProjectedYear[] {
  const a = analyseCase(c);
  if (!a.latest) return [];
  const g =
    growthOverride !== null
      ? growthOverride / 100
      : (a.revenueCagr || 5) / 100;
  const margin = (a.latest.ebitdaMargin || 0) / 100;
  const netMargin = (a.latest.netMargin || 0) / 100;
  const baseRev = a.latest.revenue;
  const startLabel = parseInt(
    (a.latest.label.match(/\d{4}/) || ["2024"])[0],
    10
  );
  const out: ProjectedYear[] = [];
  for (let i = 1; i <= years; i++) {
    const revenue = baseRev * Math.pow(1 + g, i);
    out.push({
      label: `${startLabel + i}E`,
      revenue,
      ebitda: revenue * margin,
      ebitdaMargin: margin * 100,
      netIncome: revenue * netMargin,
    });
  }
  return out;
}

/* ------------------------------ Quiz ----------------------------------- */
export interface QuizQuestion {
  id: string;
  question: string;
  hint: string; // EY-style data-driven talking point
  eyAngle: string;
}

function fmt(n: number, suffix = ""): string {
  if (!isFinite(n)) return "n/a";
  return `${n.toFixed(1)}${suffix}`;
}

export function buildQuiz(c: StatementCase): QuizQuestion[] {
  const a = analyseCase(c);
  const L = a.latest;
  if (!L) return [];

  const q: QuizQuestion[] = [];

  // 1 — Investment recommendation
  const growthVerdict =
    a.revenueCagr > 8 ? "strong top-line growth" : a.revenueCagr > 0 ? "modest growth" : "flat/declining revenue";
  const leverageVerdict =
    L.netDebtToEbitda > 4 ? "highly levered" : L.netDebtToEbitda > 2 ? "moderate leverage" : "low leverage / net cash";
  q.push({
    id: "recommendation",
    question:
      "Would you advise the investor to acquire this business? Build the bull and bear case.",
    hint: `Revenue CAGR ${fmt(a.revenueCagr, "%")}, EBITDA margin ${fmt(
      L.ebitdaMargin,
      "%"
    )} (${a.marginDelta >= 0 ? "+" : ""}${fmt(a.marginDelta, "ppt")} vs first year), Net debt/EBITDA ${fmt(
      L.netDebtToEbitda,
      "x"
    )}. Profile reads as ${growthVerdict} and ${leverageVerdict}.`,
    eyAngle:
      "Frame it as: quality of growth (organic vs price), margin durability, cash conversion, balance-sheet risk, and what could break the thesis.",
  });

  // 2 — Revenue source
  const segText =
    c.periods.at(-1)?.segments?.length
      ? c.periods
          .at(-1)!
          .segments.map((s) => `${s.name} ${fmt(safeDiv(s.value, c.periods.at(-1)!.segments.reduce((x, y) => x + y.value, 0)) * 100, "%")}`)
          .join(", ")
      : "no segment split entered";
  q.push({
    id: "revenue",
    question: "Where does the revenue come from, and how durable / concentrated is it?",
    hint: `Revenue ${fmt(L.revenue)}. Segment mix: ${segText}. Check concentration risk and which segment drives growth.`,
    eyAngle:
      "EY would test revenue by customer, product, geography and channel — recurring vs one-off, and the top-customer concentration.",
  });

  // 3 — EBITDA quality
  const marginDriver =
    a.bridge && Math.abs(a.bridge.grossMarginEffect) > Math.abs(a.bridge.otherEffect)
      ? "gross-margin (pricing / mix)"
      : "operating leverage / cost control";
  q.push({
    id: "ebitda",
    question:
      "Where is EBITDA margin higher or expanding — and is that expansion justified and sustainable?",
    hint: a.bridge
      ? `EBITDA moved from ${fmt(a.bridge.fromEbitda)} to ${fmt(
          a.bridge.toEbitda
        )}. Bridge: volume ${fmt(a.bridge.volumeEffect)}, gross-margin ${fmt(
          a.bridge.grossMarginEffect
        )}, opex/other ${fmt(a.bridge.otherEffect)}. Main driver looks like ${marginDriver}.`
      : `EBITDA margin ${fmt(L.ebitdaMargin, "%")}. Add a second year to decompose the change.`,
    eyAngle:
      "Normalise for one-offs (the 'quality of earnings'): are there non-recurring items, capitalised costs, or under-investment in opex inflating EBITDA?",
  });

  // 4 — Working capital & cash
  q.push({
    id: "workingcapital",
    question: "What does the working capital tell you about cash generation and risk?",
    hint: `DSO ${fmt(L.dso, "d")}, DIO ${fmt(L.dio, "d")}, DPO ${fmt(
      L.dpo,
      "d"
    )} → cash conversion cycle ${fmt(L.cashConversionCycle, "d")}. Current ratio ${fmt(
      L.currentRatio,
      "x"
    )}.`,
    eyAngle:
      "A lengthening cycle or receivables build can mask weakening demand or aggressive revenue recognition.",
  });

  // 5 — Seasonality
  const seas = c.periods.at(-1)?.seasonality || [];
  const peakIdx = seas.length ? seas.indexOf(Math.max(...seas)) : -1;
  q.push({
    id: "seasonality",
    question: "How seasonal is the business, and what does that imply for financing and WC?",
    hint:
      peakIdx >= 0
        ? `Revenue peaks around ${MONTHS[peakIdx]}. Seasonal peaks drive working-capital swings and may need a revolving facility.`
        : "Enter a monthly seasonality profile to analyse intra-year swings.",
    eyAngle:
      "Seasonality affects covenant timing, peak net debt, and how you read a part-year (LTM) number.",
  });

  // 6 — Valuation
  q.push({
    id: "valuation",
    question: "What EV/EBITDA multiple would you pay, and what does that imply for entry?",
    hint: `At EBITDA ${fmt(L.ebitda)}, every 1.0x of multiple = ${fmt(
      L.ebitda
    )} of EV. Net debt ${fmt(L.netDebt)} bridges EV to equity value.`,
    eyAngle:
      "Anchor to comparable transactions and trading comps for the sector, then adjust for growth, margin and risk.",
  });

  // 7 — Sector guess
  q.push({
    id: "sector",
    question:
      "Finally — which SECTOR and what kind of BUSINESS do you think this is? Justify it from the numbers.",
    hint: `Use the fingerprints: gross margin ${fmt(L.grossMargin, "%")} (high = software/services, low = retail/distribution), inventory days ${fmt(
      L.dio,
      "d"
    )} (high = manufacturing/retail, ~0 = services), capital intensity (PP&E ${fmt(
      safeDiv(c.periods.at(-1)!.bs.ppe, L.revenue) * 100,
      "% of revenue"
    )}), and seasonality.`,
    eyAngle:
      "Margin structure + asset intensity + working-capital shape is usually enough to fingerprint the sector.",
  });

  return q;
}

export function sumSegments(segs: { name: string; value: number }[]): number {
  return segs.reduce((a, s) => a + s.value, 0);
}

/**
 * Statement-reading proficiency (0-100). Rewards *completed* readings (sector
 * revealed) and the self-assessed score, with a small bump for total volume.
 * Open practice cases barely move it — you only get credit once you finish.
 */
export function statementProficiency(cases: StatementCase[]): number {
  if (!cases.length) return 0;
  const revealed = cases.filter((c) => c.revealed);
  const avgScore = revealed.length
    ? revealed.reduce((a, c) => a + c.score, 0) / revealed.length
    : 0;
  const base = Math.min(72, revealed.length * 14); // ~5 completed → 70
  const qualityBonus = avgScore * 0.28; // up to ~28 at a perfect avg score
  return Math.round(Math.min(100, base + qualityBonus));
}

export interface StreakInfo {
  current: number;
  total: number;
  todayDone: boolean;
  completed: number;
}

/** Daily-practice streak based on the createdAt date of each reading. */
export function computeStreak(cases: StatementCase[]): StreakInfo {
  const days = new Set(cases.map((c) => c.createdAt));
  const todayDone = days.has(todayISO());
  let streak = 0;
  const cursor = new Date();
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  // Walk backwards while each day has a reading.
  // Guard the loop so it can never run away.
  for (let i = 0; i < 3650; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    if (days.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return {
    current: streak,
    total: cases.length,
    todayDone,
    completed: cases.filter((c) => c.revealed).length,
  };
}

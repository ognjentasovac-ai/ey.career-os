import type { StatementPeriod, StatementCase, PLData, BSData } from "./types";
import { todayISO, eur } from "./utils";

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
  return {
    revenue: 0,
    cogs: 0,
    salaries: 0,
    transport: 0,
    marketing: 0,
    opex: 0,
    otherIncome: 0,
    da: 0,
    interest: 0,
    tax: 0,
  };
}

/** Total operating expenses below gross profit (excl. D&A). */
export function totalOpex(pl: PLData): number {
  return (
    (pl.salaries || 0) +
    (pl.transport || 0) +
    (pl.marketing || 0) +
    (pl.opex || 0)
  );
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
  const ebitda = grossProfit - totalOpex(pl) + pl.otherIncome;
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

export function yearOf(label: string): number {
  const m = label.match(/\d{4}/);
  return m ? +m[0] : 0;
}

export function analyseCase(c: StatementCase): CaseAnalysis {
  const sorted = [...c.periods].sort((a, b) => yearOf(a.label) - yearOf(b.label));
  const actualP = sorted.filter((p) => !p.projected);
  const periods = sorted.map(analysePeriod); // all (incl. projected) for charts
  const actuals = actualP.map(analysePeriod);
  const latest = actuals.length
    ? actuals[actuals.length - 1]
    : periods.length
    ? periods[periods.length - 1]
    : null;
  const prior = actuals.length > 1 ? actuals[actuals.length - 2] : null;
  const n = actuals.length;
  const revenueCagr =
    n > 1 ? cagr(actuals[0].revenue, actuals[n - 1].revenue, n - 1) : 0;
  const ebitdaCagr =
    n > 1 ? cagr(actuals[0].ebitda, actuals[n - 1].ebitda, n - 1) : 0;
  const marginDelta =
    n > 1 ? actuals[n - 1].ebitdaMargin - actuals[0].ebitdaMargin : 0;
  const bridge =
    actualP.length > 1
      ? buildBridge(actualP[actualP.length - 2], actualP[actualP.length - 1])
      : null;
  return { periods, latest, prior, revenueCagr, ebitdaCagr, marginDelta, bridge };
}

/**
 * Analyst-style 3-statement projection: extends the actual periods by `years`
 * with an integrated, balancing model. Revenue grows at the historical CAGR
 * (clamped); margins, cost ratios and working-capital days are held; debt is
 * held flat; equity rolls forward by retained earnings; cash is the balancing
 * plug — so the projected balance sheet always balances and the derived cash
 * flow reconciles exactly.
 */
export function projectPeriods(
  allPeriods: StatementPeriod[],
  years = 3
): StatementPeriod[] {
  const actuals = allPeriods
    .filter((p) => !p.projected)
    .sort((a, b) => yearOf(a.label) - yearOf(b.label));
  if (actuals.length < 1) return [];
  const L = actuals[actuals.length - 1];
  const a = analysePeriod(L);
  const rev0 = a.revenue || 1;
  const first = analysePeriod(actuals[0]);
  const nn = actuals.length;
  let g =
    nn > 1 && first.revenue > 0
      ? Math.pow(a.revenue / first.revenue, 1 / (nn - 1)) - 1
      : 0.05;
  g = Math.max(-0.1, Math.min(0.25, g));

  const gm = a.grossMargin / 100;
  const ratio = (x: number) => x / rev0;
  const salP = ratio(L.pl.salaries);
  const trP = ratio(L.pl.transport);
  const mkP = ratio(L.pl.marketing);
  const oxP = ratio(L.pl.opex);
  const daP = ratio(L.pl.da);
  const intP = ratio(L.pl.interest);
  const taxRate = a.pbt > 0 ? Math.max(0, Math.min(0.35, L.pl.tax / a.pbt)) : 0.18;
  const dso = a.dso,
    dio = a.dio,
    dpo = a.dpo;
  const ppeP = ratio(L.bs.ppe),
    intangP = ratio(L.bs.intangibles),
    oCAp = ratio(L.bs.otherCA),
    oNCAp = ratio(L.bs.otherNCA),
    oCLp = ratio(L.bs.otherCL),
    oLTLp = ratio(L.bs.otherLTL);
  const shortDebt = L.bs.shortDebt,
    longDebt = L.bs.longDebt;
  const payout = 0.3;

  const startYear = yearOf(L.label);
  const out: StatementPeriod[] = [];
  let prevEquity = L.bs.equity;
  for (let i = 1; i <= years; i++) {
    const rev = rev0 * Math.pow(1 + g, i);
    const cogs = rev * (1 - gm);
    const salaries = rev * salP,
      transport = rev * trP,
      marketing = rev * mkP,
      opex = rev * oxP;
    const da = rev * daP,
      interest = rev * intP;
    const ebitda = rev - cogs - salaries - transport - marketing - opex;
    const ebit = ebitda - da;
    const pbt = ebit - interest;
    const tax = pbt > 0 ? pbt * taxRate : 0;
    const ni = pbt - tax;
    const pl: PLData = {
      revenue: rnd(rev),
      cogs: rnd(cogs),
      salaries: rnd(salaries),
      transport: rnd(transport),
      marketing: rnd(marketing),
      opex: rnd(opex),
      otherIncome: 0,
      da: rnd(da),
      interest: rnd(interest),
      tax: rnd(tax),
    };
    const receivables = (rev * dso) / 365;
    const inventory = (cogs * dio) / 365;
    const payables = (cogs * dpo) / 365;
    const ppe = rev * ppeP,
      intangibles = rev * intangP,
      otherCA = rev * oCAp,
      otherNCA = rev * oNCAp,
      otherCL = rev * oCLp,
      otherLTL = rev * oLTLp;
    const equity = prevEquity + ni * (1 - payout);
    prevEquity = equity;
    const nonCashAssets =
      receivables + inventory + otherCA + ppe + intangibles + otherNCA;
    const liab = payables + shortDebt + otherCL + longDebt + otherLTL;
    const cash = liab + equity - nonCashAssets; // balancing plug
    const bs: BSData = {
      cash: rnd(cash),
      receivables: rnd(receivables),
      inventory: rnd(inventory),
      otherCA: rnd(otherCA),
      ppe: rnd(ppe),
      intangibles: rnd(intangibles),
      otherNCA: rnd(otherNCA),
      payables: rnd(payables),
      shortDebt: rnd(shortDebt),
      otherCL: rnd(otherCL),
      longDebt: rnd(longDebt),
      otherLTL: rnd(otherLTL),
      equity: rnd(equity),
    };
    out.push({
      id: `${L.id}_proj${i}`,
      label: `FY${startYear + i}E`,
      pl,
      bs,
      seasonality: L.seasonality,
      segments: L.segments.map((s) => ({
        name: s.name,
        value: rnd((s.value / rev0) * rev),
      })),
      projected: true,
    });
  }
  return out;
}

/** Appends a 3-year projection to a case if it has actuals but no projections. */
export function withProjection(c: StatementCase, years = 3): StatementCase {
  if (c.periods.some((p) => p.projected)) return c;
  const proj = projectPeriods(c.periods, years);
  if (!proj.length) return c;
  return { ...c, periods: [...c.periods, ...proj] };
}

/* ----------------------- Cash flow (indirect) -------------------------- */
export interface CashFlowRow {
  label: string;
  projected: boolean;
  netIncome: number;
  da: number;
  deltaWC: number;
  operating: number;
  capex: number;
  otherInvesting: number;
  investing: number;
  debtFlow: number;
  equityFlow: number;
  financing: number;
  netChange: number;
  closingCash: number;
}

/**
 * Indirect-method cash flow derived from period-over-period P&L + balance-sheet
 * movements. By construction the net change in cash reconciles exactly to the
 * change in the cash line — this is the linkage that ties the 3 statements.
 */
export function caseCashFlows(periods: StatementPeriod[]): CashFlowRow[] {
  const sorted = [...periods].sort((a, b) => yearOf(a.label) - yearOf(b.label));
  const rows: CashFlowRow[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = sorted[i - 1];
    const a = analysePeriod(p);
    const ni = a.netIncome;
    const da = p.pl.da;
    const dRec = p.bs.receivables - prev.bs.receivables;
    const dInv = p.bs.inventory - prev.bs.inventory;
    const dPay = p.bs.payables - prev.bs.payables;
    const dOCA = p.bs.otherCA - prev.bs.otherCA;
    const dOCL = p.bs.otherCL - prev.bs.otherCL;
    const deltaWC = -dRec - dInv - dOCA + dPay + dOCL;
    const operating = ni + da + deltaWC;
    const capex = -((p.bs.ppe - prev.bs.ppe) + da);
    const otherInvesting = -(
      p.bs.intangibles -
      prev.bs.intangibles +
      (p.bs.otherNCA - prev.bs.otherNCA)
    );
    const investing = capex + otherInvesting;
    const debtFlow =
      p.bs.shortDebt +
      p.bs.longDebt -
      (prev.bs.shortDebt + prev.bs.longDebt) +
      (p.bs.otherLTL - prev.bs.otherLTL);
    const equityFlow = p.bs.equity - prev.bs.equity - ni;
    const financing = debtFlow + equityFlow;
    const netChange = operating + investing + financing;
    rows.push({
      label: p.label,
      projected: !!p.projected,
      netIncome: ni,
      da,
      deltaWC,
      operating,
      capex,
      otherInvesting,
      investing,
      debtFlow,
      equityFlow,
      financing,
      netChange,
      closingCash: p.bs.cash,
    });
  }
  return rows;
}

function rnd(x: number): number {
  return Math.round(x);
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

/* ------------------- Full 3-statement projection ----------------------- */
/**
 * Projects full P&L + balance sheet forward for `years`, holding the latest
 * historical ratios constant, rolling equity forward with retained earnings and
 * using cash (with a revolver fallback) as the balancing plug. Returns fully
 * balanced StatementPeriods labelled "FY####E".
 */
export function projectStatements(
  periods: StatementPeriod[],
  growthOverride: number | null,
  years = 3
): StatementPeriod[] {
  if (periods.length === 0) return [];
  const last = periods[periods.length - 1];
  const n = periods.length;
  let g =
    growthOverride !== null
      ? growthOverride / 100
      : n > 1 && periods[0].pl.revenue > 0
      ? Math.pow(last.pl.revenue / periods[0].pl.revenue, 1 / (n - 1)) - 1
      : 0.05;
  g = Math.max(-0.2, Math.min(0.4, g));

  const la = analysePeriod(last);
  const rev0 = last.pl.revenue || 1;
  const grossM = (last.pl.revenue - last.pl.cogs) / rev0;
  const salR = last.pl.salaries / rev0;
  const trR = last.pl.transport / rev0;
  const mkR = last.pl.marketing / rev0;
  const oxR = last.pl.opex / rev0;
  const daR = last.pl.da / rev0;
  const intR = last.pl.interest / rev0;
  const taxR = last.pl.tax / rev0;
  const dso = la.dso;
  const dio = la.dio;
  const dpo = la.dpo;
  const otherCAR = last.bs.otherCA / rev0;
  const ppeR = last.bs.ppe / rev0;
  const otherNCAR = last.bs.otherNCA / rev0;
  const otherCLR = last.bs.otherCL / rev0;
  const otherLTLR = last.bs.otherLTL / rev0;
  const startYear = parseInt((last.label.match(/\d{4}/) || ["2024"])[0], 10);
  const segShare = last.segments.map((s) => ({
    name: s.name,
    share: s.value / rev0,
  }));

  const out: StatementPeriod[] = [];
  let prev = last;
  for (let i = 1; i <= years; i++) {
    const revenue = prev.pl.revenue * (1 + g);
    const cogs = revenue * (1 - grossM);
    const salaries = revenue * salR;
    const transport = revenue * trR;
    const marketing = revenue * mkR;
    const opex = revenue * oxR;
    const da = revenue * daR;
    const interest = revenue * intR;
    const ebitda = revenue - cogs - salaries - transport - marketing - opex;
    const pbt = ebitda - da - interest;
    const tax = revenue * taxR;
    const netIncome = pbt - tax;

    const receivables = (revenue * dso) / 365;
    const inventory = (cogs * dio) / 365;
    const payables = (cogs * dpo) / 365;
    const otherCA = revenue * otherCAR;
    const ppe = revenue * ppeR;
    const intangibles = prev.bs.intangibles; // hold acquired intangibles flat
    const otherNCA = revenue * otherNCAR;
    let shortDebt = prev.bs.shortDebt;
    const longDebt = prev.bs.longDebt;
    const otherCL = revenue * otherCLR;
    const otherLTL = revenue * otherLTLR;
    const equity = prev.bs.equity + netIncome * 0.6; // retain 60%, 40% payout
    const nonCashAssets =
      receivables + inventory + otherCA + ppe + intangibles + otherNCA;
    let cash =
      equity + payables + shortDebt + otherCL + longDebt + otherLTL - nonCashAssets;
    if (cash < 0) {
      shortDebt += -cash; // revolver draw to fund the gap
      cash = 0;
    }

    const r = Math.round;
    const period: StatementPeriod = {
      id: `proj_${startYear + i}`,
      label: `FY${startYear + i}E`,
      pl: {
        revenue: r(revenue),
        cogs: r(cogs),
        salaries: r(salaries),
        transport: r(transport),
        marketing: r(marketing),
        opex: r(opex),
        otherIncome: 0,
        da: r(da),
        interest: r(interest),
        tax: r(tax),
      },
      bs: {
        cash: r(cash),
        receivables: r(receivables),
        inventory: r(inventory),
        otherCA: r(otherCA),
        ppe: r(ppe),
        intangibles: r(intangibles),
        otherNCA: r(otherNCA),
        payables: r(payables),
        shortDebt: r(shortDebt),
        otherCL: r(otherCL),
        longDebt: r(longDebt),
        otherLTL: r(otherLTL),
        equity: r(equity),
      },
      seasonality: last.seasonality,
      segments: segShare.map((s) => ({ name: s.name, value: r(revenue * s.share) })),
    };
    out.push(period);
    prev = period;
  }
  return out;
}

/** Historical + 3 projected periods, plus the index where projections start. */
export function fullSeries(
  c: StatementCase,
  growthOverride: number | null = null
): { periods: StatementPeriod[]; projFrom: number } {
  const proj = projectStatements(c.periods, growthOverride, 3);
  return {
    periods: [...c.periods, ...proj],
    projFrom: c.periods.length,
  };
}

/* --------------------------- Cash flow --------------------------------- */
export interface CashFlow {
  label: string;
  netIncome: number;
  da: number;
  changeWC: number; // cash impact of working-capital change (+ = source)
  cfo: number;
  capex: number;
  changeIntangibles: number;
  cfi: number;
  changeDebt: number;
  equityFlows: number; // dividends/buybacks/issuance (net)
  cff: number;
  netChange: number;
  endCash: number;
  fcf: number; // CFO - capex
}

/** Indirect-method cash flow from two consecutive balance sheets + the P&L. */
export function computeCashFlow(
  prev: StatementPeriod,
  curr: StatementPeriod
): CashFlow {
  const ni = analysePeriod(curr).netIncome;
  const da = curr.pl.da;
  const dRec = curr.bs.receivables - prev.bs.receivables;
  const dInv = curr.bs.inventory - prev.bs.inventory;
  const dPay = curr.bs.payables - prev.bs.payables;
  const dOtherCA = curr.bs.otherCA - prev.bs.otherCA;
  const dOtherCL = curr.bs.otherCL - prev.bs.otherCL;
  const changeWC = -dRec - dInv + dPay - dOtherCA + dOtherCL;
  const cfo = ni + da + changeWC;

  const capex = curr.bs.ppe - prev.bs.ppe + da; // PP&E roll-forward
  const dIntang = curr.bs.intangibles - prev.bs.intangibles;
  const dOtherNCA = curr.bs.otherNCA - prev.bs.otherNCA;
  const cfi = -capex - dIntang - dOtherNCA;

  const dShort = curr.bs.shortDebt - prev.bs.shortDebt;
  const dLong = curr.bs.longDebt - prev.bs.longDebt;
  const dOtherLTL = curr.bs.otherLTL - prev.bs.otherLTL;
  const equityFlows = curr.bs.equity - prev.bs.equity - ni; // dividends/buybacks/issuance
  const cff = dShort + dLong + dOtherLTL + equityFlows;

  return {
    label: curr.label,
    netIncome: ni,
    da,
    changeWC,
    cfo,
    capex,
    changeIntangibles: dIntang,
    cfi,
    changeDebt: dShort + dLong,
    equityFlows,
    cff,
    netChange: cfo + cfi + cff,
    endCash: curr.bs.cash,
    fcf: cfo - capex,
  };
}

/* ------------------------------ Quiz ----------------------------------- */
export type QuizGradeKind = "buy" | "direction" | "sector" | "open";

export interface QuizQuestion {
  id: string;
  question: string;
  hint: string; // EY-style data-driven talking point
  eyAngle: string;
  correct: string; // the conclusion the numbers actually support
  reasoning: string; // how that conclusion was reached, step by step
  gradeKind: QuizGradeKind; // how the typed answer is checked
}

export type GradeStatus = "correct" | "partial" | "incorrect" | "self";
export interface GradeResult {
  status: GradeStatus;
  message: string;
}

/** Check a typed answer against the data-derived correct conclusion. */
export function gradeQuizAnswer(
  q: QuizQuestion,
  userRaw: string,
  c: StatementCase
): GradeResult {
  const user = (userRaw || "").toLowerCase().trim();
  if (!user)
    return { status: "self", message: "Type your answer first, then check it." };

  if (q.gradeKind === "buy") {
    const wantsBuy = q.correct.toUpperCase().includes("BUY");
    const borderline = q.correct.toUpperCase().includes("BORDERLINE");
    const saidBuy = /\b(buy|long|kupi|kupovina|acquire|invest)\b/.test(user);
    const saidPass = /\b(pass|walk|avoid|sell|short|skip|izbegni|odustani)\b/.test(user);
    if (!saidBuy && !saidPass)
      return { status: "self", message: `State a clear BUY or PASS to be graded. The data leans: ${q.correct}.` };
    const userBuy = saidBuy && !saidPass;
    if (borderline)
      return { status: "partial", message: `Defensible either way — ${q.correct}.` };
    if ((wantsBuy && userBuy) || (!wantsBuy && saidPass && !saidBuy))
      return { status: "correct", message: `On the money — the numbers support ${q.correct}.` };
    return { status: "incorrect", message: `The data leans the other way: ${q.correct}.` };
  }

  if (q.gradeKind === "direction") {
    const target = q.correct.toUpperCase();
    const saidUp = /\b(grow|growing|rising|up|increas|rast|raste|expand)\b/.test(user);
    const saidDown = /\b(declin|shrink|falling|down|decreas|pad|opada|contract)\b/.test(user);
    const saidFlat = /\b(flat|stable|stagnant|ravn|stabiln)\b/.test(user);
    const userDir =
      saidUp && !saidDown ? "GROWING" : saidDown && !saidUp ? "DECLINING" : saidFlat ? "FLAT" : "";
    if (!userDir)
      return { status: "self", message: `Say growing, declining or flat. Correct: ${q.correct}.` };
    if (target.includes(userDir))
      return { status: "correct", message: `Correct — ${q.correct}.` };
    return { status: "incorrect", message: `Not quite — ${q.correct}.` };
  }

  if (q.gradeKind === "sector") {
    const actual = `${c.actualSector || ""} ${c.actualBusiness || ""}`.toLowerCase();
    if (!actual.trim())
      return { status: "self", message: "No answer key set for this case — compare with 'Reveal the answer' below." };
    const tokens = actual.split(/[^a-zčćđšž0-9]+/i).filter((t) => t.length > 3);
    const hit = tokens.some((t) => user.includes(t));
    const label = `${c.actualSector}${c.actualBusiness ? " · " + c.actualBusiness : ""}`;
    return hit
      ? { status: "correct", message: `Match — actual: ${label}.` }
      : { status: "incorrect", message: `Off — actual: ${label}.` };
  }

  // open-ended — self-checked against the model conclusion
  return { status: "self", message: q.correct };
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
  const lp = c.periods[c.periods.length - 1].pl;
  const rev = lp.revenue || 1;
  const pctOf = (x: number) => (x / rev) * 100;

  // Biggest segment mover between the last two periods.
  const lastSeg = c.periods[c.periods.length - 1].segments || [];
  const prevSeg =
    c.periods.length > 1 ? c.periods[c.periods.length - 2].segments || [] : [];
  let mover = "";
  if (lastSeg.length && prevSeg.length) {
    let best: { name: string; g: number } | null = null;
    for (const s of lastSeg) {
      const prev = prevSeg.find((x) => x.name === s.name);
      if (prev && prev.value) {
        const g = ((s.value - prev.value) / prev.value) * 100;
        if (!best || Math.abs(g) > Math.abs(best.g)) best = { name: s.name, g };
      }
    }
    if (best) mover = `${best.name} (${best.g >= 0 ? "+" : ""}${best.g.toFixed(0)}%)`;
  }

  // 1 — Investment recommendation (EY: should the investor buy?)
  const growthVerdict =
    a.revenueCagr > 8 ? "strong top-line growth" : a.revenueCagr > 0 ? "modest growth" : "flat/declining revenue";
  const leverageVerdict =
    L.netDebtToEbitda > 4 ? "highly levered" : L.netDebtToEbitda > 2 ? "moderate leverage" : "low leverage / net cash";
  // Score the buy case from the fundamentals.
  let buyScore = 0;
  if (a.revenueCagr > 8) buyScore += 2;
  else if (a.revenueCagr > 0) buyScore += 1;
  else buyScore -= 1;
  if (a.marginDelta > 0) buyScore += 1;
  else if (a.marginDelta < -1) buyScore -= 1;
  if (L.netDebtToEbitda < 2) buyScore += 1;
  else if (L.netDebtToEbitda > 4) buyScore -= 2;
  if (!L.balances) buyScore -= 1;
  const buyVerdict = buyScore >= 2 ? "BUY" : buyScore <= 0 ? "PASS" : "BORDERLINE";
  q.push({
    id: "recommendation",
    question:
      "EY view — should the investor BUY this business or walk away? Build the bull and bear case and give a clear verdict.",
    hint: `Revenue CAGR ${fmt(a.revenueCagr, "%")}, EBITDA margin ${fmt(
      L.ebitdaMargin,
      "%"
    )} (${a.marginDelta >= 0 ? "+" : ""}${fmt(a.marginDelta, "ppt")} vs first year), Net debt/EBITDA ${fmt(
      L.netDebtToEbitda,
      "x"
    )}. Profile reads as ${growthVerdict} and ${leverageVerdict}.`,
    eyAngle:
      "Frame it as: quality of growth (organic vs price), margin durability, cash conversion, balance-sheet risk, and what could break the thesis. End with a Buy / Pass call.",
    correct: `Lean ${buyVerdict}`,
    reasoning: `Growth: ${growthVerdict} (CAGR ${fmt(a.revenueCagr, "%")}). Margin: ${
      a.marginDelta >= 0 ? "expanding" : "compressing"
    } (${a.marginDelta >= 0 ? "+" : ""}${fmt(a.marginDelta, "ppt")}). Balance sheet: ${leverageVerdict} (${fmt(
      L.netDebtToEbitda,
      "x"
    )}) and it ${L.balances ? "balances" : "does NOT balance — a flag"}. Net those signals out and the case leans ${buyVerdict}.`,
    gradeKind: "buy",
  });

  // 2 — Growth or decline drivers + projection direction
  const dir =
    a.revenueCagr > 1 ? "GROWING" : a.revenueCagr < -1 ? "DECLINING" : "broadly FLAT";
  const ebitdaDir =
    a.ebitdaCagr > 1 ? "rising" : a.ebitdaCagr < -1 ? "falling" : "flat";
  q.push({
    id: "growth",
    question:
      "What is the company growing — or shrinking — on the back of? Is the trend structural or temporary, and where do you project the next 3 years (up or down)?",
    hint: `Revenue is ${dir} at ${fmt(a.revenueCagr, "%")} CAGR; EBITDA is ${ebitdaDir} (${fmt(
      a.ebitdaCagr,
      "%"
    )}). Margin ${a.marginDelta >= 0 ? "expanded" : "compressed"} ${fmt(
      Math.abs(a.marginDelta),
      "ppt"
    )}. Biggest segment move: ${mover || "add segments to see"}.`,
    eyAngle:
      "Separate volume vs price vs mix. Decide if the driver is structural (market growth, share gains, new products) or cyclical/one-off — that decides whether you project continued growth or a decline. Use the Projection tab to test both.",
    correct: `Revenue is ${dir} (EBITDA ${ebitdaDir})`,
    reasoning: `Revenue CAGR is ${fmt(a.revenueCagr, "%")} → ${dir}. EBITDA CAGR ${fmt(
      a.ebitdaCagr,
      "%"
    )} → ${ebitdaDir}, with margin ${a.marginDelta >= 0 ? "up" : "down"} ${fmt(
      Math.abs(a.marginDelta),
      "ppt"
    )}. ${mover ? `Biggest segment move: ${mover}.` : ""} ${
      a.ebitdaCagr > a.revenueCagr
        ? "EBITDA outpacing revenue signals operating leverage."
        : "EBITDA lagging revenue signals margin pressure."
    }`,
    gradeKind: "direction",
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
    correct: `Revenue ${fmt(L.revenue)} — mix: ${segText}`,
    reasoning: `The segment split shows ${segText}. The largest slice is the concentration risk; the fastest-growing slice (${
      mover || "n/a"
    }) is what's actually driving the top line. Durable if recurring and spread across customers; risky if one segment or a few customers dominate.`,
    gradeKind: "open",
  });

  // Cost structure — where does the money go?
  q.push({
    id: "costs",
    question:
      "Where does the money go? Walk through the cost structure — COGS, salaries, transport, marketing and other opex — and the operating-leverage potential.",
    hint: `As % of revenue: COGS ${fmt(pctOf(lp.cogs), "%")}, salaries ${fmt(
      pctOf(lp.salaries),
      "%"
    )}, transport ${fmt(pctOf(lp.transport), "%")}, marketing ${fmt(
      pctOf(lp.marketing),
      "%"
    )}, other opex ${fmt(pctOf(lp.opex), "%")}. Largest cost base after COGS: ${
      lp.salaries >= lp.transport && lp.salaries >= lp.opex
        ? "salaries"
        : lp.transport >= lp.opex
        ? "transport / logistics"
        : "other opex"
    }.`,
    eyAngle:
      "Split fixed vs variable. A heavy fixed base (payroll, transport fleet, rent) means EBITDA swings hard with volume — central to the downside case. Identify the cost levers a PE owner could pull.",
    correct: `COGS ${fmt(pctOf(lp.cogs), "%")} of revenue is the dominant cost; largest opex line after it is ${
      lp.salaries >= lp.transport && lp.salaries >= lp.opex
        ? "salaries"
        : lp.transport >= lp.opex
        ? "transport / logistics"
        : "other opex"
    }`,
    reasoning: `As % of revenue: COGS ${fmt(pctOf(lp.cogs), "%")}, salaries ${fmt(
      pctOf(lp.salaries),
      "%"
    )}, transport ${fmt(pctOf(lp.transport), "%")}, marketing ${fmt(pctOf(lp.marketing), "%")}, other ${fmt(
      pctOf(lp.opex),
      "%"
    )}. A high COGS share = thin gross margin and volume-driven model; a high payroll/transport share = fixed base that magnifies operating leverage.`,
    gradeKind: "open",
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
    correct: a.bridge
      ? `Margin move driven mainly by ${marginDriver}`
      : `EBITDA margin ${fmt(L.ebitdaMargin, "%")} — add a second year to decompose`,
    reasoning: a.bridge
      ? `Bridge from ${fmt(a.bridge.fromEbitda)} to ${fmt(a.bridge.toEbitda)}: volume ${fmt(
          a.bridge.volumeEffect
        )}, gross-margin ${fmt(a.bridge.grossMarginEffect)}, opex/other ${fmt(
          a.bridge.otherEffect
        )}. The largest term is ${marginDriver}, so that's the driver. Sustainable only if it's pricing/mix or genuine efficiency — not under-spend or one-offs.`
      : `Only one period entered, so the change can't be decomposed. Add a prior year to split volume vs margin vs opex.`,
    gradeKind: "open",
  });

  // Red flags / deal-breakers (EY quality-of-earnings lens)
  const conc =
    lastSeg.length && sumSegments(lastSeg) > 0
      ? Math.max(...lastSeg.map((s) => (s.value / sumSegments(lastSeg)) * 100))
      : 0;
  q.push({
    id: "redflags",
    question:
      "From EY's quality-of-earnings lens, what are the red flags or deal-breakers that could kill this acquisition?",
    hint: `Net debt/EBITDA ${fmt(L.netDebtToEbitda, "x")}, current ratio ${fmt(
      L.currentRatio,
      "x"
    )}, cash cycle ${fmt(L.cashConversionCycle, "d")}. Top segment is ${fmt(
      conc,
      "%"
    )} of revenue (concentration). ${
      L.balances ? "Balance sheet balances." : "Balance sheet does NOT balance — investigate."
    } Net debt ${eur(L.netDebt)}.`,
    eyAngle:
      "QoE normalises EBITDA for one-offs, owner add-backs and accounting choices — the 'clean' number is what a buyer actually pays a multiple on. Probe receivables build, customer concentration, capex needs and covenant headroom.",
    correct: [
      L.netDebtToEbitda > 4 ? "high leverage" : null,
      conc > 50 ? `customer/segment concentration (${fmt(conc, "%")})` : null,
      L.currentRatio < 1 ? "weak liquidity (current ratio < 1)" : null,
      L.cashConversionCycle > 90 ? "long cash cycle" : null,
      !L.balances ? "balance sheet does not balance" : null,
    ]
      .filter(Boolean)
      .join("; ") || "No headline red flags in the ratios — probe one-offs & capex",
    reasoning: `Net debt/EBITDA ${fmt(L.netDebtToEbitda, "x")}, current ratio ${fmt(
      L.currentRatio,
      "x"
    )}, cash cycle ${fmt(L.cashConversionCycle, "d")}, top segment ${fmt(conc, "%")} of revenue. ${
      L.balances ? "Balance sheet balances." : "Balance sheet does NOT balance — investigate first."
    } Each ratio breaching its threshold (leverage > 4x, current < 1x, concentration > 50%, cycle > 90d) is a deal-breaker to escalate.`,
    gradeKind: "open",
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
    correct:
      L.cashConversionCycle < 0
        ? "Negative cash cycle — the business is funded by suppliers (cash-generative)"
        : L.cashConversionCycle > 90
        ? "Long cash cycle ties up cash — working capital is a drag"
        : "Moderate cash cycle — broadly self-funding",
    reasoning: `DSO ${fmt(L.dso, "d")} + DIO ${fmt(L.dio, "d")} − DPO ${fmt(
      L.dpo,
      "d"
    )} = cash conversion cycle ${fmt(L.cashConversionCycle, "d")}. ${
      L.cashConversionCycle < 0
        ? "Negative means suppliers fund operations — strong cash quality."
        : "Positive means cash is locked in receivables + inventory; the longer it is, the more growth eats cash."
    } Current ratio ${fmt(L.currentRatio, "x")} confirms short-term cover.`,
    gradeKind: "open",
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
    correct:
      peakIdx >= 0
        ? `Revenue peaks around ${MONTHS[peakIdx]} — needs a revolver for the seasonal swing`
        : "No seasonality profile entered",
    reasoning:
      peakIdx >= 0
        ? `The monthly profile peaks in ${MONTHS[peakIdx]}. Pre-peak the business builds inventory and draws cash (peak net debt), then unwinds it after the season — so covenants and the revolving facility must be sized to the peak, not the average.`
        : "Enter a monthly seasonality profile to judge intra-year cash swings.",
    gradeKind: "open",
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
    correct: `A defensible range is ~${(a.revenueCagr > 8 ? 8 : a.revenueCagr > 0 ? 6 : 4)}–${(a.revenueCagr > 8 ? 12 : a.revenueCagr > 0 ? 9 : 6)}x EV/EBITDA → EV ≈ ${fmt(
      L.ebitda * (a.revenueCagr > 8 ? 8 : a.revenueCagr > 0 ? 6 : 4)
    )}–${fmt(L.ebitda * (a.revenueCagr > 8 ? 12 : a.revenueCagr > 0 ? 9 : 6))}`,
    reasoning: `Higher growth + expanding margin earns a higher multiple; leverage and concentration pull it down. With CAGR ${fmt(
      a.revenueCagr,
      "%"
    )} and margin ${a.marginDelta >= 0 ? "expanding" : "compressing"}, anchor mid-range. Each 1.0x = ${fmt(
      L.ebitda
    )} of EV; net debt ${fmt(L.netDebt)} bridges EV down to equity value.`,
    gradeKind: "open",
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
    correct: c.actualSector
      ? `${c.actualSector}${c.actualBusiness ? " — " + c.actualBusiness : ""}`
      : "Set the actual sector in 'Reveal the answer' to enable grading",
    reasoning: `Fingerprints: gross margin ${fmt(L.grossMargin, "%")} (high → software/services, low → retail/distribution), inventory ${fmt(
      L.dio,
      "d"
    )} (high → manufacturing/retail, ~0 → services), PP&E ${fmt(
      safeDiv(c.periods.at(-1)!.bs.ppe, L.revenue) * 100,
      "% of revenue"
    )} (capital intensity), plus the seasonality shape. Together those usually pin the sector.`,
    gradeKind: "sector",
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

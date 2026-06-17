import type { StatementCase } from "./types";
import { analyseCase, analysePeriod, computeCashFlow } from "./statements";

/* ------------------------------- DCF ----------------------------------- */
export interface DcfAssumptions {
  revGrowth: number; // % per year
  ebitMargin: number; // %
  taxRate: number; // %
  daPct: number; // D&A as % of revenue
  capexPct: number; // capex as % of revenue
  nwcPct: number; // incremental NWC as % of revenue growth
  wacc: number; // %
  terminalGrowth: number; // %
  exitMultiple: number; // x EV/EBITDA at terminal
  years: number; // explicit forecast horizon
}

export interface DcfRow {
  year: number;
  revenue: number;
  ebit: number;
  nopat: number;
  da: number;
  capex: number;
  dNwc: number;
  fcff: number;
  df: number;
  pv: number;
}

export interface DcfResult {
  ready: boolean;
  rows: DcfRow[];
  pvExplicit: number;
  terminalEbitda: number;
  tvGordon: number;
  tvExit: number;
  pvTvGordon: number;
  pvTvExit: number;
  evGordon: number;
  evExit: number;
  netDebt: number;
  equityGordon: number;
  equityExit: number;
  impliedEntryMultiple: number; // EV/current EBITDA (Gordon)
  currency: string;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Sensible starting assumptions derived from the company's own statements. */
export function defaultDcfAssumptions(c: StatementCase): DcfAssumptions {
  const a = analyseCase(c);
  const L = a.latest;
  const actuals = [...c.periods].filter((p) => !p.projected);
  const lastP = actuals.at(-1);
  const prevP = actuals.length > 1 ? actuals.at(-2) : null;
  const cf = lastP && prevP ? computeCashFlow(prevP, lastP) : null;
  const rev = L?.revenue || 1;

  return {
    revGrowth: L ? clamp(a.revenueCagr, -5, 25) : 5,
    ebitMargin: L ? clamp(L.ebitMargin, -10, 60) : 15,
    taxRate: 21,
    daPct: cf ? clamp((cf.da / rev) * 100, 0, 30) : 5,
    capexPct: cf ? clamp((cf.capex / rev) * 100, 0, 30) : 5,
    nwcPct: 5,
    wacc: 9,
    terminalGrowth: 2.5,
    exitMultiple: 10,
    years: 5,
  };
}

export function buildDCF(c: StatementCase, a: DcfAssumptions): DcfResult {
  const ca = analyseCase(c);
  const L = ca.latest;
  const empty: DcfResult = {
    ready: false,
    rows: [],
    pvExplicit: 0,
    terminalEbitda: 0,
    tvGordon: 0,
    tvExit: 0,
    pvTvGordon: 0,
    pvTvExit: 0,
    evGordon: 0,
    evExit: 0,
    netDebt: 0,
    equityGordon: 0,
    equityExit: 0,
    impliedEntryMultiple: 0,
    currency: c.currency,
  };
  if (!L || !L.revenue) return empty;

  const g = a.revGrowth / 100;
  const wacc = a.wacc / 100;
  const tg = a.terminalGrowth / 100;
  const tax = a.taxRate / 100;

  let rev = L.revenue;
  const rows: DcfRow[] = [];
  let pvExplicit = 0;
  let lastFcff = 0;
  let lastDa = 0;
  for (let t = 1; t <= a.years; t++) {
    const prevRev = rev;
    rev = prevRev * (1 + g);
    const ebit = rev * (a.ebitMargin / 100);
    const nopat = ebit * (1 - tax);
    const da = rev * (a.daPct / 100);
    const capex = rev * (a.capexPct / 100);
    const dNwc = (rev - prevRev) * (a.nwcPct / 100);
    const fcff = nopat + da - capex - dNwc;
    const df = 1 / Math.pow(1 + wacc, t);
    const pv = fcff * df;
    pvExplicit += pv;
    lastFcff = fcff;
    lastDa = da;
    rows.push({ year: t, revenue: rev, ebit, nopat, da, capex, dNwc, fcff, df, pv });
  }

  const terminalEbitda = rev * (a.ebitMargin / 100) + lastDa;
  const dfN = 1 / Math.pow(1 + wacc, a.years);
  const tvGordon = wacc > tg ? (lastFcff * (1 + tg)) / (wacc - tg) : 0;
  const tvExit = terminalEbitda * a.exitMultiple;
  const pvTvGordon = tvGordon * dfN;
  const pvTvExit = tvExit * dfN;

  const evGordon = pvExplicit + pvTvGordon;
  const evExit = pvExplicit + pvTvExit;
  const netDebt = L.netDebt;

  return {
    ready: true,
    rows,
    pvExplicit,
    terminalEbitda,
    tvGordon,
    tvExit,
    pvTvGordon,
    pvTvExit,
    evGordon,
    evExit,
    netDebt,
    equityGordon: evGordon - netDebt,
    equityExit: evExit - netDebt,
    impliedEntryMultiple: L.ebitda ? evGordon / L.ebitda : 0,
    currency: c.currency,
  };
}

/* ------------------------------- LBO ----------------------------------- */
export interface LboAssumptions {
  entryMultiple: number; // x EV/EBITDA
  leverage: number; // x net debt / EBITDA at entry
  ebitdaGrowth: number; // % per year
  exitMultiple: number; // x EV/EBITDA
  hold: number; // years
  taxRate: number;
  capexPct: number; // % of EBITDA retained (proxy for cash to pay debt)
}

export interface LboResult {
  ready: boolean;
  entryEv: number;
  entryDebt: number;
  entryEquity: number;
  exitEbitda: number;
  exitEv: number;
  exitDebt: number;
  exitEquity: number;
  moic: number;
  irr: number; // %
}

export function defaultLboAssumptions(c: StatementCase): LboAssumptions {
  const a = analyseCase(c);
  return {
    entryMultiple: 9,
    leverage: 4,
    ebitdaGrowth: a.latest ? clamp(a.ebitdaCagr, 0, 20) : 6,
    exitMultiple: 9,
    hold: 5,
    taxRate: 21,
    capexPct: 35,
  };
}

export function buildLBO(entryEbitda: number, a: LboAssumptions): LboResult {
  const empty: LboResult = {
    ready: false,
    entryEv: 0,
    entryDebt: 0,
    entryEquity: 0,
    exitEbitda: 0,
    exitEv: 0,
    exitDebt: 0,
    exitEquity: 0,
    moic: 0,
    irr: 0,
  };
  if (!entryEbitda || entryEbitda <= 0) return empty;

  const entryEv = entryEbitda * a.entryMultiple;
  const entryDebt = entryEbitda * a.leverage;
  const entryEquity = entryEv - entryDebt;

  // Each year: free cash (a share of EBITDA) pays down debt.
  let debt = entryDebt;
  let ebitda = entryEbitda;
  for (let t = 1; t <= a.hold; t++) {
    ebitda = ebitda * (1 + a.ebitdaGrowth / 100);
    const freeCash = ebitda * (a.capexPct / 100) * (1 - a.taxRate / 100);
    debt = Math.max(0, debt - freeCash);
  }
  const exitEbitda = ebitda;
  const exitEv = exitEbitda * a.exitMultiple;
  const exitEquity = Math.max(0, exitEv - debt);

  const moic = entryEquity > 0 ? exitEquity / entryEquity : 0;
  const irr = entryEquity > 0 && exitEquity > 0 ? (Math.pow(moic, 1 / a.hold) - 1) * 100 : 0;

  return {
    ready: true,
    entryEv,
    entryDebt,
    entryEquity,
    exitEbitda,
    exitEv,
    exitDebt: debt,
    exitEquity,
    moic,
    irr,
  };
}

/** IRR sensitivity grid: rows = entry multiple, cols = exit multiple. */
export function lboSensitivity(
  entryEbitda: number,
  base: LboAssumptions,
  entries: number[],
  exits: number[]
): number[][] {
  return entries.map((em) =>
    exits.map((xm) => {
      const r = buildLBO(entryEbitda, { ...base, entryMultiple: em, exitMultiple: xm });
      return r.ready ? r.irr : 0;
    })
  );
}

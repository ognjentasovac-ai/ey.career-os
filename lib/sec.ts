/**
 * SEC EDGAR integration — pulls real consolidated financial statements from the
 * free, official SEC XBRL "company facts" API and maps them into the app's
 * StatementPeriod shape (P&L + balance sheet) for the last few fiscal years.
 *
 * Works best for US-listed companies that file 10-K / 20-F in US-GAAP.
 * Runs server-side only (sets the User-Agent SEC requires).
 */

const UA = "Career-OS/1.0 (ognjen.tasovac@gmail.com)";
const DATA = "https://data.sec.gov";
const WWW = "https://www.sec.gov";

interface TickerEntry {
  cik: string;
  ticker: string;
  title: string;
}

let tickerCache: Record<string, TickerEntry> | null = null;

async function loadTickers(): Promise<Record<string, TickerEntry>> {
  if (tickerCache) return tickerCache;
  const res = await fetch(`${WWW}/files/company_tickers.json`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Could not load SEC ticker list");
  const json = (await res.json()) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;
  const map: Record<string, TickerEntry> = {};
  for (const k of Object.keys(json)) {
    const e = json[k];
    map[e.ticker.toUpperCase()] = {
      cik: String(e.cik_str).padStart(10, "0"),
      ticker: e.ticker,
      title: e.title,
    };
  }
  tickerCache = map;
  return map;
}

async function resolve(q: string): Promise<TickerEntry | null> {
  const query = q.trim();
  if (/^\d{1,10}$/.test(query)) {
    return { cik: query.padStart(10, "0"), ticker: "", title: "" };
  }
  const map = await loadTickers();
  const up = query.toUpperCase();
  if (map[up]) return map[up];
  // fall back to a title contains-match
  const hit = Object.values(map).find((e) => e.title.toUpperCase().includes(up));
  return hit || null;
}

type FactEntry = {
  start?: string;
  end: string;
  val: number;
  form: string;
  fy?: number;
  fp?: string;
};

const ANNUAL_FORMS = ["10-K", "10-K/A", "20-F", "20-F/A", "40-F"];

/**
 * Returns { fiscalYear: value } merged across ALL matching tags. Earlier tags
 * take priority per year; later (synonym) tags fill years that are missing or 0
 * — companies often switch tag names over time (e.g. PP&E, D&A, debt), so a
 * single tag misses recent years. Merging keeps every year populated.
 */
function annualSeries(
  facts: any,
  tags: string[],
  instant: boolean
): Record<number, number> {
  const roots = [facts?.facts?.["us-gaap"], facts?.facts?.["ifrs-full"]];
  const out: Record<number, number> = {};
  for (const gaap of roots) {
    if (!gaap) continue;
    for (const tag of tags) {
      const node = gaap[tag];
      if (!node || !node.units) continue;
      const units: FactEntry[] =
        node.units["USD"] ||
        node.units["EUR"] ||
        (Object.values(node.units)[0] as FactEntry[]);
      if (!units) continue;
      const byYear: Record<number, FactEntry> = {};
      for (const e of units) {
        if (!ANNUAL_FORMS.includes(e.form)) continue;
        if (instant) {
          if (e.start) continue;
          const year = +e.end.slice(0, 4);
          if (!byYear[year] || e.end > byYear[year].end) byYear[year] = e;
        } else {
          if (!e.start) continue;
          const days =
            (new Date(e.end).getTime() - new Date(e.start).getTime()) /
            86_400_000;
          if (days < 340 || days > 380) continue;
          const year = +e.end.slice(0, 4);
          if (!byYear[year] || e.end > byYear[year].end) byYear[year] = e;
        }
      }
      for (const y of Object.keys(byYear)) {
        const yr = +y;
        if (!out[yr]) out[yr] = byYear[yr].val; // fill missing / zero years
      }
    }
  }
  return out;
}

/**
 * Real monthly seasonality derived from the last 4 reported QUARTERS (10-Q),
 * mapped to calendar months by each quarter's end date. Falls back to flat
 * only when quarterly revenue can't be extracted.
 */
function quarterlySeasonality(facts: any, tags: string[]): number[] {
  const flat = Array(12).fill(100 / 12);
  const DAY = 86_400_000;
  const roots = [facts?.facts?.["us-gaap"], facts?.facts?.["ifrs-full"]];
  for (const gaap of roots) {
    if (!gaap) continue;
    for (const tag of tags) {
      const node = gaap[tag];
      if (!node?.units) continue;
      const units: FactEntry[] =
        node.units["USD"] || node.units["EUR"] || (Object.values(node.units)[0] as FactEntry[]);
      if (!units) continue;
      const annuals: Record<string, { end: string; val: number }> = {};
      const quarters: Record<string, { end: string; val: number }> = {};
      for (const e of units) {
        if (!e.start) continue;
        const days = (new Date(e.end).getTime() - new Date(e.start).getTime()) / DAY;
        if (days >= 340 && days <= 380) annuals[e.end] = { end: e.end, val: e.val };
        else if (days >= 80 && days <= 100) quarters[e.end] = { end: e.end, val: e.val };
      }
      const annualList = Object.values(annuals).sort((a, b) => b.end.localeCompare(a.end));
      const qList = Object.values(quarters);
      if (!annualList.length || qList.length < 3) continue;

      // Take the most recent full year and the 3 discrete quarters inside it.
      const A = annualList[0];
      const Aend = new Date(A.end).getTime();
      const inFY = qList
        .filter((q) => {
          const t = new Date(q.end).getTime();
          return t <= Aend - 15 * DAY && t > Aend - 360 * DAY;
        })
        .sort((a, b) => a.end.localeCompare(b.end));
      if (inFY.length < 3) continue;
      const q123 = inFY.slice(-3);
      const sum3 = q123.reduce((s, q) => s + q.val, 0);
      const q4 = A.val - sum3; // Q4 isn't a standalone 10-Q — derive it
      if (q4 / A.val < 0.1 || q4 / A.val > 0.55) continue; // sanity

      const blocks = [
        ...q123.map((q) => ({ endMonth: new Date(q.end).getUTCMonth(), val: q.val })),
        { endMonth: new Date(A.end).getUTCMonth(), val: q4 }, // Q4 ends at the FY end
      ];
      const months = Array(12).fill(0);
      for (const b of blocks) {
        const w = ((b.val / A.val) * 100) / 3; // spread each quarter over its 3 months
        for (let k = 0; k < 3; k++) months[(b.endMonth - k + 12) % 12] += w;
      }
      const s = months.reduce((a, b) => a + b, 0);
      if (s > 0) return months.map((v) => (v / s) * 100);
    }
  }
  return flat;
}

export interface SecPeriod {
  label: string;
  pl: {
    revenue: number;
    cogs: number;
    salaries: number;
    transport: number;
    marketing: number;
    opex: number;
    otherIncome: number;
    da: number;
    interest: number;
    tax: number;
  };
  bs: {
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
  };
  seasonality: number[];
  segments: { name: string; value: number }[];
  reported: { is: Record<string, number>; bs: Record<string, number> };
}

export interface SecResult {
  company: { name: string; sector: string; cik: string; ticker: string; currency: string };
  periods: SecPeriod[];
}

export async function fetchSecStatements(q: string): Promise<SecResult> {
  const entry = await resolve(q);
  if (!entry) throw new Error(`No SEC filer found for "${q}".`);

  const [factsRes, subsRes] = await Promise.all([
    fetch(`${DATA}/api/xbrl/companyfacts/CIK${entry.cik}.json`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    }),
    fetch(`${DATA}/submissions/CIK${entry.cik}.json`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    }),
  ]);
  if (!factsRes.ok) throw new Error("SEC has no XBRL financial data for this filer.");
  const facts = await facts_json(factsRes);
  const subs = subsRes.ok ? await subsRes.json() : {};

  const currency =
    facts?.facts?.["us-gaap"] ? "USD" : facts?.facts?.["ifrs-full"] ? "EUR" : "USD";

  // P&L series
  const revenue = annualSeries(
    facts,
    [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
    ],
    false
  );
  const cogs = annualSeries(
    facts,
    [
      "CostOfGoodsAndServicesSold",
      "CostOfRevenue",
      "CostOfGoodsSold",
      "CostOfServices",
      "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization",
      "CostOfGoodsSoldExcludingDepreciationDepletionAndAmortization",
      "CostOfGoodsAndServicesSoldExcludingDepreciationDepletionAndAmortization",
    ],
    false
  );
  const grossProfit = annualSeries(facts, ["GrossProfit"], false);
  const costsAndExpenses = annualSeries(facts, ["CostsAndExpenses"], false);
  const ebit = annualSeries(facts, ["OperatingIncomeLoss"], false);
  const da = annualSeries(
    facts,
    [
      "DepreciationDepletionAndAmortization",
      "DepreciationAmortizationAndAccretionNet",
      "DepreciationAndAmortization",
      "DepreciationAmortizationAndOther",
      "Depreciation",
    ],
    false
  );
  const sga = annualSeries(
    facts,
    [
      "SellingGeneralAndAdministrativeExpense",
      "GeneralAndAdministrativeExpense",
      "OperatingExpenses",
    ],
    false
  );
  const rnd = annualSeries(facts, ["ResearchAndDevelopmentExpense"], false);
  const interest = annualSeries(
    facts,
    [
      "InterestExpense",
      "InterestExpenseNonoperating",
      "InterestAndDebtExpense",
      "InterestExpenseDebt",
      "InterestExpenseNet",
      "InterestIncomeExpenseNet",
    ],
    false
  );
  const tax = annualSeries(facts, ["IncomeTaxExpenseBenefit"], false);
  const pretax = annualSeries(
    facts,
    [
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
      "IncomeLossFromContinuingOperationsBeforeIncomeTaxesAndMinorityInterest",
    ],
    false
  );
  const netIncome = annualSeries(
    facts,
    ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
    false
  );

  // Balance-sheet series (instant)
  const cash = annualSeries(
    facts,
    [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "CashCashEquivalentsAndShortTermInvestments",
    ],
    true
  );
  const recv = annualSeries(
    facts,
    [
      "AccountsReceivableNetCurrent",
      "ReceivablesNetCurrent",
      "AccountsAndOtherReceivablesNetCurrent",
      "AccountsAndNotesReceivableNet",
      "AccountsReceivableNet",
      "NontradeReceivablesCurrent",
    ],
    true
  );
  const inv = annualSeries(facts, ["InventoryNet"], true);
  const curA = annualSeries(facts, ["AssetsCurrent"], true);
  const ppe = annualSeries(
    facts,
    [
      "PropertyPlantAndEquipmentNet",
      "PropertyPlantAndEquipmentAndFinanceLeaseRightOfUseAssetAfterAccumulatedDepreciationAndAmortization",
    ],
    true
  );
  const ppeGross = annualSeries(facts, ["PropertyPlantAndEquipmentGross"], true);
  const accumDep = annualSeries(
    facts,
    ["AccumulatedDepreciationDepletionAndAmortizationPropertyPlantAndEquipment"],
    true
  );
  const goodwill = annualSeries(facts, ["Goodwill"], true);
  const intang = annualSeries(
    facts,
    ["IntangibleAssetsNetExcludingGoodwill", "FiniteLivedIntangibleAssetsNet"],
    true
  );
  const totA = annualSeries(facts, ["Assets"], true);
  const pay = annualSeries(
    facts,
    ["AccountsPayableCurrent", "AccountsPayableAndAccruedLiabilitiesCurrent"],
    true
  );
  const stDebt = annualSeries(
    facts,
    [
      "LongTermDebtCurrent",
      "DebtCurrent",
      "ShortTermBorrowings",
      "LongTermDebtAndCapitalLeaseObligationsCurrent",
      "CommercialPaper",
    ],
    true
  );
  const curL = annualSeries(facts, ["LiabilitiesCurrent"], true);
  const ltDebt = annualSeries(
    facts,
    [
      "LongTermDebtNoncurrent",
      "LongTermDebtAndCapitalLeaseObligations",
      "LongTermDebt",
    ],
    true
  );
  const totL = annualSeries(facts, ["Liabilities"], true);
  const eq = annualSeries(
    facts,
    [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
    true
  );

  const years = Object.keys(revenue)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(-5);
  if (years.length === 0)
    throw new Error("Could not extract an annual revenue series from SEC data.");

  const seasonality = quarterlySeasonality(facts, [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
  ]);

  const periods: SecPeriod[] = years.map((y) => {
    const R = revenue[y] || 0;
    // Prefer a reported COGS tag; otherwise derive it from GrossProfit so the
    // gross margin is accurate instead of a misleading 100%.
    const DA = da[y] || 0;
    let C = cogs[y] || 0;
    // If COGS tag is missing or implausibly tiny (< 2% of revenue), derive it.
    if (C < 0.02 * R) {
      // 1. Authoritative: a reported GrossProfit gives the exact COGS.
      if (grossProfit[y] != null && grossProfit[y] > 0 && grossProfit[y] < R) {
        C = R - grossProfit[y];
      } else if (costsAndExpenses[y] != null) {
        // 2. Single-step filers: direct costs = total operating costs − SG&A − R&D − D&A.
        const derived = costsAndExpenses[y] - (sga[y] || 0) - (rnd[y] || 0) - DA;
        if (derived > 0.02 * R && derived < R) C = derived;
      }
    }
    let opexOther: number;
    if (ebit[y] != null) opexOther = R - C - (ebit[y] + DA);
    else opexOther = (sga[y] || 0) + (rnd[y] || 0);
    if (!isFinite(opexOther) || opexOther < 0) opexOther = (sga[y] || 0) + (rnd[y] || 0);

    const ca = curA[y] || 0;
    const cashV = cash[y] || 0;
    const recvV = recv[y] || 0;
    const invV = inv[y] || 0;
    const otherCA = Math.max(0, ca - cashV - recvV - invV);
    const ppeV = ppe[y] || Math.max(0, (ppeGross[y] || 0) - (accumDep[y] || 0));
    const intangV = (goodwill[y] || 0) + (intang[y] || 0);
    const ta = totA[y] || ca + ppeV + intangV;
    const otherNCA = Math.max(0, ta - ca - ppeV - intangV);
    const payV = pay[y] || 0;
    const stV = stDebt[y] || 0;
    const cl = curL[y] || 0;
    const otherCL = Math.max(0, cl - payV - stV);
    const ltV = ltDebt[y] || 0;
    const tl = totL[y] || cl + ltV;
    const otherLTL = Math.max(0, tl - cl - ltV);
    const equityV = eq[y] != null ? eq[y] : ta - tl;

    // 1:1 reported line items, as they appear in the SEC filing.
    const GP = R - C;
    const ebitV = ebit[y] != null ? ebit[y] : GP - opexOther;
    const pretaxV = pretax[y] != null ? pretax[y] : ebitV - (interest[y] || 0);
    const niV = netIncome[y] != null ? netIncome[y] : pretaxV - (tax[y] || 0);
    const reported = {
      is: {
        "Revenue": R,
        "Cost of revenue": C,
        "Gross profit": GP,
        "Research & development": rnd[y] || 0,
        "Selling, general & admin": sga[y] || 0,
        "Operating income (EBIT)": ebitV,
        "Depreciation & amortisation": DA,
        "Interest expense": interest[y] || 0,
        "Pre-tax income": pretaxV,
        "Income tax": tax[y] || 0,
        "Net income": niV,
      },
      bs: {
        "Cash & equivalents": cashV,
        "Receivables": recvV,
        "Inventory": invV,
        "Other current assets": otherCA,
        "Total current assets": ca || cashV + recvV + invV + otherCA,
        "Property, plant & equipment": ppeV,
        "Goodwill": goodwill[y] || 0,
        "Other intangibles": intang[y] || 0,
        "Other non-current assets": otherNCA,
        "Total assets": ta,
        "Accounts payable": payV,
        "Short-term debt": stV,
        "Other current liabilities": otherCL,
        "Total current liabilities": cl || payV + stV + otherCL,
        "Long-term debt": ltV,
        "Other non-current liabilities": otherLTL,
        "Total liabilities": tl,
        "Total equity": equityV,
      },
    };

    return {
      label: `FY${y}`,
      pl: {
        revenue: R,
        cogs: C,
        salaries: 0,
        transport: 0,
        marketing: 0,
        opex: Math.round(opexOther),
        otherIncome: 0,
        da: DA,
        interest: interest[y] || 0,
        tax: tax[y] || 0,
      },
      bs: {
        cash: cashV,
        receivables: recvV,
        inventory: invV,
        otherCA,
        ppe: ppeV,
        intangibles: intangV,
        otherNCA,
        payables: payV,
        shortDebt: stV,
        otherCL,
        longDebt: ltV,
        otherLTL,
        equity: equityV,
      },
      seasonality,
      segments: [],
      reported,
    };
  });

  return {
    company: {
      name: subs.name || facts.entityName || entry.title || entry.ticker,
      sector: subs.sicDescription || "—",
      cik: entry.cik,
      ticker: (subs.tickers && subs.tickers[0]) || entry.ticker || "",
      currency,
    },
    periods,
  };
}

async function facts_json(res: Response): Promise<any> {
  return res.json();
}

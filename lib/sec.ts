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

/** Returns { fiscalYear: value } for annual facts of the first matching tag. */
function annualSeries(
  facts: any,
  tags: string[],
  instant: boolean
): Record<number, number> {
  const roots = [facts?.facts?.["us-gaap"], facts?.facts?.["ifrs-full"]];
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
      const out: Record<number, number> = {};
      for (const y of Object.keys(byYear)) out[+y] = byYear[+y].val;
      if (Object.keys(out).length) return out;
    }
  }
  return {};
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
    ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"],
    false
  );
  const ebit = annualSeries(facts, ["OperatingIncomeLoss"], false);
  const da = annualSeries(
    facts,
    [
      "DepreciationDepletionAndAmortization",
      "DepreciationAmortizationAndAccretionNet",
      "DepreciationAndAmortization",
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
    ["InterestExpense", "InterestExpenseNonoperating", "InterestAndDebtExpense"],
    false
  );
  const tax = annualSeries(facts, ["IncomeTaxExpenseBenefit"], false);

  // Balance-sheet series (instant)
  const cash = annualSeries(
    facts,
    [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ],
    true
  );
  const recv = annualSeries(
    facts,
    ["AccountsReceivableNetCurrent", "ReceivablesNetCurrent"],
    true
  );
  const inv = annualSeries(facts, ["InventoryNet"], true);
  const curA = annualSeries(facts, ["AssetsCurrent"], true);
  const ppe = annualSeries(facts, ["PropertyPlantAndEquipmentNet"], true);
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
    ["LongTermDebtCurrent", "DebtCurrent", "ShortTermBorrowings"],
    true
  );
  const curL = annualSeries(facts, ["LiabilitiesCurrent"], true);
  const ltDebt = annualSeries(
    facts,
    ["LongTermDebtNoncurrent", "LongTermDebt"],
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

  const periods: SecPeriod[] = years.map((y) => {
    const R = revenue[y] || 0;
    const C = cogs[y] || 0;
    const DA = da[y] || 0;
    let opexOther: number;
    if (ebit[y] != null) opexOther = R - C - (ebit[y] + DA);
    else opexOther = (sga[y] || 0) + (rnd[y] || 0);
    if (!isFinite(opexOther) || opexOther < 0) opexOther = (sga[y] || 0) + (rnd[y] || 0);

    const ca = curA[y] || 0;
    const cashV = cash[y] || 0;
    const recvV = recv[y] || 0;
    const invV = inv[y] || 0;
    const otherCA = Math.max(0, ca - cashV - recvV - invV);
    const ppeV = ppe[y] || 0;
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
      seasonality: Array(12).fill(100 / 12),
      segments: [],
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

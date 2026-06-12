import type { StatementCase, StatementPeriod, PLData, BSData } from "./types";
import { todayISO } from "./utils";

/**
 * Company library — 10 anonymised businesses across diverse sectors, each with
 * five consolidated historical years (FY2020–FY2024). Figures are illustrative
 * and modeled on the public financial profile of well-known listed companies so
 * the *patterns* (margin structure, asset intensity, working capital, leverage,
 * seasonality) are realistic. Use the Data Sources panel to pull the exact
 * official filings, then form your own 3-year projection in the Projection tab.
 *
 * Identity is hidden — the goal is to read the three statements and deduce the
 * sector, the business, whether it is worth buying and at what price.
 */

export interface DataSource {
  name: string;
  region: string;
  url: string;
  note: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    name: "SEC EDGAR — Full-Text Search",
    region: "US",
    url: "https://efts.sec.gov/LATEST/search-index?q=",
    note: "Search 10-K / 20-F annual reports of any US-listed company. The primary source for consolidated US statements.",
  },
  {
    name: "SEC EDGAR — Company Search",
    region: "US",
    url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany",
    note: "Browse all filings by company (10-K annual, 10-Q quarterly). Free, official.",
  },
  {
    name: "SEC — Company Facts API (XBRL)",
    region: "US",
    url: "https://www.sec.gov/edgar/sec-api-documentation",
    note: "Machine-readable financial data (Revenues, NetIncome, Assets…) straight from filings.",
  },
  {
    name: "AnnualReports.com",
    region: "Global",
    url: "https://www.annualreports.com/",
    note: "Free library of annual report PDFs for thousands of global companies.",
  },
  {
    name: "APR — Agencija za privredne registre",
    region: "Serbia",
    url: "https://www.apr.gov.rs/",
    note: "Official Serbian register — financial statements of Serbian companies. Your home market.",
  },
  {
    name: "Bundesanzeiger",
    region: "Germany",
    url: "https://www.bundesanzeiger.de/",
    note: "German federal gazette — statutory financial statements of German companies.",
  },
  {
    name: "Companies House",
    region: "UK",
    url: "https://find-and-update.company-information.service.gov.uk/",
    note: "Official UK register — free accounts for every UK company.",
  },
  {
    name: "EU Business Registers (e-Justice)",
    region: "EU",
    url: "https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu_en",
    note: "Gateway to the official business registers of every EU member state.",
  },
];

interface Seg {
  name: string;
  pct: number;
}

interface CompanySpec {
  id: string;
  hiddenName: string;
  sector: string;
  business: string;
  unit: string;
  startYear: number;
  revenue0: number;
  growths: number[]; // length 4 — YoY for years 2..5
  grossMargin: number;
  marginDriftPpt?: number; // gross-margin change per year
  salariesPct: number;
  transportPct: number;
  marketingPct: number;
  otherOpexPct: number;
  daPct: number;
  interestPct: number;
  taxRate: number;
  cashPct: number;
  dso: number;
  dio: number;
  dpo: number;
  ppePct: number;
  intangiblesPct: number;
  otherCAPct: number;
  otherNCAPct: number;
  otherCLPct: number;
  shortDebtPct: number;
  longDebtPct: number;
  otherLTLPct: number;
  seasonality: number[];
  segments: Seg[];
}

const r = Math.round;

function generate(spec: CompanySpec): StatementCase {
  const periods: StatementPeriod[] = [];
  let rev = spec.revenue0;
  for (let i = 0; i < 5; i++) {
    if (i > 0) rev = rev * (1 + (spec.growths[i - 1] ?? 0.05));
    const gm = spec.grossMargin + (spec.marginDriftPpt ?? 0) * i;
    const cogs = rev * (1 - gm);
    const salaries = rev * spec.salariesPct;
    const transport = rev * spec.transportPct;
    const marketing = rev * spec.marketingPct;
    const opex = rev * spec.otherOpexPct;
    const da = rev * spec.daPct;
    const interest = rev * spec.interestPct;
    const ebitda = rev - cogs - salaries - transport - marketing - opex;
    const ebit = ebitda - da;
    const pbt = ebit - interest;
    const tax = pbt > 0 ? pbt * spec.taxRate : 0;
    const pl: PLData = {
      revenue: r(rev),
      cogs: r(cogs),
      salaries: r(salaries),
      transport: r(transport),
      marketing: r(marketing),
      opex: r(opex),
      otherIncome: 0,
      da: r(da),
      interest: r(interest),
      tax: r(tax),
    };

    const cash = rev * spec.cashPct;
    const receivables = (rev * spec.dso) / 365;
    const inventory = (cogs * spec.dio) / 365;
    const payables = (cogs * spec.dpo) / 365;
    const ppe = rev * spec.ppePct;
    const intangibles = rev * spec.intangiblesPct;
    const otherCA = rev * spec.otherCAPct;
    const otherNCA = rev * spec.otherNCAPct;
    const otherCL = rev * spec.otherCLPct;
    const shortDebt = rev * spec.shortDebtPct;
    const longDebt = rev * spec.longDebtPct;
    const otherLTL = rev * spec.otherLTLPct;
    const totalAssets =
      cash + receivables + inventory + otherCA + ppe + intangibles + otherNCA;
    const nonEqLiab = payables + shortDebt + otherCL + longDebt + otherLTL;
    const equity = totalAssets - nonEqLiab;
    const bs: BSData = {
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
    };

    periods.push({
      id: `${spec.id}_fy${spec.startYear + i}`,
      label: `FY${spec.startYear + i}`,
      pl,
      bs,
      seasonality: spec.seasonality,
      segments: spec.segments.map((s) => ({ name: s.name, value: r(rev * s.pct) })),
    });
  }

  return {
    id: spec.id,
    name: spec.hiddenName,
    createdAt: todayISO(),
    currency: "EUR",
    periods,
    answers: {},
    guessSector: "",
    actualSector: spec.sector,
    actualBusiness: spec.business,
    revealed: false,
    score: 0,
    notes: "",
  };
}

// Seasonality presets (sum ≈ 100)
const FLAT = [8, 8, 8, 9, 8, 8, 8, 8, 9, 8, 9, 9];
const HOLIDAY_Q4 = [7, 7, 7, 7, 8, 8, 8, 8, 8, 9, 10, 13];
const TECH_LAUNCH = [8, 7, 7, 7, 7, 7, 7, 7, 8, 9, 11, 15];
const SUMMER = [6, 6, 7, 9, 10, 12, 13, 12, 9, 7, 5, 4];
const AUTUMN_WINTER = [7, 6, 7, 7, 7, 7, 7, 8, 10, 11, 12, 11];
const AUTO = [8, 8, 9, 9, 8, 8, 7, 6, 9, 9, 9, 10];
const STEEL = [9, 8, 9, 9, 9, 8, 7, 6, 9, 9, 9, 8];

const SPECS: CompanySpec[] = [
  {
    id: "co_tech_hw",
    hiddenName: "Mystery Co. A",
    sector: "Technology — Consumer Electronics",
    business:
      "Designs and sells premium consumer hardware and wearables with a fast-growing, high-margin services ecosystem. Mega-cap, cash generative, returns capital via buybacks.",
    unit: "Illustrative — modeled on a mega-cap hardware + services company.",
    startYear: 2020,
    revenue0: 274_000_000_000,
    growths: [0.33, 0.08, -0.03, 0.02],
    grossMargin: 0.41,
    marginDriftPpt: 0.01,
    salariesPct: 0.09,
    transportPct: 0.005,
    marketingPct: 0.03,
    otherOpexPct: 0.03,
    daPct: 0.04,
    interestPct: 0.008,
    taxRate: 0.15,
    cashPct: 0.12,
    dso: 28,
    dio: 8,
    dpo: 95,
    ppePct: 0.11,
    intangiblesPct: 0.0,
    otherCAPct: 0.1,
    otherNCAPct: 0.4,
    otherCLPct: 0.12,
    shortDebtPct: 0.05,
    longDebtPct: 0.28,
    otherLTLPct: 0.12,
    seasonality: TECH_LAUNCH,
    segments: [
      { name: "Flagship devices", pct: 0.52 },
      { name: "Services", pct: 0.22 },
      { name: "Wearables & accessories", pct: 0.11 },
      { name: "Computers & tablets", pct: 0.15 },
    ],
  },
  {
    id: "co_beverage",
    hiddenName: "Mystery Co. B",
    sector: "Consumer Staples — Beverages",
    business:
      "Global non-alcoholic beverage company with iconic brands sold through a bottling and distribution network. High gross margin, heavy marketing, brand intangibles.",
    unit: "Illustrative — modeled on a global beverages major.",
    startYear: 2020,
    revenue0: 33_000_000_000,
    growths: [0.17, 0.11, 0.07, 0.03],
    grossMargin: 0.6,
    salariesPct: 0.12,
    transportPct: 0.03,
    marketingPct: 0.1,
    otherOpexPct: 0.08,
    daPct: 0.04,
    interestPct: 0.05,
    taxRate: 0.19,
    cashPct: 0.1,
    dso: 40,
    dio: 60,
    dpo: 120,
    ppePct: 0.25,
    intangiblesPct: 0.5,
    otherCAPct: 0.06,
    otherNCAPct: 0.25,
    otherCLPct: 0.1,
    shortDebtPct: 0.1,
    longDebtPct: 0.7,
    otherLTLPct: 0.2,
    seasonality: SUMMER,
    segments: [
      { name: "Sparkling soft drinks", pct: 0.69 },
      { name: "Water & sports", pct: 0.15 },
      { name: "Juice & dairy", pct: 0.1 },
      { name: "Coffee & tea", pct: 0.06 },
    ],
  },
  {
    id: "co_grocery",
    hiddenName: "Mystery Co. C",
    sector: "Consumer Staples — Grocery Retail",
    business:
      "Large food retailer running a network of supermarkets. Razor-thin net margin, fast inventory, negative working capital (suppliers fund the business), Q4 peak.",
    unit: "Illustrative — modeled on a major grocery retailer.",
    startYear: 2020,
    revenue0: 58_000_000_000,
    growths: [0.06, 0.03, 0.04, 0.05],
    grossMargin: 0.25,
    salariesPct: 0.11,
    transportPct: 0.035,
    marketingPct: 0.015,
    otherOpexPct: 0.05,
    daPct: 0.025,
    interestPct: 0.012,
    taxRate: 0.21,
    cashPct: 0.05,
    dso: 4,
    dio: 28,
    dpo: 45,
    ppePct: 0.3,
    intangiblesPct: 0.08,
    otherCAPct: 0.03,
    otherNCAPct: 0.05,
    otherCLPct: 0.06,
    shortDebtPct: 0.04,
    longDebtPct: 0.16,
    otherLTLPct: 0.08,
    seasonality: HOLIDAY_Q4,
    segments: [
      { name: "Fresh food", pct: 0.42 },
      { name: "Packaged groceries", pct: 0.4 },
      { name: "General merchandise", pct: 0.12 },
      { name: "Fuel & services", pct: 0.06 },
    ],
  },
  {
    id: "co_software",
    hiddenName: "Mystery Co. D",
    sector: "Technology — Enterprise Software",
    business:
      "Enterprise software & cloud platform sold on subscription. Very high gross margin, large deferred revenue, asset-light, sticky recurring revenue.",
    unit: "Illustrative — modeled on a large enterprise software company.",
    startYear: 2020,
    revenue0: 110_000_000_000,
    growths: [0.18, 0.18, 0.07, 0.16],
    grossMargin: 0.69,
    marginDriftPpt: 0.005,
    salariesPct: 0.22,
    transportPct: 0.002,
    marketingPct: 0.08,
    otherOpexPct: 0.05,
    daPct: 0.05,
    interestPct: 0.015,
    taxRate: 0.15,
    cashPct: 0.13,
    dso: 75,
    dio: 1,
    dpo: 40,
    ppePct: 0.35,
    intangiblesPct: 0.4,
    otherCAPct: 0.05,
    otherNCAPct: 0.1,
    otherCLPct: 0.18,
    shortDebtPct: 0.02,
    longDebtPct: 0.4,
    otherLTLPct: 0.12,
    seasonality: FLAT,
    segments: [
      { name: "Cloud & subscriptions", pct: 0.58 },
      { name: "Licenses", pct: 0.2 },
      { name: "Support & services", pct: 0.14 },
      { name: "Devices", pct: 0.08 },
    ],
  },
  {
    id: "co_steel",
    hiddenName: "Mystery Co. E",
    sector: "Industrials — Steel & Materials",
    business:
      "Integrated steel & mining producer. Highly cyclical, low gross margin, very capital-intensive (blast furnaces), volatile earnings, meaningful leverage.",
    unit: "Illustrative — modeled on a global steel producer.",
    startYear: 2020,
    revenue0: 53_000_000_000,
    growths: [0.44, 0.18, -0.09, -0.08],
    grossMargin: 0.16,
    marginDriftPpt: -0.005,
    salariesPct: 0.06,
    transportPct: 0.04,
    marketingPct: 0.004,
    otherOpexPct: 0.03,
    daPct: 0.05,
    interestPct: 0.012,
    taxRate: 0.2,
    cashPct: 0.1,
    dso: 35,
    dio: 80,
    dpo: 55,
    ppePct: 0.55,
    intangiblesPct: 0.05,
    otherCAPct: 0.05,
    otherNCAPct: 0.15,
    otherCLPct: 0.06,
    shortDebtPct: 0.05,
    longDebtPct: 0.2,
    otherLTLPct: 0.1,
    seasonality: STEEL,
    segments: [
      { name: "Flat steel", pct: 0.46 },
      { name: "Long steel", pct: 0.27 },
      { name: "Mining", pct: 0.16 },
      { name: "Other / downstream", pct: 0.11 },
    ],
  },
  {
    id: "co_pharma",
    hiddenName: "Mystery Co. F",
    sector: "Healthcare — Pharmaceuticals",
    business:
      "Research-driven pharmaceutical company. High gross margin, very large R&D, patent-protected products with cliff risk, heavy intangibles/goodwill from M&A.",
    unit: "Illustrative — modeled on a large-cap pharma company.",
    startYear: 2020,
    revenue0: 42_000_000_000,
    growths: [0.23, 0.3, -0.42, 0.05],
    grossMargin: 0.71,
    salariesPct: 0.16,
    transportPct: 0.01,
    marketingPct: 0.12,
    otherOpexPct: 0.06,
    daPct: 0.06,
    interestPct: 0.03,
    taxRate: 0.12,
    cashPct: 0.06,
    dso: 70,
    dio: 120,
    dpo: 60,
    ppePct: 0.3,
    intangiblesPct: 0.85,
    otherCAPct: 0.06,
    otherNCAPct: 0.15,
    otherCLPct: 0.12,
    shortDebtPct: 0.04,
    longDebtPct: 0.5,
    otherLTLPct: 0.18,
    seasonality: FLAT,
    segments: [
      { name: "Primary care", pct: 0.38 },
      { name: "Specialty & oncology", pct: 0.4 },
      { name: "Vaccines", pct: 0.14 },
      { name: "Consumer health", pct: 0.08 },
    ],
  },
  {
    id: "co_airline",
    hiddenName: "Mystery Co. G",
    sector: "Transportation — Airline",
    business:
      "Network airline carrying passengers and cargo. Low margin, fuel-heavy cost base, enormous fleet (PP&E), high leverage and lease liabilities, strong summer peak.",
    unit: "Illustrative — modeled on a large European airline group.",
    startYear: 2020,
    revenue0: 13_000_000_000,
    growths: [0.25, 1.1, 0.55, 0.12],
    grossMargin: 0.22,
    marginDriftPpt: 0.01,
    salariesPct: 0.22,
    transportPct: 0.12,
    marketingPct: 0.02,
    otherOpexPct: 0.06,
    daPct: 0.08,
    interestPct: 0.03,
    taxRate: 0.18,
    cashPct: 0.12,
    dso: 12,
    dio: 6,
    dpo: 35,
    ppePct: 0.85,
    intangiblesPct: 0.05,
    otherCAPct: 0.05,
    otherNCAPct: 0.12,
    otherCLPct: 0.2,
    shortDebtPct: 0.08,
    longDebtPct: 0.5,
    otherLTLPct: 0.18,
    seasonality: SUMMER,
    segments: [
      { name: "Passenger — network", pct: 0.7 },
      { name: "Passenger — low-cost", pct: 0.14 },
      { name: "Cargo & logistics", pct: 0.1 },
      { name: "MRO & other", pct: 0.06 },
    ],
  },
  {
    id: "co_auto",
    hiddenName: "Mystery Co. H",
    sector: "Consumer Discretionary — Automotive OEM",
    business:
      "Automotive manufacturer with a captive financing arm. Huge revenue, mid-teens gross margin, capital-intensive plants, large inventory and a financing balance sheet.",
    unit: "Illustrative — modeled on a global auto OEM.",
    startYear: 2020,
    revenue0: 220_000_000_000,
    growths: [0.12, 0.12, 0.15, 0.02],
    grossMargin: 0.18,
    salariesPct: 0.06,
    transportPct: 0.03,
    marketingPct: 0.03,
    otherOpexPct: 0.03,
    daPct: 0.05,
    interestPct: 0.02,
    taxRate: 0.25,
    cashPct: 0.12,
    dso: 60,
    dio: 60,
    dpo: 55,
    ppePct: 0.3,
    intangiblesPct: 0.12,
    otherCAPct: 0.2,
    otherNCAPct: 0.35,
    otherCLPct: 0.18,
    shortDebtPct: 0.25,
    longDebtPct: 0.45,
    otherLTLPct: 0.15,
    seasonality: AUTO,
    segments: [
      { name: "Passenger vehicles", pct: 0.62 },
      { name: "Premium / luxury brands", pct: 0.2 },
      { name: "Financial services", pct: 0.13 },
      { name: "Commercial vehicles", pct: 0.05 },
    ],
  },
  {
    id: "co_apparel",
    hiddenName: "Mystery Co. I",
    sector: "Consumer Discretionary — Apparel Retail",
    business:
      "Vertically-integrated fast-fashion apparel retailer. High gross margin, very fast inventory, store + e-commerce network, autumn/winter seasonal peak, net cash.",
    unit: "Illustrative — modeled on a global fast-fashion retailer.",
    startYear: 2020,
    revenue0: 20_000_000_000,
    growths: [0.36, 0.18, 0.1, 0.07],
    grossMargin: 0.57,
    salariesPct: 0.16,
    transportPct: 0.05,
    marketingPct: 0.04,
    otherOpexPct: 0.08,
    daPct: 0.07,
    interestPct: 0.005,
    taxRate: 0.22,
    cashPct: 0.25,
    dso: 8,
    dio: 70,
    dpo: 110,
    ppePct: 0.35,
    intangiblesPct: 0.05,
    otherCAPct: 0.05,
    otherNCAPct: 0.1,
    otherCLPct: 0.12,
    shortDebtPct: 0.0,
    longDebtPct: 0.02,
    otherLTLPct: 0.2,
    seasonality: AUTUMN_WINTER,
    segments: [
      { name: "Womenswear", pct: 0.45 },
      { name: "Menswear", pct: 0.25 },
      { name: "Kids & home", pct: 0.18 },
      { name: "Accessories & footwear", pct: 0.12 },
    ],
  },
  {
    id: "co_platform",
    hiddenName: "Mystery Co. J",
    sector: "Technology — Online Travel Platform",
    business:
      "Asset-light online marketplace earning a commission on travel bookings. Very high margin, negative working capital (collects before paying suppliers), summer peak.",
    unit: "Illustrative — modeled on a large online travel platform.",
    startYear: 2020,
    revenue0: 6_800_000_000,
    growths: [-0.55, 1.6, 0.55, 0.25],
    grossMargin: 0.85,
    salariesPct: 0.18,
    transportPct: 0.002,
    marketingPct: 0.32,
    otherOpexPct: 0.06,
    daPct: 0.03,
    interestPct: 0.02,
    taxRate: 0.17,
    cashPct: 0.45,
    dso: 25,
    dio: 0,
    dpo: 5,
    ppePct: 0.05,
    intangiblesPct: 0.35,
    otherCAPct: 0.1,
    otherNCAPct: 0.15,
    otherCLPct: 0.25,
    shortDebtPct: 0.05,
    longDebtPct: 0.55,
    otherLTLPct: 0.1,
    seasonality: SUMMER,
    segments: [
      { name: "Accommodation commissions", pct: 0.78 },
      { name: "Flights & transport", pct: 0.08 },
      { name: "Advertising & other", pct: 0.09 },
      { name: "Experiences", pct: 0.05 },
    ],
  },
];

export const COMPANY_LIBRARY: StatementCase[] = SPECS.map(generate);

export function getDailyCompanyIndex(): number {
  const epochDay = Math.floor(Date.now() / 86_400_000);
  return epochDay % COMPANY_LIBRARY.length;
}

export function getDailyCompany(): StatementCase {
  return COMPANY_LIBRARY[getDailyCompanyIndex()];
}

import type { StatementCase, StatementPeriod, PLData, BSData } from "./types";
import { todayISO } from "./utils";
import { projectPeriods } from "./statements";

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
    periods: [...periods, ...projectPeriods(periods)],
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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
    startYear: 2021,
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

  /* ---------------- European large-caps (would hire EY) ---------------- */
  {
    id: "eu_luxury", hiddenName: "Mystery Co. EU-1", sector: "Consumer Discretionary — Luxury Goods (Europe)",
    business: "European luxury conglomerate spanning fashion & leather goods, selective retail, perfumes & cosmetics, watches & jewellery and wines & spirits. Very high margin, iconic brands, global directly-operated retail.",
    unit: "", startYear: 2021, revenue0: 64_000_000_000, growths: [0.23, 0.09, 0.1, 0.05], grossMargin: 0.68,
    salariesPct: 0.1, transportPct: 0.02, marketingPct: 0.12, otherOpexPct: 0.08, daPct: 0.05, interestPct: 0.01, taxRate: 0.25,
    cashPct: 0.1, dso: 20, dio: 130, dpo: 50, ppePct: 0.3, intangiblesPct: 0.55, otherCAPct: 0.05, otherNCAPct: 0.2, otherCLPct: 0.1, shortDebtPct: 0.05, longDebtPct: 0.3, otherLTLPct: 0.15,
    seasonality: HOLIDAY_Q4, segments: [{ name: "Fashion & leather goods", pct: 0.48 }, { name: "Selective retail", pct: 0.18 }, { name: "Watches & jewellery", pct: 0.14 }, { name: "Perfumes & cosmetics", pct: 0.12 }, { name: "Wines & spirits", pct: 0.08 }],
  },
  {
    id: "eu_food", hiddenName: "Mystery Co. EU-2", sector: "Consumer Staples — Packaged Food & Beverage (Europe)",
    business: "World-leading food & beverage group — coffee, petcare, nutrition & health, prepared dishes, dairy and confectionery. Defensive, steady single-digit growth, heavy brands and goodwill.",
    unit: "", startYear: 2021, revenue0: 87_000_000_000, growths: [0.03, 0.08, 0.02, 0.01], grossMargin: 0.47,
    salariesPct: 0.1, transportPct: 0.04, marketingPct: 0.09, otherOpexPct: 0.06, daPct: 0.04, interestPct: 0.02, taxRate: 0.23,
    cashPct: 0.05, dso: 35, dio: 55, dpo: 70, ppePct: 0.3, intangiblesPct: 0.55, otherCAPct: 0.05, otherNCAPct: 0.3, otherCLPct: 0.1, shortDebtPct: 0.1, longDebtPct: 0.45, otherLTLPct: 0.15,
    seasonality: FLAT, segments: [{ name: "Beverages (powdered & liquid)", pct: 0.27 }, { name: "Petcare", pct: 0.2 }, { name: "Nutrition & health", pct: 0.17 }, { name: "Prepared dishes", pct: 0.13 }, { name: "Milk & ice cream", pct: 0.13 }, { name: "Confectionery", pct: 0.1 }],
  },
  {
    id: "eu_industrial", hiddenName: "Mystery Co. EU-3", sector: "Industrials — Diversified Technology (Europe)",
    business: "Diversified industrial-technology group: factory automation & digital industries, smart infrastructure, rail mobility and medical technology. Large order backlog and software content.",
    unit: "", startYear: 2021, revenue0: 62_000_000_000, growths: [0.04, 0.1, 0.08, 0.05], grossMargin: 0.36,
    salariesPct: 0.16, transportPct: 0.02, marketingPct: 0.03, otherOpexPct: 0.06, daPct: 0.04, interestPct: 0.02, taxRate: 0.22,
    cashPct: 0.12, dso: 70, dio: 60, dpo: 55, ppePct: 0.18, intangiblesPct: 0.55, otherCAPct: 0.15, otherNCAPct: 0.2, otherCLPct: 0.15, shortDebtPct: 0.08, longDebtPct: 0.4, otherLTLPct: 0.18,
    seasonality: AUTO, segments: [{ name: "Digital industries", pct: 0.32 }, { name: "Smart infrastructure", pct: 0.28 }, { name: "Healthcare technology", pct: 0.18 }, { name: "Mobility / rail", pct: 0.16 }, { name: "Other", pct: 0.06 }],
  },
  {
    id: "eu_software", hiddenName: "Mystery Co. EU-4", sector: "Technology — Enterprise Software (Europe)",
    business: "European enterprise resource-planning software leader transitioning a large licence base to cloud subscriptions. Very high margin, sticky, big deferred revenue.",
    unit: "", startYear: 2021, revenue0: 28_000_000_000, growths: [0.02, 0.11, 0.06, 0.1], grossMargin: 0.72, marginDriftPpt: 0.004,
    salariesPct: 0.3, transportPct: 0.002, marketingPct: 0.07, otherOpexPct: 0.05, daPct: 0.05, interestPct: 0.01, taxRate: 0.26,
    cashPct: 0.12, dso: 70, dio: 1, dpo: 35, ppePct: 0.15, intangiblesPct: 0.7, otherCAPct: 0.08, otherNCAPct: 0.15, otherCLPct: 0.2, shortDebtPct: 0.05, longDebtPct: 0.2, otherLTLPct: 0.12,
    seasonality: FLAT, segments: [{ name: "Cloud", pct: 0.45 }, { name: "Software licences & support", pct: 0.42 }, { name: "Services", pct: 0.13 }],
  },
  {
    id: "eu_semieq", hiddenName: "Mystery Co. EU-5", sector: "Technology — Semiconductor Equipment (Europe)",
    business: "Near-monopoly supplier of advanced photolithography systems essential to making the most cutting-edge chips. Enormous backlog, high margin, customer advances.",
    unit: "", startYear: 2021, revenue0: 18_000_000_000, growths: [0.35, 0.14, 0.3, 0.03], grossMargin: 0.51, marginDriftPpt: 0.005,
    salariesPct: 0.1, transportPct: 0.01, marketingPct: 0.005, otherOpexPct: 0.06, daPct: 0.03, interestPct: 0.005, taxRate: 0.16,
    cashPct: 0.2, dso: 50, dio: 120, dpo: 30, ppePct: 0.2, intangiblesPct: 0.2, otherCAPct: 0.2, otherNCAPct: 0.1, otherCLPct: 0.3, shortDebtPct: 0.02, longDebtPct: 0.2, otherLTLPct: 0.1,
    seasonality: FLAT, segments: [{ name: "EUV systems", pct: 0.45 }, { name: "DUV systems", pct: 0.3 }, { name: "Installed-base management", pct: 0.25 }],
  },
  {
    id: "eu_brewer", hiddenName: "Mystery Co. EU-6", sector: "Consumer Staples — Brewing (Europe)",
    business: "World's largest brewer with global and local beer brands. High margin but heavily levered from past mega-mergers (huge goodwill), strong emerging-market exposure, summer peak.",
    unit: "", startYear: 2021, revenue0: 54_000_000_000, growths: [0.08, 0.06, 0.03, 0.02], grossMargin: 0.55,
    salariesPct: 0.08, transportPct: 0.06, marketingPct: 0.12, otherOpexPct: 0.06, daPct: 0.06, interestPct: 0.06, taxRate: 0.2,
    cashPct: 0.05, dso: 20, dio: 45, dpo: 90, ppePct: 0.4, intangiblesPct: 1.6, otherCAPct: 0.05, otherNCAPct: 0.1, otherCLPct: 0.12, shortDebtPct: 0.05, longDebtPct: 1.4, otherLTLPct: 0.25,
    seasonality: SUMMER, segments: [{ name: "North America", pct: 0.32 }, { name: "Middle Americas", pct: 0.25 }, { name: "South America", pct: 0.18 }, { name: "EMEA", pct: 0.15 }, { name: "Asia Pacific", pct: 0.1 }],
  },
  {
    id: "eu_aero", hiddenName: "Mystery Co. EU-7", sector: "Industrials — Aerospace (Europe)",
    business: "European aircraft manufacturer — commercial jets, helicopters, defence and space. Very low reported margin, enormous backlog, large customer advances funding working capital.",
    unit: "", startYear: 2021, revenue0: 52_000_000_000, growths: [0.04, 0.13, 0.11, 0.06], grossMargin: 0.15,
    salariesPct: 0.12, transportPct: 0.02, marketingPct: 0.01, otherOpexPct: 0.04, daPct: 0.04, interestPct: 0.01, taxRate: 0.22,
    cashPct: 0.18, dso: 20, dio: 60, dpo: 50, ppePct: 0.18, intangiblesPct: 0.3, otherCAPct: 0.2, otherNCAPct: 0.2, otherCLPct: 0.55, shortDebtPct: 0.03, longDebtPct: 0.15, otherLTLPct: 0.25,
    seasonality: HOLIDAY_Q4, segments: [{ name: "Commercial aircraft", pct: 0.74 }, { name: "Defence & space", pct: 0.14 }, { name: "Helicopters", pct: 0.12 }],
  },
  {
    id: "eu_shipping", hiddenName: "Mystery Co. EU-8", sector: "Industrials — Container Shipping & Logistics (Europe)",
    business: "Global container shipping and integrated logistics group. Hugely cyclical with freight rates — a 2021-22 super-boom then sharp normalisation. Asset-heavy fleet and terminals.",
    unit: "", startYear: 2021, revenue0: 62_000_000_000, growths: [0.32, -0.37, -0.1, 0.05], grossMargin: 0.32, marginDriftPpt: -0.025,
    salariesPct: 0.1, transportPct: 0.1, marketingPct: 0.01, otherOpexPct: 0.05, daPct: 0.07, interestPct: 0.02, taxRate: 0.05,
    cashPct: 0.2, dso: 35, dio: 3, dpo: 35, ppePct: 0.55, intangiblesPct: 0.1, otherCAPct: 0.05, otherNCAPct: 0.1, otherCLPct: 0.12, shortDebtPct: 0.05, longDebtPct: 0.25, otherLTLPct: 0.12,
    seasonality: FLAT, segments: [{ name: "Ocean (container shipping)", pct: 0.65 }, { name: "Logistics & services", pct: 0.27 }, { name: "Terminals", pct: 0.08 }],
  },

  /* ---------------- Serbian (APR) large companies --------------------- */
  {
    id: "rs_oil", hiddenName: "Mystery Co. RS-1", sector: "Energy — Oil & Gas (Serbia)",
    business: "Vertically-integrated Serbian oil & gas company — exploration & production, refining, and a regional retail fuel-station network across the Balkans. The dominant domestic energy group.",
    unit: "", startYear: 2021, revenue0: 3_000_000_000, growths: [0.55, 0.1, -0.05, 0.03], grossMargin: 0.3,
    salariesPct: 0.06, transportPct: 0.04, marketingPct: 0.01, otherOpexPct: 0.06, daPct: 0.08, interestPct: 0.02, taxRate: 0.15,
    cashPct: 0.06, dso: 25, dio: 30, dpo: 35, ppePct: 0.7, intangiblesPct: 0.05, otherCAPct: 0.05, otherNCAPct: 0.08, otherCLPct: 0.1, shortDebtPct: 0.05, longDebtPct: 0.2, otherLTLPct: 0.1,
    seasonality: FLAT, segments: [{ name: "Refining & wholesale", pct: 0.55 }, { name: "Retail fuel network", pct: 0.3 }, { name: "Exploration & production", pct: 0.15 }],
  },
  {
    id: "rs_telecom", hiddenName: "Mystery Co. RS-2", sector: "Communications — Telecom (Serbia)",
    business: "Serbian incumbent telecom operator — mobile, fixed-line, broadband and pay-TV across Serbia and neighbouring markets. Heavy network assets and leverage from regional expansion.",
    unit: "", startYear: 2021, revenue0: 1_300_000_000, growths: [0.1, 0.12, 0.08, 0.06], grossMargin: 0.58,
    salariesPct: 0.12, transportPct: 0.02, marketingPct: 0.06, otherOpexPct: 0.1, daPct: 0.2, interestPct: 0.05, taxRate: 0.15,
    cashPct: 0.05, dso: 45, dio: 5, dpo: 60, ppePct: 0.9, intangiblesPct: 0.4, otherCAPct: 0.05, otherNCAPct: 0.1, otherCLPct: 0.15, shortDebtPct: 0.1, longDebtPct: 0.8, otherLTLPct: 0.2,
    seasonality: FLAT, segments: [{ name: "Mobile", pct: 0.5 }, { name: "Fixed & broadband", pct: 0.28 }, { name: "TV & media", pct: 0.14 }, { name: "Wholesale", pct: 0.08 }],
  },
  {
    id: "rs_pharma", hiddenName: "Mystery Co. RS-3", sector: "Healthcare — Pharmaceuticals (Serbia)",
    business: "Serbian generic-pharmaceutical manufacturer exporting across CEE and beyond, part of a larger international group. Strong R&D and regulatory base, export-driven growth.",
    unit: "", startYear: 2021, revenue0: 450_000_000, growths: [0.08, 0.1, 0.07, 0.05], grossMargin: 0.55,
    salariesPct: 0.16, transportPct: 0.02, marketingPct: 0.1, otherOpexPct: 0.06, daPct: 0.05, interestPct: 0.02, taxRate: 0.15,
    cashPct: 0.08, dso: 70, dio: 100, dpo: 60, ppePct: 0.35, intangiblesPct: 0.2, otherCAPct: 0.05, otherNCAPct: 0.1, otherCLPct: 0.1, shortDebtPct: 0.05, longDebtPct: 0.2, otherLTLPct: 0.1,
    seasonality: FLAT, segments: [{ name: "Domestic", pct: 0.4 }, { name: "Export — CEE", pct: 0.35 }, { name: "Export — other", pct: 0.25 }],
  },
  {
    id: "rs_agri", hiddenName: "Mystery Co. RS-4", sector: "Consumer Staples — Agribusiness (Serbia)",
    business: "Diversified Serbian agribusiness & food group — farming, sugar, food processing and commodity trading across the region. Land-heavy, harvest-seasonal, commodity-exposed.",
    unit: "", startYear: 2021, revenue0: 1_200_000_000, growths: [0.12, 0.18, 0.06, 0.04], grossMargin: 0.16,
    salariesPct: 0.05, transportPct: 0.04, marketingPct: 0.02, otherOpexPct: 0.04, daPct: 0.04, interestPct: 0.03, taxRate: 0.15,
    cashPct: 0.05, dso: 40, dio: 60, dpo: 35, ppePct: 0.4, intangiblesPct: 0.1, otherCAPct: 0.1, otherNCAPct: 0.1, otherCLPct: 0.08, shortDebtPct: 0.12, longDebtPct: 0.3, otherLTLPct: 0.1,
    seasonality: [7, 7, 8, 8, 8, 9, 9, 10, 11, 9, 7, 7], segments: [{ name: "Agriculture & farming", pct: 0.4 }, { name: "Food processing", pct: 0.32 }, { name: "Trading & distribution", pct: 0.28 }],
  },
  {
    id: "rs_confectionery", hiddenName: "Mystery Co. RS-5", sector: "Consumer Staples — Confectionery (Serbia)",
    business: "Serbian confectionery & biscuit maker with iconic regional brands, dominant domestic share and growing exports across former-Yugoslavia and CEE markets.",
    unit: "", startYear: 2021, revenue0: 180_000_000, growths: [0.1, 0.12, 0.08, 0.06], grossMargin: 0.45,
    salariesPct: 0.1, transportPct: 0.05, marketingPct: 0.1, otherOpexPct: 0.06, daPct: 0.04, interestPct: 0.02, taxRate: 0.15,
    cashPct: 0.08, dso: 45, dio: 50, dpo: 55, ppePct: 0.3, intangiblesPct: 0.3, otherCAPct: 0.05, otherNCAPct: 0.1, otherCLPct: 0.1, shortDebtPct: 0.05, longDebtPct: 0.2, otherLTLPct: 0.1,
    seasonality: HOLIDAY_Q4, segments: [{ name: "Biscuits", pct: 0.55 }, { name: "Chocolate", pct: 0.25 }, { name: "Other snacks", pct: 0.2 }],
  },
];

/* ----------------------------------------------------------------------
 * Procedural archetypes — generate ~90 more companies across many sectors,
 * each with a realistic sector "fingerprint" plus deterministic variation,
 * so there are several examples per sector to learn the patterns.
 * -------------------------------------------------------------------- */

const WINTER = [10, 9, 8, 7, 7, 7, 7, 7, 8, 8, 9, 11];
const HARVEST = [7, 7, 8, 8, 8, 9, 9, 10, 11, 9, 7, 7];
const BUILD = [7, 7, 8, 9, 10, 11, 10, 9, 9, 8, 7, 5];

interface Arch {
  key: string;
  sector: string;
  business: string;
  seasonality: number[];
  segs: Seg[];
  gmMin: number;
  gmMax: number;
  sal: number;
  tr: number;
  mk: number;
  ox: number;
  da: number;
  int: number;
  tax: number;
  cash: number;
  dso: number;
  dio: number;
  dpo: number;
  ppe: number;
  intang: number;
  oCA: number;
  oNCA: number;
  oCL: number;
  sDebt: number;
  lDebt: number;
  oLTL: number;
  revMin: number;
  revMax: number;
  growth: number[][];
  count: number;
}

const B = 1_000_000_000;

const ARCHETYPES: Arch[] = [
  { key: "semis", sector: "Technology — Semiconductors", business: "Designs and/or fabricates semiconductor chips. Cyclical demand, high R&D and capex, large inventory.", seasonality: FLAT, segs: [{ name: "Compute & data centre", pct: 0.4 }, { name: "Mobile", pct: 0.27 }, { name: "Automotive & industrial", pct: 0.2 }, { name: "Other", pct: 0.13 }], gmMin: 0.45, gmMax: 0.58, sal: 0.12, tr: 0.01, mk: 0.02, ox: 0.06, da: 0.08, int: 0.01, tax: 0.13, cash: 0.25, dso: 50, dio: 90, dpo: 45, ppe: 0.55, intang: 0.15, oCA: 0.05, oNCA: 0.15, oCL: 0.08, sDebt: 0.03, lDebt: 0.2, oLTL: 0.08, revMin: 4 * B, revMax: 60 * B, growth: [[0.2, 0.3, -0.12, 0.15], [0.1, 0.25, 0.05, -0.05]], count: 4 },
  { key: "meddev", sector: "Healthcare — Medical Devices", business: "Manufactures medical devices and equipment sold to hospitals and clinics. High margin, regulated, M&A-driven intangibles.", seasonality: FLAT, segs: [{ name: "Surgical", pct: 0.35 }, { name: "Diagnostics", pct: 0.3 }, { name: "Cardiovascular", pct: 0.2 }, { name: "Other", pct: 0.15 }], gmMin: 0.58, gmMax: 0.68, sal: 0.16, tr: 0.01, mk: 0.1, ox: 0.05, da: 0.04, int: 0.02, tax: 0.15, cash: 0.1, dso: 65, dio: 110, dpo: 50, ppe: 0.2, intang: 0.5, oCA: 0.05, oNCA: 0.15, oCL: 0.1, sDebt: 0.03, lDebt: 0.35, oLTL: 0.12, revMin: 2 * B, revMax: 30 * B, growth: [[0.07, 0.08, 0.06, 0.07], [0.1, 0.09, 0.08, 0.06]], count: 4 },
  { key: "autoparts", sector: "Consumer Discretionary — Auto Components", business: "Supplies parts and systems to vehicle manufacturers. Mid-teens margin, capital-intensive, cyclical with auto production.", seasonality: AUTO, segs: [{ name: "Powertrain", pct: 0.35 }, { name: "Electronics", pct: 0.3 }, { name: "Interiors", pct: 0.2 }, { name: "Aftermarket", pct: 0.15 }], gmMin: 0.17, gmMax: 0.25, sal: 0.07, tr: 0.03, mk: 0.01, ox: 0.03, da: 0.05, int: 0.015, tax: 0.22, cash: 0.08, dso: 55, dio: 45, dpo: 60, ppe: 0.4, intang: 0.1, oCA: 0.05, oNCA: 0.1, oCL: 0.08, sDebt: 0.05, lDebt: 0.25, oLTL: 0.1, revMin: 2 * B, revMax: 40 * B, growth: [[0.05, 0.08, -0.04, 0.06]], count: 4 },
  { key: "telecom", sector: "Communications — Telecom Operator", business: "Provides mobile and fixed-line connectivity. Huge network assets, high depreciation and leverage, stable cash flows.", seasonality: FLAT, segs: [{ name: "Mobile", pct: 0.55 }, { name: "Fixed broadband", pct: 0.27 }, { name: "Enterprise", pct: 0.13 }, { name: "Other", pct: 0.05 }], gmMin: 0.55, gmMax: 0.62, sal: 0.1, tr: 0.02, mk: 0.06, ox: 0.1, da: 0.18, int: 0.05, tax: 0.22, cash: 0.05, dso: 40, dio: 5, dpo: 60, ppe: 0.85, intang: 0.55, oCA: 0.05, oNCA: 0.1, oCL: 0.15, sDebt: 0.08, lDebt: 0.85, oLTL: 0.25, revMin: 5 * B, revMax: 50 * B, growth: [[0.01, 0.02, 0.01, 0.0], [0.03, 0.02, 0.02, 0.01]], count: 4 },
  { key: "utility", sector: "Utilities — Power & Gas", business: "Regulated generation and distribution of electricity/gas. Enormous asset base, high leverage, stable regulated returns.", seasonality: WINTER, segs: [{ name: "Networks", pct: 0.45 }, { name: "Generation", pct: 0.3 }, { name: "Retail supply", pct: 0.2 }, { name: "Renewables", pct: 0.05 }], gmMin: 0.3, gmMax: 0.4, sal: 0.08, tr: 0.03, mk: 0.005, ox: 0.08, da: 0.12, int: 0.06, tax: 0.2, cash: 0.04, dso: 45, dio: 20, dpo: 50, ppe: 1.5, intang: 0.1, oCA: 0.05, oNCA: 0.15, oCL: 0.1, sDebt: 0.1, lDebt: 1.1, oLTL: 0.3, revMin: 5 * B, revMax: 40 * B, growth: [[0.02, 0.03, 0.01, 0.02]], count: 4 },
  { key: "oilgas", sector: "Energy — Oil & Gas E&P", business: "Explores for and produces crude oil and natural gas. Commodity-priced, very volatile earnings, capital-intensive, depletion charges.", seasonality: FLAT, segs: [{ name: "Upstream — oil", pct: 0.55 }, { name: "Upstream — gas", pct: 0.25 }, { name: "Trading", pct: 0.12 }, { name: "Other", pct: 0.08 }], gmMin: 0.32, gmMax: 0.5, sal: 0.05, tr: 0.03, mk: 0.002, ox: 0.06, da: 0.18, int: 0.03, tax: 0.32, cash: 0.08, dso: 35, dio: 15, dpo: 40, ppe: 1.2, intang: 0.05, oCA: 0.05, oNCA: 0.1, oCL: 0.1, sDebt: 0.05, lDebt: 0.45, oLTL: 0.25, revMin: 5 * B, revMax: 80 * B, growth: [[0.5, 0.2, -0.3, 0.1], [-0.2, 0.6, 0.1, -0.1]], count: 4 },
  { key: "chemicals", sector: "Materials — Chemicals", business: "Produces commodity and specialty chemicals. Cyclical, energy-sensitive, mid-twenties gross margin, capital-intensive.", seasonality: STEEL, segs: [{ name: "Performance materials", pct: 0.4 }, { name: "Industrial chemicals", pct: 0.3 }, { name: "Agro", pct: 0.18 }, { name: "Other", pct: 0.12 }], gmMin: 0.2, gmMax: 0.28, sal: 0.08, tr: 0.05, mk: 0.01, ox: 0.04, da: 0.06, int: 0.02, tax: 0.22, cash: 0.07, dso: 50, dio: 60, dpo: 50, ppe: 0.55, intang: 0.15, oCA: 0.05, oNCA: 0.12, oCL: 0.08, sDebt: 0.05, lDebt: 0.3, oLTL: 0.12, revMin: 5 * B, revMax: 60 * B, growth: [[0.1, 0.05, -0.06, 0.03]], count: 4 },
  { key: "machinery", sector: "Industrials — Machinery & Capital Goods", business: "Builds industrial machinery and equipment with a large order book and aftermarket. Long working-capital cycle, service revenue.", seasonality: AUTO, segs: [{ name: "Equipment", pct: 0.6 }, { name: "Aftermarket & service", pct: 0.28 }, { name: "Digital", pct: 0.07 }, { name: "Other", pct: 0.05 }], gmMin: 0.28, gmMax: 0.36, sal: 0.12, tr: 0.03, mk: 0.03, ox: 0.06, da: 0.04, int: 0.015, tax: 0.24, cash: 0.1, dso: 70, dio: 90, dpo: 55, ppe: 0.25, intang: 0.3, oCA: 0.08, oNCA: 0.1, oCL: 0.12, sDebt: 0.05, lDebt: 0.25, oLTL: 0.12, revMin: 3 * B, revMax: 50 * B, growth: [[0.06, 0.08, -0.02, 0.05]], count: 4 },
  { key: "construction", sector: "Industrials — Construction & Engineering", business: "Delivers large construction and infrastructure projects. Very low margin, milestone billing, advances from clients (negative WC).", seasonality: BUILD, segs: [{ name: "Infrastructure", pct: 0.45 }, { name: "Buildings", pct: 0.3 }, { name: "Energy & industrial", pct: 0.18 }, { name: "Concessions", pct: 0.07 }], gmMin: 0.1, gmMax: 0.16, sal: 0.06, tr: 0.02, mk: 0.005, ox: 0.03, da: 0.02, int: 0.01, tax: 0.22, cash: 0.12, dso: 80, dio: 30, dpo: 70, ppe: 0.15, intang: 0.08, oCA: 0.15, oNCA: 0.08, oCL: 0.2, sDebt: 0.05, lDebt: 0.12, oLTL: 0.08, revMin: 3 * B, revMax: 40 * B, growth: [[0.08, 0.05, 0.04, 0.06]], count: 4 },
  { key: "hotels", sector: "Consumer Discretionary — Hotels & Leisure", business: "Operates hotels and leisure venues. People-heavy, real-estate-heavy, summer peak, recovered strongly post-2020.", seasonality: SUMMER, segs: [{ name: "Owned & leased hotels", pct: 0.5 }, { name: "Managed & franchised", pct: 0.3 }, { name: "Food & beverage", pct: 0.12 }, { name: "Other", pct: 0.08 }], gmMin: 0.3, gmMax: 0.4, sal: 0.25, tr: 0.02, mk: 0.05, ox: 0.1, da: 0.08, int: 0.04, tax: 0.2, cash: 0.08, dso: 20, dio: 5, dpo: 35, ppe: 0.9, intang: 0.2, oCA: 0.05, oNCA: 0.1, oCL: 0.12, sDebt: 0.06, lDebt: 0.55, oLTL: 0.2, revMin: 1 * B, revMax: 20 * B, growth: [[-0.5, 0.65, 0.4, 0.1]], count: 4 },
  { key: "logistics", sector: "Industrials — Logistics & Shipping", business: "Moves freight by sea/road/air. Fuel-heavy variable cost, asset-heavy fleet, freight-rate cyclicality.", seasonality: FLAT, segs: [{ name: "Ocean freight", pct: 0.55 }, { name: "Logistics & contract", pct: 0.25 }, { name: "Terminals", pct: 0.12 }, { name: "Other", pct: 0.08 }], gmMin: 0.15, gmMax: 0.24, sal: 0.1, tr: 0.08, mk: 0.01, ox: 0.05, da: 0.07, int: 0.025, tax: 0.18, cash: 0.1, dso: 45, dio: 5, dpo: 40, ppe: 0.65, intang: 0.15, oCA: 0.05, oNCA: 0.1, oCL: 0.1, sDebt: 0.06, lDebt: 0.4, oLTL: 0.15, revMin: 3 * B, revMax: 50 * B, growth: [[0.2, 0.4, -0.3, 0.05]], count: 4 },
  { key: "media", sector: "Communications — Media & Entertainment", business: "Creates and distributes content across film, TV and streaming. Content investment (intangibles), advertising + subscription mix.", seasonality: HOLIDAY_Q4, segs: [{ name: "Streaming & subscription", pct: 0.4 }, { name: "Advertising", pct: 0.3 }, { name: "Content licensing", pct: 0.2 }, { name: "Other", pct: 0.1 }], gmMin: 0.4, gmMax: 0.5, sal: 0.15, tr: 0.01, mk: 0.1, ox: 0.08, da: 0.05, int: 0.03, tax: 0.2, cash: 0.08, dso: 60, dio: 20, dpo: 50, ppe: 0.2, intang: 0.7, oCA: 0.08, oNCA: 0.15, oCL: 0.12, sDebt: 0.05, lDebt: 0.45, oLTL: 0.15, revMin: 2 * B, revMax: 40 * B, growth: [[0.08, 0.1, 0.05, 0.04]], count: 4 },
  { key: "agri", sector: "Consumer Staples — Agribusiness & Food Production", business: "Grows, processes and trades agricultural commodities and food. Thin margins, large inventories, harvest seasonality.", seasonality: HARVEST, segs: [{ name: "Grains & oilseeds", pct: 0.4 }, { name: "Processed food", pct: 0.3 }, { name: "Animal nutrition", pct: 0.2 }, { name: "Other", pct: 0.1 }], gmMin: 0.12, gmMax: 0.18, sal: 0.06, tr: 0.04, mk: 0.02, ox: 0.04, da: 0.04, int: 0.02, tax: 0.2, cash: 0.05, dso: 35, dio: 55, dpo: 35, ppe: 0.35, intang: 0.1, oCA: 0.08, oNCA: 0.1, oCL: 0.08, sDebt: 0.1, lDebt: 0.25, oLTL: 0.1, revMin: 3 * B, revMax: 60 * B, growth: [[0.06, 0.04, 0.05, 0.03]], count: 4 },
  { key: "qsr", sector: "Consumer Discretionary — Restaurants / QSR", business: "Operates and franchises a restaurant chain. Low food COGS but heavy labour and occupancy, franchise royalties, stable growth.", seasonality: FLAT, segs: [{ name: "Company restaurants", pct: 0.55 }, { name: "Franchise royalties", pct: 0.3 }, { name: "Delivery", pct: 0.1 }, { name: "Other", pct: 0.05 }], gmMin: 0.62, gmMax: 0.72, sal: 0.28, tr: 0.02, mk: 0.04, ox: 0.15, da: 0.05, int: 0.03, tax: 0.22, cash: 0.06, dso: 5, dio: 8, dpo: 30, ppe: 0.45, intang: 0.3, oCA: 0.03, oNCA: 0.1, oCL: 0.1, sDebt: 0.05, lDebt: 0.45, oLTL: 0.2, revMin: 1 * B, revMax: 25 * B, growth: [[0.07, 0.08, 0.06, 0.05]], count: 4 },
  { key: "realestate", sector: "Real Estate — Property Operating", business: "Owns and rents a portfolio of investment property. Very asset-heavy, highly levered, stable rental income, high interest cost.", seasonality: FLAT, segs: [{ name: "Office", pct: 0.35 }, { name: "Retail", pct: 0.3 }, { name: "Residential", pct: 0.22 }, { name: "Logistics", pct: 0.13 }], gmMin: 0.65, gmMax: 0.75, sal: 0.05, tr: 0.005, mk: 0.01, ox: 0.15, da: 0.05, int: 0.2, tax: 0.1, cash: 0.05, dso: 20, dio: 0, dpo: 20, ppe: 6.0, intang: 0.05, oCA: 0.05, oNCA: 0.2, oCL: 0.1, sDebt: 0.3, lDebt: 4.0, oLTL: 0.3, revMin: 1 * B, revMax: 10 * B, growth: [[0.05, 0.06, 0.04, 0.05]], count: 4 },
  { key: "itservices", sector: "Technology — IT Services & Consulting", business: "Delivers IT consulting, integration and managed services. People business (cost = staff), asset-light, high receivables.", seasonality: FLAT, segs: [{ name: "Consulting", pct: 0.4 }, { name: "Managed services", pct: 0.35 }, { name: "Cloud & engineering", pct: 0.18 }, { name: "Other", pct: 0.07 }], gmMin: 0.3, gmMax: 0.4, sal: 0.18, tr: 0.01, mk: 0.03, ox: 0.05, da: 0.02, int: 0.01, tax: 0.24, cash: 0.1, dso: 80, dio: 0, dpo: 30, ppe: 0.1, intang: 0.25, oCA: 0.08, oNCA: 0.08, oCL: 0.15, sDebt: 0.03, lDebt: 0.15, oLTL: 0.1, revMin: 2 * B, revMax: 40 * B, growth: [[0.08, 0.1, 0.07, 0.08]], count: 4 },
  { key: "hcdist", sector: "Healthcare — Drug & Medical Distribution", business: "Distributes pharmaceuticals and medical supplies at huge scale. Razor-thin gross margin, enormous revenue, fast inventory turns.", seasonality: FLAT, segs: [{ name: "Pharma distribution", pct: 0.7 }, { name: "Medical & specialty", pct: 0.2 }, { name: "Services", pct: 0.1 }], gmMin: 0.04, gmMax: 0.07, sal: 0.015, tr: 0.01, mk: 0.002, ox: 0.012, da: 0.005, int: 0.005, tax: 0.22, cash: 0.03, dso: 30, dio: 25, dpo: 40, ppe: 0.04, intang: 0.06, oCA: 0.04, oNCA: 0.04, oCL: 0.06, sDebt: 0.03, lDebt: 0.06, oLTL: 0.04, revMin: 30 * B, revMax: 250 * B, growth: [[0.06, 0.07, 0.05, 0.06]], count: 5 },
  { key: "aerospace", sector: "Industrials — Aerospace & Defense", business: "Designs and builds aircraft, systems and defense equipment. Long programmes, big order backlog, large inventory and intangibles.", seasonality: FLAT, segs: [{ name: "Commercial aerospace", pct: 0.45 }, { name: "Defense", pct: 0.35 }, { name: "Space & systems", pct: 0.12 }, { name: "Services", pct: 0.08 }], gmMin: 0.15, gmMax: 0.22, sal: 0.1, tr: 0.02, mk: 0.02, ox: 0.04, da: 0.04, int: 0.02, tax: 0.18, cash: 0.08, dso: 60, dio: 100, dpo: 55, ppe: 0.25, intang: 0.4, oCA: 0.1, oNCA: 0.12, oCL: 0.15, sDebt: 0.05, lDebt: 0.35, oLTL: 0.15, revMin: 5 * B, revMax: 70 * B, growth: [[0.05, 0.06, 0.04, 0.05]], count: 4 },
  { key: "packagedfood", sector: "Consumer Staples — Branded Packaged Food", business: "Owns branded packaged-food products sold through retail. Steady low-growth, brand intangibles, heavy marketing, leverage.", seasonality: FLAT, segs: [{ name: "Snacks", pct: 0.35 }, { name: "Meals & sauces", pct: 0.3 }, { name: "Dairy", pct: 0.2 }, { name: "Other", pct: 0.15 }], gmMin: 0.3, gmMax: 0.4, sal: 0.1, tr: 0.05, mk: 0.08, ox: 0.05, da: 0.03, int: 0.03, tax: 0.22, cash: 0.05, dso: 35, dio: 50, dpo: 60, ppe: 0.3, intang: 0.55, oCA: 0.05, oNCA: 0.15, oCL: 0.1, sDebt: 0.08, lDebt: 0.55, oLTL: 0.15, revMin: 5 * B, revMax: 50 * B, growth: [[0.04, 0.05, 0.03, 0.04]], count: 4 },
  { key: "specialtyretail", sector: "Consumer Discretionary — Specialty Retail", business: "Runs a chain of electronics/home specialty stores plus e-commerce. Mid-twenties margin, seasonal Q4 peak, inventory-heavy.", seasonality: HOLIDAY_Q4, segs: [{ name: "Electronics", pct: 0.45 }, { name: "Home & appliances", pct: 0.3 }, { name: "Services", pct: 0.15 }, { name: "Other", pct: 0.1 }], gmMin: 0.25, gmMax: 0.35, sal: 0.12, tr: 0.03, mk: 0.04, ox: 0.06, da: 0.03, int: 0.015, tax: 0.22, cash: 0.07, dso: 8, dio: 60, dpo: 55, ppe: 0.2, intang: 0.1, oCA: 0.05, oNCA: 0.08, oCL: 0.1, sDebt: 0.05, lDebt: 0.15, oLTL: 0.15, revMin: 3 * B, revMax: 40 * B, growth: [[0.06, 0.05, -0.02, 0.04]], count: 4 },
  { key: "ecommerce", sector: "Consumer Discretionary — E-commerce", business: "Online retail marketplace with fulfilment and third-party sellers. High growth, fulfilment-heavy, negative working capital, Q4 peak.", seasonality: HOLIDAY_Q4, segs: [{ name: "First-party retail", pct: 0.5 }, { name: "Third-party services", pct: 0.25 }, { name: "Advertising", pct: 0.13 }, { name: "Subscriptions & cloud", pct: 0.12 }], gmMin: 0.25, gmMax: 0.42, sal: 0.12, tr: 0.06, mk: 0.06, ox: 0.06, da: 0.05, int: 0.01, tax: 0.16, cash: 0.18, dso: 20, dio: 35, dpo: 80, ppe: 0.35, intang: 0.1, oCA: 0.05, oNCA: 0.12, oCL: 0.18, sDebt: 0.03, lDebt: 0.2, oLTL: 0.15, revMin: 5 * B, revMax: 120 * B, growth: [[0.3, 0.25, 0.15, 0.12]], count: 5 },
  { key: "buildmat", sector: "Materials — Building Materials", business: "Produces cement, aggregates and building products. Heavy, bulky (transport-intensive), capital-intensive, construction-cycle linked.", seasonality: BUILD, segs: [{ name: "Cement", pct: 0.4 }, { name: "Aggregates", pct: 0.3 }, { name: "Ready-mix & products", pct: 0.22 }, { name: "Other", pct: 0.08 }], gmMin: 0.25, gmMax: 0.33, sal: 0.08, tr: 0.06, mk: 0.01, ox: 0.04, da: 0.06, int: 0.02, tax: 0.22, cash: 0.06, dso: 50, dio: 70, dpo: 50, ppe: 0.6, intang: 0.15, oCA: 0.05, oNCA: 0.1, oCL: 0.08, sDebt: 0.05, lDebt: 0.3, oLTL: 0.12, revMin: 3 * B, revMax: 40 * B, growth: [[0.07, 0.06, 0.04, 0.05]], count: 4 },
];

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function fromArchetype(a: Arch, k: number): CompanySpec {
  const rng = mulberry32(hashStr(a.key) + k * 2654435761);
  const jr = (c: number, rel = 0.12) => c * (1 + (rng() * 2 - 1) * rel);
  const revenue0 = a.revMin * Math.pow(a.revMax / a.revMin, rng());
  const gp = a.growth[Math.floor(rng() * a.growth.length)];
  const growths = gp.map((g) => g + (rng() * 2 - 1) * 0.03);
  const gm = a.gmMin + (a.gmMax - a.gmMin) * rng();
  return {
    id: `co_${a.key}_${k}`,
    hiddenName: "Mystery Co.",
    sector: a.sector,
    business: a.business,
    unit: "",
    startYear: 2021,
    revenue0: Math.round(revenue0),
    growths,
    grossMargin: gm,
    salariesPct: jr(a.sal),
    transportPct: jr(a.tr),
    marketingPct: jr(a.mk),
    otherOpexPct: jr(a.ox),
    daPct: jr(a.da),
    interestPct: jr(a.int),
    taxRate: a.tax,
    cashPct: jr(a.cash),
    dso: jr(a.dso),
    dio: jr(a.dio),
    dpo: jr(a.dpo),
    ppePct: jr(a.ppe),
    intangiblesPct: jr(a.intang),
    otherCAPct: jr(a.oCA),
    otherNCAPct: jr(a.oNCA),
    otherCLPct: jr(a.oCL),
    shortDebtPct: jr(a.sDebt),
    longDebtPct: jr(a.lDebt),
    otherLTLPct: jr(a.oLTL),
    seasonality: a.seasonality,
    segments: a.segs,
  };
}

const GENERATED: CompanySpec[] = [];
for (const a of ARCHETYPES) {
  for (let k = 0; k < a.count; k++) GENERATED.push(fromArchetype(a, k));
}

// 10 hand-tuned + ~90 procedural = 100 companies, renumbered #1..#N.
export const COMPANY_LIBRARY: StatementCase[] = [...SPECS, ...GENERATED]
  .map(generate)
  .map((c, i) => ({ ...c, name: `Mystery Co. #${i + 1}` }));

export function getDailyCompanyIndex(): number {
  const epochDay = Math.floor(Date.now() / 86_400_000);
  return epochDay % COMPANY_LIBRARY.length;
}

export function getDailyCompany(): StatementCase {
  return COMPANY_LIBRARY[getDailyCompanyIndex()];
}

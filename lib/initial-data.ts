import type { AppState } from "./types";

/**
 * Initial Career Operating System data for Ognjen Tasovac.
 * Path: EY Transaction & Corporate Finance (Sep 2026) → Partner, PE fund (CEE).
 * Compensation figures are EUR totals, calibrated to the CEE / SEE market.
 */
export const initialState: AppState = {
  version: 1,
  scenario: "base",
  profile: {
    name: "Ognjen Tasovac",
    location: "Belgrade, Serbia",
    startDate: "2026-09-01",
    currentPositionId: "pos_ey_analyst",
    longTermGoal:
      "Partner in a CEE-focused Private Equity fund — originating deals, leading transactions, raising capital and owning carry.",
  },

  positions: [
    {
      id: "pos_ey_analyst",
      title: "Transaction & Corporate Finance Analyst",
      company: "EY",
      startYear: 2026,
      endYear: 2028,
      description:
        "Foundation years. Build the technical core: valuation, financial modelling, due diligence and transaction support across sell-side and buy-side mandates in the CEE/SEE market.",
      skills: [
        "Accounting",
        "Financial Statement Analysis",
        "Valuation",
        "DCF",
        "Trading Comparables",
        "Due Diligence",
      ],
      certifications: ["CFA Level I", "Wall Street Prep — Financial Modeling"],
      requiredDeals: 4,
      requiredModels: 8,
      requiredMemos: 2,
      requiredNetworkScore: 25,
      compensation: 10000,
      color: "#6366f1",
    },
    {
      id: "pos_ey_senior",
      title: "Senior Analyst — Transaction Advisory",
      company: "EY",
      startYear: 2028,
      endYear: 2030,
      description:
        "Own workstreams end-to-end. Lead financial due diligence, build full transaction models, and start managing junior analysts. CFA charter and first real deal sheet.",
      skills: [
        "Transaction Modeling",
        "M&A",
        "Commercial Due Diligence",
        "Deal Structuring",
        "Financial Statement Analysis",
      ],
      certifications: ["CFA Level II", "CFA Level III"],
      requiredDeals: 10,
      requiredModels: 18,
      requiredMemos: 6,
      requiredNetworkScore: 40,
      compensation: 22000,
      color: "#8b5cf6",
    },
    {
      id: "pos_pe_associate",
      title: "Private Equity Associate",
      company: "CEE PE Fund (Mid-Market)",
      startYear: 2030,
      endYear: 2033,
      description:
        "The buy-side jump. Move from advisory to principal investing. LBO modelling, deal screening, commercial diligence and portfolio support. Begin building a personal deal network.",
      skills: [
        "LBO Modeling",
        "Debt Financing",
        "Deal Structuring",
        "Due Diligence",
        "Portfolio Management",
      ],
      certifications: ["CFA Charterholder"],
      requiredDeals: 18,
      requiredModels: 30,
      requiredMemos: 14,
      requiredNetworkScore: 55,
      compensation: 55000,
      color: "#0ea5e9",
    },
    {
      id: "pos_investment_manager",
      title: "Investment Manager",
      company: "CEE PE Fund (Mid-Market)",
      startYear: 2033,
      endYear: 2036,
      description:
        "Lead deals from screening to close. Take board observer seats, manage diligence streams, and own relationships with management teams and advisors. Start sourcing proprietary deals.",
      skills: [
        "Deal Origination",
        "Negotiation",
        "Portfolio Management",
        "Investor Relations",
        "Leadership",
      ],
      certifications: ["INSEAD / LBS Executive Programme (optional)"],
      requiredDeals: 28,
      requiredModels: 42,
      requiredMemos: 24,
      requiredNetworkScore: 68,
      compensation: 120000,
      color: "#10b981",
    },
    {
      id: "pos_principal",
      title: "Principal",
      company: "CEE PE Fund",
      startYear: 2036,
      endYear: 2039,
      description:
        "Own a sub-strategy and a portfolio. Lead investment committee discussions, sit on portfolio boards, and carry meaningful origination and fundraising responsibility. First carry allocation.",
      skills: [
        "Deal Origination",
        "Fundraising",
        "Investor Relations",
        "Leadership",
        "Business Development",
      ],
      certifications: [],
      requiredDeals: 40,
      requiredModels: 55,
      requiredMemos: 36,
      requiredNetworkScore: 80,
      compensation: 260000,
      color: "#f59e0b",
    },
    {
      id: "pos_partner",
      title: "Partner",
      company: "CEE PE Fund",
      startYear: 2039,
      endYear: 2042,
      description:
        "The destination. Generate investment opportunities, lead transactions, raise capital from LPs, and own carry in the fund. Shape strategy and the firm's franchise across the CEE region.",
      skills: [
        "Deal Origination",
        "Fundraising",
        "Investor Relations",
        "Leadership",
        "Negotiation",
        "Business Development",
      ],
      certifications: [],
      requiredDeals: 55,
      requiredModels: 65,
      requiredMemos: 50,
      requiredNetworkScore: 92,
      compensation: 1200000,
      color: "#eab308",
    },
  ],

  skills: [
    skill("Accounting", "Technical", 55, 90, "GAAP/IFRS solid; deepen consolidation & purchase accounting."),
    skill("Financial Statement Analysis", "Technical", 50, 95, "Core EY skill — push toward forensic-level analysis."),
    skill("Valuation", "Technical", 45, 95, "DCF, comps, precedents. Target: bullet-proof in interviews."),
    skill("DCF", "Technical", 48, 92, "Comfortable; refine WACC, terminal value, scenario layers."),
    skill("Trading Comparables", "Technical", 50, 90, "Build a personal CEE comps database."),
    skill("Transaction Modeling", "Transactions", 35, 92, "Integrated 3-statement + transaction adjustments."),
    skill("M&A", "Transactions", 30, 92, "Process, mechanics, SPA basics."),
    skill("Due Diligence", "Transactions", 40, 90, "Financial DD first, then commercial."),
    skill("LBO Modeling", "Investing", 20, 95, "The single most important PE technical skill."),
    skill("Debt Financing", "Investing", 18, 85, "Leverage, covenants, debt structuring."),
    skill("Commercial Due Diligence", "Transactions", 25, 85, "Market sizing, customer work, unit economics."),
    skill("Deal Structuring", "Transactions", 22, 88, "Earn-outs, equity rollovers, instruments."),
    skill("Investor Relations", "Origination", 10, 85, "LP communication and reporting."),
    skill("Fundraising", "Origination", 8, 90, "The partner-defining skill — start early."),
    skill("Deal Origination", "Origination", 12, 95, "Proprietary sourcing is the moat."),
    skill("Portfolio Management", "Investing", 15, 85, "Value creation, board work, 100-day plans."),
    skill("Leadership", "Leadership", 25, 90, "Manage, mentor, set direction."),
    skill("Negotiation", "Leadership", 20, 90, "Term sheets, SPAs, management teams."),
    skill("Business Development", "Origination", 12, 88, "Network into a personal deal pipeline."),
  ],

  deals: [
    {
      id: "deal_seed_1",
      name: "Sell-side FDD — Regional FMCG distributor",
      type: "Due Diligence",
      date: "2026-11-15",
      industry: "Consumer / FMCG",
      size: 35000000,
      description:
        "Financial due diligence support on a mid-market consumer distribution business in the Adriatic region. Quality of earnings and net debt analysis.",
      status: "Planned",
      lessons:
        "First exposure to QoE normalisations and working capital mechanics.",
    },
    {
      id: "deal_seed_2",
      name: "DCF & comps — SaaS valuation pitch",
      type: "Financial Model",
      date: "2027-02-20",
      industry: "Technology / SaaS",
      size: 18000000,
      description:
        "Standalone DCF and trading-comparables valuation for a B2B software company as part of a buy-side pitch.",
      status: "Planned",
      lessons: "Calibrate SaaS multiples; ARR vs revenue valuation nuance.",
    },
  ],

  contacts: [
    {
      id: "c_seed_1",
      name: "Engagement Manager — EY TAS",
      firm: "EY",
      position: "Manager, Transaction Advisory",
      email: "",
      linkedin: "",
      category: "Corporate Finance",
      strength: 6,
      lastContact: "2026-09-15",
      nextFollowUp: "2026-12-01",
      notes: "Direct manager — key reference and sponsor for deal staffing.",
    },
    {
      id: "c_seed_2",
      name: "Associate — CEE Mid-Market Fund",
      firm: "Target PE Fund",
      position: "Investment Associate",
      email: "",
      linkedin: "",
      category: "Private Equity",
      strength: 3,
      lastContact: "2026-10-01",
      nextFollowUp: "2027-01-15",
      notes:
        "Met at a finance conference. The bridge into the buy-side — keep warm.",
    },
  ],

  education: [
    {
      id: "edu_cfa1",
      name: "CFA Level I",
      type: "CFA",
      provider: "CFA Institute",
      progress: 45,
      deadline: "2027-02-15",
      status: "In Progress",
      notes: "Candidate. Target: February 2027 window.",
    },
    {
      id: "edu_cfa2",
      name: "CFA Level II",
      type: "CFA",
      provider: "CFA Institute",
      progress: 0,
      deadline: "2028-05-15",
      status: "Planned",
      notes: "Valuation-heavy level — directly relevant to the job.",
    },
    {
      id: "edu_cfa3",
      name: "CFA Level III",
      type: "CFA",
      provider: "CFA Institute",
      progress: 0,
      deadline: "2029-08-15",
      status: "Planned",
      notes: "Charter completion → unlocks PE credibility.",
    },
    {
      id: "edu_wsp",
      name: "Financial Modeling & Valuation",
      type: "Course",
      provider: "Wall Street Prep",
      progress: 20,
      deadline: "2026-12-31",
      status: "In Progress",
      notes: "Self-paced — finish before starting at EY.",
    },
    {
      id: "edu_lbo",
      name: "LBO Modeling Masterclass",
      type: "Course",
      provider: "Breaking Into Wall Street",
      progress: 0,
      deadline: "2029-06-30",
      status: "Planned",
      notes: "Build the PE technical edge before the buy-side move.",
    },
    {
      id: "edu_mba",
      name: "MBA / Executive Programme (optional)",
      type: "MBA",
      provider: "INSEAD / LBS",
      progress: 0,
      deadline: "2034-09-01",
      status: "Planned",
      notes: "Optional accelerator and network expander if needed.",
    },
  ],

  compensation: buildCompensation(),

  annualNotes: [],

  statementCases: buildStatementCases(),

  training: buildTraining(),
};

function skill(
  name: string,
  category: import("./types").SkillCategory,
  level: number,
  target: number,
  notes: string
): import("./types").Skill {
  return {
    id: `sk_${name.toLowerCase().replace(/[^a-z]+/g, "_")}`,
    name,
    category,
    level,
    target,
    notes,
    updatedAt: "2026-06-11",
  };
}

/**
 * Realistic EUR compensation ramp calibrated to the SERBIAN / CEE market.
 * 2026: EY junior starts in September at ~€750/month gross (≈ €3k for 4 months).
 * Base/bonus grow with seniority; the real wealth comes from carry &
 * co-investment, which switch on at the PE associate stage and scale toward Partner.
 */
function buildCompensation(): import("./types").CompYear[] {
  const rows: Array<[number, number, number, number, number]> = [
    // year, base, bonus, carry, coInvestment
    [2026, 3000, 0, 0, 0], // Sep–Dec only, ~€750/mo
    [2027, 10000, 1000, 0, 0], // first full year at EY
    [2028, 14000, 2000, 0, 0], // senior analyst
    [2029, 18000, 3000, 0, 0],
    [2030, 30000, 12000, 0, 0], // PE Associate — buy-side jump
    [2031, 36000, 18000, 5000, 0],
    [2032, 42000, 24000, 12000, 0],
    [2033, 55000, 35000, 30000, 3000], // Investment Manager
    [2034, 65000, 45000, 60000, 8000],
    [2035, 75000, 55000, 100000, 15000],
    [2036, 95000, 75000, 160000, 30000], // Principal
    [2037, 110000, 95000, 240000, 50000],
    [2038, 125000, 120000, 360000, 80000],
    [2039, 150000, 160000, 550000, 130000], // Partner
    [2040, 175000, 220000, 800000, 200000],
    [2041, 200000, 280000, 1200000, 300000],
  ];
  return rows.map(([year, base, bonus, carry, coInvestment]) => ({
    year,
    base,
    bonus,
    carry,
    coInvestment,
  }));
}

/**
 * One fully worked 3-statement reading so the lab is useful on day one.
 * A seasonal consumer-goods business (revealed, for learning).
 */
function buildStatementCases(): import("./types").StatementCase[] {
  return [
    {
      id: "case_worked_example",
      name: "Worked example — Business A",
      createdAt: "2026-06-11",
      currency: "EUR",
      periods: [
        {
          id: "case_a_fy22",
          label: "FY2022",
          pl: {
            revenue: 24000000,
            cogs: 14400000,
            opex: 6500000,
            otherIncome: 0,
            da: 900000,
            interest: 420000,
            tax: 320000,
          },
          bs: {
            cash: 1200000,
            receivables: 2600000,
            inventory: 3400000,
            otherCA: 300000,
            ppe: 7800000,
            intangibles: 1500000,
            otherNCA: 200000,
            payables: 2900000,
            shortDebt: 1500000,
            otherCL: 600000,
            longDebt: 6000000,
            otherLTL: 400000,
            equity: 5100000,
          },
          seasonality: [6, 6, 7, 8, 9, 10, 11, 11, 9, 8, 8, 7],
          segments: [
            { name: "Retail (own stores)", value: 14000000 },
            { name: "Wholesale", value: 7000000 },
            { name: "E-commerce", value: 3000000 },
          ],
        },
        {
          id: "case_a_fy23",
          label: "FY2023",
          pl: {
            revenue: 28800000,
            cogs: 16700000,
            opex: 7300000,
            otherIncome: 0,
            da: 980000,
            interest: 450000,
            tax: 520000,
          },
          bs: {
            cash: 1600000,
            receivables: 3000000,
            inventory: 3900000,
            otherCA: 350000,
            ppe: 8200000,
            intangibles: 1450000,
            otherNCA: 200000,
            payables: 3300000,
            shortDebt: 1500000,
            otherCL: 700000,
            longDebt: 5600000,
            otherLTL: 400000,
            equity: 6650000,
          },
          seasonality: [6, 6, 7, 8, 9, 10, 12, 12, 9, 8, 8, 5],
          segments: [
            { name: "Retail (own stores)", value: 16000000 },
            { name: "Wholesale", value: 7800000 },
            { name: "E-commerce", value: 5000000 },
          ],
        },
      ],
      answers: {},
      guessSector: "",
      actualSector: "Consumer / Specialty Retail",
      actualBusiness: "Mid-market apparel & lifestyle retailer (illustrative)",
      revealed: true,
      score: 0,
      notes:
        "Fingerprints: ~42% gross margin, meaningful inventory days, summer revenue peak, capital tied up in stores (PP&E). Margin expansion driven by e-commerce mix shift — a higher-quality driver than pure cost cutting.",
    },
    practiceCase(
      "case_saas",
      "Practice — Business B",
      "Technology / B2B SaaS",
      "Vertical B2B software platform (illustrative)",
      [
        {
          id: "saas_fy22",
          label: "FY2022",
          pl: { revenue: 8000000, cogs: 1600000, opex: 5200000, otherIncome: 0, da: 300000, interest: 50000, tax: 100000 },
          bs: { cash: 3000000, receivables: 1300000, inventory: 0, otherCA: 200000, ppe: 400000, intangibles: 1200000, otherNCA: 100000, payables: 400000, shortDebt: 0, otherCL: 1800000, longDebt: 500000, otherLTL: 200000, equity: 3300000 },
          seasonality: [8, 8, 8, 9, 8, 8, 8, 8, 9, 8, 9, 9],
          segments: [
            { name: "Subscriptions (ARR)", value: 6800000 },
            { name: "Professional services", value: 1200000 },
          ],
        },
        {
          id: "saas_fy23",
          label: "FY2023",
          pl: { revenue: 11200000, cogs: 2150000, opex: 6900000, otherIncome: 0, da: 380000, interest: 45000, tax: 220000 },
          bs: { cash: 4200000, receivables: 1750000, inventory: 0, otherCA: 250000, ppe: 450000, intangibles: 1500000, otherNCA: 100000, payables: 500000, shortDebt: 0, otherCL: 2600000, longDebt: 400000, otherLTL: 200000, equity: 4550000 },
          seasonality: [8, 8, 8, 9, 8, 8, 8, 8, 9, 8, 9, 9],
          segments: [
            { name: "Subscriptions (ARR)", value: 9800000 },
            { name: "Professional services", value: 1400000 },
          ],
        },
      ]
    ),
    practiceCase(
      "case_mfg",
      "Practice — Business C",
      "Industrials / Manufacturing",
      "Auto-components manufacturer (illustrative)",
      [
        {
          id: "mfg_fy22",
          label: "FY2022",
          pl: { revenue: 40000000, cogs: 28800000, opex: 6800000, otherIncome: 0, da: 2400000, interest: 1100000, tax: 200000 },
          bs: { cash: 1500000, receivables: 5500000, inventory: 7200000, otherCA: 400000, ppe: 18000000, intangibles: 500000, otherNCA: 300000, payables: 4800000, shortDebt: 3000000, otherCL: 1200000, longDebt: 12000000, otherLTL: 1400000, equity: 11000000 },
          seasonality: [8, 8, 9, 9, 9, 9, 7, 5, 9, 10, 9, 8],
          segments: [
            { name: "OEM", value: 24000000 },
            { name: "Aftermarket", value: 10000000 },
            { name: "Export", value: 6000000 },
          ],
        },
        {
          id: "mfg_fy23",
          label: "FY2023",
          pl: { revenue: 42400000, cogs: 30200000, opex: 7100000, otherIncome: 0, da: 2500000, interest: 1150000, tax: 290000 },
          bs: { cash: 1700000, receivables: 5800000, inventory: 7500000, otherCA: 450000, ppe: 18500000, intangibles: 480000, otherNCA: 300000, payables: 5000000, shortDebt: 3000000, otherCL: 1300000, longDebt: 11000000, otherLTL: 1400000, equity: 13030000 },
          seasonality: [8, 8, 9, 9, 9, 9, 7, 5, 9, 10, 9, 8],
          segments: [
            { name: "OEM", value: 25400000 },
            { name: "Aftermarket", value: 11000000 },
            { name: "Export", value: 6000000 },
          ],
        },
      ]
    ),
    practiceCase(
      "case_grocery",
      "Practice — Business D",
      "Consumer Staples / Grocery Retail",
      "Regional supermarket chain (illustrative)",
      [
        {
          id: "groc_fy22",
          label: "FY2022",
          pl: { revenue: 120000000, cogs: 93600000, opex: 22000000, otherIncome: 0, da: 2800000, interest: 900000, tax: 200000 },
          bs: { cash: 3000000, receivables: 1200000, inventory: 7800000, otherCA: 600000, ppe: 14000000, intangibles: 2000000, otherNCA: 400000, payables: 11000000, shortDebt: 2000000, otherCL: 2200000, longDebt: 7000000, otherLTL: 1000000, equity: 5800000 },
          seasonality: [8, 7, 8, 8, 8, 8, 8, 8, 8, 9, 9, 11],
          segments: [
            { name: "Fresh food", value: 54000000 },
            { name: "Packaged", value: 48000000 },
            { name: "Non-food", value: 18000000 },
          ],
        },
        {
          id: "groc_fy23",
          label: "FY2023",
          pl: { revenue: 124800000, cogs: 97000000, opex: 22800000, otherIncome: 0, da: 2900000, interest: 950000, tax: 250000 },
          bs: { cash: 3400000, receivables: 1300000, inventory: 8100000, otherCA: 650000, ppe: 14500000, intangibles: 2000000, otherNCA: 400000, payables: 11500000, shortDebt: 2000000, otherCL: 2300000, longDebt: 6500000, otherLTL: 1000000, equity: 7050000 },
          seasonality: [8, 7, 8, 8, 8, 8, 8, 8, 8, 9, 9, 11],
          segments: [
            { name: "Fresh food", value: 56000000 },
            { name: "Packaged", value: 50000000 },
            { name: "Non-food", value: 18800000 },
          ],
        },
      ]
    ),
    practiceCase(
      "case_consulting",
      "Practice — Business E",
      "Professional Services / Consulting",
      "Management consulting firm (illustrative)",
      [
        {
          id: "cons_fy22",
          label: "FY2022",
          pl: { revenue: 15000000, cogs: 9000000, opex: 3600000, otherIncome: 0, da: 200000, interest: 80000, tax: 350000 },
          bs: { cash: 1800000, receivables: 3800000, inventory: 0, otherCA: 300000, ppe: 600000, intangibles: 200000, otherNCA: 150000, payables: 700000, shortDebt: 0, otherCL: 1500000, longDebt: 300000, otherLTL: 250000, equity: 4100000 },
          seasonality: [9, 8, 9, 8, 8, 7, 6, 5, 9, 10, 11, 10],
          segments: [
            { name: "Strategy", value: 6000000 },
            { name: "Operations", value: 5250000 },
            { name: "Digital", value: 3750000 },
          ],
        },
        {
          id: "cons_fy23",
          label: "FY2023",
          pl: { revenue: 17700000, cogs: 10500000, opex: 4100000, otherIncome: 0, da: 220000, interest: 70000, tax: 470000 },
          bs: { cash: 2400000, receivables: 4300000, inventory: 0, otherCA: 350000, ppe: 650000, intangibles: 200000, otherNCA: 150000, payables: 800000, shortDebt: 0, otherCL: 1800000, longDebt: 250000, otherLTL: 250000, equity: 4950000 },
          seasonality: [9, 8, 9, 8, 8, 7, 6, 5, 9, 10, 11, 10],
          segments: [
            { name: "Strategy", value: 7100000 },
            { name: "Operations", value: 6200000 },
            { name: "Digital", value: 4400000 },
          ],
        },
      ]
    ),
  ];
}

/** Builds an unrevealed practice case the user can analyse then self-score. */
function practiceCase(
  id: string,
  name: string,
  actualSector: string,
  actualBusiness: string,
  periods: import("./types").StatementPeriod[]
): import("./types").StatementCase {
  return {
    id,
    name,
    createdAt: "2026-06-11",
    currency: "EUR",
    periods,
    answers: {},
    guessSector: "",
    actualSector,
    actualBusiness,
    revealed: false,
    score: 0,
    notes: "",
  };
}

/** Curated, mostly-free training to build the modeling core. */
function buildTraining(): import("./types").TrainingResource[] {
  const r = (
    id: string,
    title: string,
    provider: string,
    category: import("./types").TrainingCategory,
    url: string,
    cost: "Free" | "Freemium",
    description: string
  ): import("./types").TrainingResource => ({
    id,
    title,
    provider,
    category,
    url,
    cost,
    description,
    status: "Not started",
    progress: 0,
  });

  return [
    r(
      "t_asm",
      "Free 3-Statement & LBO Models",
      "ASimpleModel.com",
      "Financial Modeling",
      "https://www.asimplemodel.com/",
      "Free",
      "Genuinely free, step-by-step video course building a 3-statement model and LBO from scratch in Excel. The best free starting point."
    ),
    r(
      "t_damodaran_val",
      "Valuation (full online course)",
      "Aswath Damodaran — NYU Stern",
      "Valuation",
      "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/webcastvaluationonline.htm",
      "Free",
      "The definitive free valuation course — lectures, slides and spreadsheets from the world authority on valuation."
    ),
    r(
      "t_damodaran_cf",
      "Corporate Finance (full online course)",
      "Aswath Damodaran — NYU Stern",
      "Valuation",
      "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/webcastcfonline.htm",
      "Free",
      "Free corporate finance course covering capital structure, cost of capital and value creation — the theory behind the deals."
    ),
    r(
      "t_cfi_3s",
      "Reading Financial Statements",
      "Corporate Finance Institute (CFI)",
      "Accounting",
      "https://corporatefinanceinstitute.com/course/learn-to-read-financial-statements-free-course/",
      "Free",
      "Free CFI course on reading the income statement, balance sheet and cash flow — directly relevant to the 3-statement lab."
    ),
    r(
      "t_cfi_excel",
      "Excel Fundamentals & Shortcuts",
      "Corporate Finance Institute (CFI)",
      "Excel",
      "https://corporatefinanceinstitute.com/course/excel-fundamentals-formulas-for-finance/",
      "Freemium",
      "Build real Excel speed — formulas, shortcuts and formatting used in modeling. Free tier covers the fundamentals."
    ),
    r(
      "t_wsp_free",
      "Free Financial Modeling Lessons",
      "Wall Street Prep",
      "Financial Modeling",
      "https://www.wallstreetprep.com/knowledge/",
      "Freemium",
      "Free knowledge hub with modeling, accounting and valuation primers from one of the standard street training providers."
    ),
    r(
      "t_biws",
      "Free Tutorials (modeling, LBO, M&A)",
      "Mergers & Inquisitions / BIWS",
      "LBO & PE",
      "https://mergersandinquisitions.com/",
      "Freemium",
      "Deep free articles and videos on LBO modeling, M&A and the buy-side recruiting path — written from an ex-banker's perspective."
    ),
    r(
      "t_macabacus",
      "Modeling Best Practices & Shortcuts",
      "Macabacus",
      "Financial Modeling",
      "https://macabacus.com/learn",
      "Freemium",
      "Reference-grade guides on financial modeling structure, formatting and the Excel add-in used across banking."
    ),
    r(
      "t_breakingintolbo",
      "LBO Modeling Walkthrough",
      "Wall Street Oasis",
      "LBO & PE",
      "https://www.wallstreetoasis.com/resources/financial-modeling/lbo-modeling",
      "Free",
      "Free LBO modeling guide plus the largest finance community for PE/IB recruiting Q&A and salary data."
    ),
    r(
      "t_mckinsey_valuation",
      "Valuation: Measuring & Managing Value",
      "McKinsey (book companion / summaries)",
      "Valuation",
      "https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights",
      "Free",
      "McKinsey's corporate finance insights — the practitioner view on value creation that underpins PE theses."
    ),
    r(
      "t_accounting_khan",
      "Accounting & Financial Statements",
      "Khan Academy",
      "Accounting",
      "https://www.khanacademy.org/economics-finance-domain/core-finance",
      "Free",
      "Free fundamentals of accounting and finance — useful to shore up any gaps before CFA and EY."
    ),
    r(
      "t_ma_process",
      "M&A Process & Deal Mechanics",
      "Corporate Finance Institute (CFI)",
      "M&A",
      "https://corporatefinanceinstitute.com/resources/valuation/mergers-acquisitions-ma/",
      "Free",
      "Free explainer library on the end-to-end M&A process, deal structures and synergies."
    ),
  ];
}

"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronLeft,
  Calculator,
  LineChart as LineIcon,
  HelpCircle,
  Eye,
  Check,
  BookOpen,
  FileText,
  Sigma,
  Layers3,
  CalendarPlus,
  Flame,
  ExternalLink,
  Trophy,
  Globe,
  Lock,
  Sparkles,
  DownloadCloud,
  Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { StatementCase, StatementPeriod, PLData, BSData } from "@/lib/types";
import { uid, todayISO, eur, eurFull, formatDate } from "@/lib/utils";
import {
  COMPANY_LIBRARY,
  DATA_SOURCES,
  getDailyCompany,
  getDailyCompanyIndex,
} from "@/lib/company-library";
import {
  analyseCase,
  analysePeriod,
  buildQuiz,
  emptyPL,
  emptyBS,
  MONTHS,
  sumSegments,
  computeStreak,
  statementProficiency,
  projectPeriods,
  withProjection,
  caseCashFlows,
  yearOf,
  gradeQuizAnswer,
  type GradeResult,
} from "@/lib/statements";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Field,
  Badge,
  SectionHeader,
  EmptyState,
} from "../ui";
import { KpiCard } from "../shared";
import CasePlaybook from "./CasePlaybook";
import AnalystView from "./AnalystView";
import Formulas from "./Formulas";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Legend,
} from "recharts";

const PIE_COLORS = ["#4f8ae6", "#ddb341", "#7fa8dc", "#a9c6ee", "#c2925a", "#46b6a6"];

function newPeriod(label: string): StatementPeriod {
  return {
    id: uid("per"),
    label,
    pl: emptyPL(),
    bs: emptyBS(),
    seasonality: Array(12).fill(100 / 12),
    segments: [],
  };
}

function newCase(name: string): StatementCase {
  return {
    id: uid("case"),
    name,
    createdAt: todayISO(),
    currency: "EUR",
    periods: [newPeriod("FY2023")],
    answers: {},
    guessSector: "",
    actualSector: "",
    actualBusiness: "",
    revealed: false,
    score: 0,
    notes: "",
  };
}

export function Statements() {
  const { state, setState } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [libShown, setLibShown] = useState(12);

  const [secQuery, setSecQuery] = useState("");
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState<string | null>(null);

  const cases = state.statementCases;
  const active = cases.find((c) => c.id === selected) || null;
  const streak = computeStreak(cases);
  const proficiency = statementProficiency(cases);
  const daily = getDailyCompany();
  const dailyNumber = getDailyCompanyIndex() + 1;
  const dailyDone = cases.some((c) => c.id === daily.id && c.revealed);
  const libraryDoneCount = COMPANY_LIBRARY.filter((t) =>
    cases.some((c) => c.id === t.id && c.revealed)
  ).length;

  function createCase() {
    const c = newCase(`Business ${String.fromCharCode(65 + cases.length)}`);
    setState((prev) => ({ ...prev, statementCases: [c, ...prev.statementCases] }));
    setSelected(c.id);
  }
  function updateCase(updated: StatementCase) {
    setState((prev) => ({
      ...prev,
      statementCases: prev.statementCases.map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  }
  function removeCase(id: string) {
    setState((prev) => ({
      ...prev,
      statementCases: prev.statementCases.filter((c) => c.id !== id),
    }));
    setSelected(null);
  }

  function openLibraryCompany(tpl: StatementCase) {
    setState((prev) => {
      if (prev.statementCases.some((c) => c.id === tpl.id)) return prev;
      const copy = JSON.parse(JSON.stringify(tpl)) as StatementCase;
      copy.createdAt = todayISO();
      return { ...prev, statementCases: [copy, ...prev.statementCases] };
    });
    setSelected(tpl.id);
  }

  async function importFromSec(query: string) {
    if (!query.trim()) return;
    setSecError(null);
    setSecLoading(true);
    try {
      const res = await fetch(`/api/sec?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Import failed");
      const id = `sec_${json.company.cik}`;
      const co = json.company as {
        name: string;
        sector: string;
        cik: string;
        ticker: string;
        currency: string;
      };
      const actualPeriods: StatementPeriod[] = (json.periods as any[]).map((p) => ({
        id: `${id}_${p.label}`,
        label: p.label,
        pl: p.pl,
        bs: p.bs,
        seasonality: p.seasonality,
        segments: p.segments,
        projected: false,
      }));
      const newCase: StatementCase = {
        id,
        name: `${co.name}${co.ticker ? ` (${co.ticker})` : ""}`,
        createdAt: todayISO(),
        currency: co.currency,
        periods: [...actualPeriods, ...projectPeriods(actualPeriods)],
        answers: {},
        guessSector: "",
        actualSector: co.sector,
        actualBusiness: co.name,
        revealed: true,
        score: 0,
        notes: `Imported from SEC EDGAR · ${co.ticker || ""} · CIK ${co.cik} · figures as reported (${co.currency}).`,
      };
      setState((prev) => ({
        ...prev,
        statementCases: [
          newCase,
          ...prev.statementCases.filter((c) => c.id !== id),
        ],
      }));
      setSecQuery("");
      setSelected(id);
    } catch (e) {
      setSecError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setSecLoading(false);
    }
  }

  // Daily challenge = a REAL SEC company, identity hidden until reveal.
  const realTicker = realDailyTicker();
  const realDailyId = `secdaily_${realTicker}`;
  const realDailyDone = cases.some((c) => c.id === realDailyId && c.revealed);
  async function loadDailyReal() {
    setRealError(null);
    setRealLoading(true);
    try {
      const res = await fetch(`/api/sec?q=${encodeURIComponent(realTicker)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "SEC fetch failed");
      const co = json.company as { name: string; sector: string; cik: string; ticker: string; currency: string };
      const actualPeriods: StatementPeriod[] = (json.periods as any[]).map((p) => ({
        id: `${realDailyId}_${p.label}`,
        label: p.label,
        pl: p.pl,
        bs: p.bs,
        seasonality: p.seasonality,
        segments: p.segments,
        projected: false,
      }));
      const blindCase: StatementCase = {
        id: realDailyId,
        name: "Daily challenge — real company (hidden)",
        createdAt: todayISO(),
        currency: co.currency,
        periods: [...actualPeriods, ...projectPeriods(actualPeriods)],
        answers: {},
        guessSector: "",
        actualSector: co.sector,
        actualBusiness: `${co.name}${co.ticker ? ` (${co.ticker})` : ""} · CIK ${co.cik}`,
        revealed: false,
        score: 0,
        notes: `Real official SEC 10-K filing · figures as reported (${co.currency}). Identity hidden until you reveal — verify at sec.gov.`,
      };
      setState((prev) => ({
        ...prev,
        statementCases: [blindCase, ...prev.statementCases.filter((c) => c.id !== realDailyId)],
      }));
      setSelected(realDailyId);
    } catch (e) {
      setRealError(e instanceof Error ? e.message : "SEC fetch failed");
    } finally {
      setRealLoading(false);
    }
  }

  if (active) {
    return (
      <CaseDetail
        c={active}
        onBack={() => setSelected(null)}
        onChange={updateCase}
        onDelete={() => removeCase(active.id)}
      />
    );
  }

  return (
    <div>
      <SectionHeader
        title="3-Statement Reading Lab"
        subtitle="Daily practice: read a real business through its P&L, balance sheet and seasonality — then reason like an EY transaction advisor."
        action={
          <Button onClick={createCase}>
            <Plus size={15} /> New reading
          </Button>
        }
      />

      <Card className="mb-4 panel-grad">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Layers3 size={20} />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">The drill.</span>{" "}
            Each day, pick a company, enter at least two years of P&amp;L + balance
            sheet and a monthly seasonality profile (keep the name hidden). The lab
            computes margins, the EBITDA bridge, working-capital days and a forward
            projection, then quizzes you the way EY would — should the investor buy,
            where does revenue come from, why is EBITDA higher and is it justified.
            Finish by guessing the <span className="text-foreground">sector</span>.
            Five sector practice cases (SaaS, manufacturing, grocery, consulting,
            retail) are pre-loaded — open one and guess before revealing.
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Daily streak"
          value={`${streak.current}d`}
          sub={streak.todayDone ? "today done ✓" : "no reading today yet"}
          accent={streak.todayDone ? "positive" : "warning"}
          icon={<Flame size={15} />}
        />
        <KpiCard label="Readings completed" value={streak.completed} sub={`${cases.length} total`} accent="accent" />
        <KpiCard
          label="Statement fluency"
          value={`${proficiency}%`}
          sub="feeds Partner Probability"
          accent="gold"
        />
        <KpiCard label="Open cases" value={cases.length - streak.completed} sub="to analyse & reveal" />
      </div>

      {/* Real Company of the Day — pulled live from SEC EDGAR, identity hidden */}
      <Card className="mb-6 overflow-hidden border-gold/60">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Globe size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                  Real Company of the Day
                </span>
                <Badge variant={realDailyDone ? "positive" : "warning"}>
                  {realDailyDone ? "Solved ✓" : "Live from SEC"}
                </Badge>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold">
                Today&apos;s real mystery filing
              </h3>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                A real US-listed company pulled <span className="text-foreground">live from official SEC 10-K filings</span> —
                5 actual years + 3 projected. Identity hidden: analyse it blind, then reveal the real
                name (and verify on sec.gov). The 99%-accurate, registry-sourced challenge.
              </p>
              {realError && <p className="mt-2 text-xs text-red-400">{realError}</p>}
            </div>
          </div>
          <Button variant="gold" onClick={loadDailyReal} disabled={realLoading}>
            {realLoading ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
            {realLoading ? "Pulling from SEC…" : "Analyse today's real company"}
          </Button>
        </div>
      </Card>

      {/* Company of the day */}
      <Card className="mb-6 overflow-hidden border-gold/40">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Practice Company (synthetic)
                </span>
                <Badge variant={dailyDone ? "positive" : "warning"}>
                  {dailyDone ? "Solved ✓" : "Training"}
                </Badge>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold">
                Synthetic drill · #{dailyNumber} of {COMPANY_LIBRARY.length}
              </h3>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                A built archetype (not a real filing) for extra reps. Read its P&amp;L, balance
                sheet and seasonality, decide the sector, whether to buy and at what price — then
                reveal. For real, registry-sourced data use the SEC challenge above.
              </p>
            </div>
          </div>
          <Button variant="gold" onClick={() => openLibraryCompany(daily)}>
            <Sparkles size={15} /> Analyse today's company
          </Button>
        </div>
      </Card>

      {/* Import real statements from SEC EDGAR */}
      <Card className="mb-6 border-accent/30">
        <CardHeader className="flex-row items-center gap-2">
          <DownloadCloud size={16} className="text-accent" />
          <CardTitle>Import real statements from SEC EDGAR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Type a ticker (or CIK) and pull the company's real consolidated P&amp;L
            and balance sheet for the last 5 fiscal years, straight from official
            SEC filings — then analyse and project it like any other reading.
            Works for US-listed filers (10-K / 20-F).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={secQuery}
              onChange={(e) => setSecQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && !secLoading && importFromSec(secQuery)}
              placeholder="e.g. AAPL, MSFT, KO, NKE, AMZN…"
              className="sm:max-w-xs"
              disabled={secLoading}
            />
            <Button onClick={() => importFromSec(secQuery)} disabled={secLoading || !secQuery.trim()}>
              {secLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <DownloadCloud size={14} /> Import
                </>
              )}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Quick picks:</span>
            {["AAPL", "MSFT", "KO", "NKE", "AMZN", "TSLA", "PFE", "WMT"].map((t) => (
              <button
                key={t}
                disabled={secLoading}
                onClick={() => importFromSec(t)}
                className="rounded border border-border bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
          {secError && (
            <p className="mt-2 text-xs text-negative">⚠ {secError}</p>
          )}
        </CardContent>
      </Card>

      {/* Where to find official statements */}
      <Card className="mb-6">
        <CardHeader className="flex-row items-center gap-2">
          <Globe size={16} className="text-accent" />
          <CardTitle>Where to find official financial statements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Pull real filings for the prior years, then build your own 3-year
            projection in the Projection tab — the analyst's job.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DATA_SOURCES.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-3 rounded-md border border-border bg-elevated/50 p-3 transition-colors hover:border-accent/40 hover:bg-elevated"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.name}</span>
                    <Badge>{s.region}</Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {s.note}
                  </p>
                </div>
                <ExternalLink size={14} className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-accent" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company library — the guessing deck */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Company Library</h2>
          <p className="text-xs text-muted-foreground">
            {COMPANY_LIBRARY.length} anonymised businesses across ~30 sectors ·{" "}
            {libraryDoneCount}/{COMPANY_LIBRARY.length} solved. Several names per
            sector so you learn the patterns — a new one is featured every day.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {COMPANY_LIBRARY.slice(0, libShown).map((tpl) => {
          const saved = cases.find((c) => c.id === tpl.id);
          const solved = saved?.revealed;
          const a = analyseCase(tpl);
          return (
            <Card
              key={tpl.id}
              className="hover-lift cursor-pointer p-5"
              onClick={() => openLibraryCompany(tpl)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{tpl.name}</h3>
                {solved ? (
                  <Badge variant="positive">Solved</Badge>
                ) : (
                  <Lock size={13} className="text-muted-foreground" />
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Latest rev" value={a.latest ? eur(a.latest.revenue) : "—"} />
                <Mini label="EBITDA %" value={a.latest ? `${a.latest.ebitdaMargin.toFixed(0)}%` : "—"} />
                <Mini label="5y CAGR" value={`${a.revenueCagr.toFixed(0)}%`} />
              </div>
              <div className="mt-3 rounded-md bg-elevated px-3 py-2 text-xs text-muted-foreground">
                {solved ? (
                  <>
                    <span>Sector: </span>
                    <span className="font-medium text-foreground">{saved?.actualSector}</span>
                  </>
                ) : (
                  "Sector hidden — open to read & guess"
                )}
              </div>
            </Card>
          );
        })}
      </div>
      {libShown < COMPANY_LIBRARY.length && (
        <div className="mb-8 mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setLibShown((n) => Math.min(n + 24, COMPANY_LIBRARY.length))}
          >
            Show more ({COMPANY_LIBRARY.length - libShown} left)
          </Button>
        </div>
      )}
      {libShown >= COMPANY_LIBRARY.length && <div className="mb-8" />}

      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold">My Readings</h2>
        <Button size="sm" variant="secondary" onClick={createCase}>
          <Plus size={14} /> New blank reading
        </Button>
      </div>
      {cases.length === 0 ? (
        <EmptyState
          message="No readings yet. Start your first business analysis."
          action={
            <Button variant="secondary" onClick={createCase}>
              <Plus size={15} /> New reading
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cases.map((c) => {
            const a = analyseCase(c);
            return (
              <Card
                key={c.id}
                className="hover-lift cursor-pointer p-5"
                onClick={() => setSelected(c.id)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{c.name}</h3>
                  {c.revealed ? (
                    <Badge variant="positive">Revealed</Badge>
                  ) : (
                    <Badge variant="warning">Open case</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.periods.length} period(s) · {formatDate(c.createdAt)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Revenue" value={a.latest ? eur(a.latest.revenue) : "—"} />
                  <Mini
                    label="EBITDA %"
                    value={a.latest ? `${a.latest.ebitdaMargin.toFixed(0)}%` : "—"}
                  />
                  <Mini
                    label="Rev CAGR"
                    value={a.periods.length > 1 ? `${a.revenueCagr.toFixed(0)}%` : "—"}
                  />
                </div>
                {c.revealed && c.actualSector && (
                  <div className="mt-3 rounded-md bg-elevated px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Sector: </span>
                    <span className="font-medium">{c.actualSector}</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-elevated px-2 py-2">
      <div className="text-sm font-semibold tabular">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* --------------------------- Case detail ------------------------------- */
/** Curated pool of real US-listed filers (10-K) across sectors for the daily challenge. */
const REAL_DAILY_POOL = [
  "MSFT", "AAPL", "ORCL", "CRM", "ADBE", "NVDA", "INTC", "CSCO",
  "WMT", "COST", "KR", "TGT", "HD", "LOW",
  "KO", "PEP", "PG", "CL", "NKE", "MCD", "SBUX", "MDLZ",
  "PFE", "JNJ", "MRK", "ABBV", "LLY", "UNH",
  "CAT", "DE", "BA", "GE", "HON", "MMM", "F", "GM",
  "XOM", "CVX", "COP",
  "T", "VZ", "DIS", "NFLX", "CMCSA",
  "JPM", "V", "MA", "AXP",
  "UPS", "FDX",
];
function realDailyTicker(): string {
  const epochDay = Math.floor(Date.now() / 86_400_000);
  return REAL_DAILY_POOL[epochDay % REAL_DAILY_POOL.length];
}

type View = "reports" | "edit" | "seasonality" | "analysis" | "analyst" | "quiz" | "playbook" | "formulas";

function CaseDetail({
  c,
  onBack,
  onChange,
  onDelete,
}: {
  c: StatementCase;
  onBack: () => void;
  onChange: (c: StatementCase) => void;
  onDelete: () => void;
}) {
  const [view, setView] = useState<View>("reports");

  const actualCount = c.periods.filter((p) => !p.projected).length;
  const projCount = c.periods.filter((p) => p.projected).length;

  function addPeriod() {
    const actuals = c.periods.filter((p) => !p.projected);
    const lastLabel = actuals.at(-1)?.label || "FY2024";
    const year = parseInt((lastLabel.match(/\d{4}/) || ["2024"])[0], 10) + 1;
    const next = newPeriod(`FY${year}`);
    const proj = c.periods.filter((p) => p.projected);
    onChange({
      ...c,
      periods: [...actuals, next, ...proj],
    });
  }
  function updatePeriod(id: string, patch: Partial<StatementPeriod>) {
    onChange({
      ...c,
      periods: c.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }
  function removePeriod(id: string) {
    onChange({ ...c, periods: c.periods.filter((p) => p.id !== id) });
  }
  function buildProjection() {
    onChange(withProjection({ ...c, periods: c.periods.filter((p) => !p.projected) }));
  }
  function clearProjection() {
    onChange({ ...c, periods: c.periods.filter((p) => !p.projected) });
  }

  const tabs: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "reports", label: "Reports", icon: <Layers3 size={14} /> },
    { key: "analyst", label: "Analyst View", icon: <FileText size={14} /> },
    { key: "seasonality", label: "Seasonality", icon: <CalendarPlus size={14} /> },
    { key: "analysis", label: "Analysis", icon: <LineIcon size={14} /> },
    { key: "edit", label: "Edit data", icon: <Calculator size={14} /> },
    { key: "quiz", label: "EY Quiz", icon: <HelpCircle size={14} /> },
    { key: "playbook", label: "Case Playbook", icon: <BookOpen size={14} /> },
    { key: "formulas", label: "Formulas", icon: <Sigma size={14} /> },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft size={18} />
          </Button>
          <Input
            value={c.name}
            onChange={(e) => onChange({ ...c, name: e.target.value })}
            className="h-9 w-48 font-display text-base font-semibold"
          />
          <Badge variant="accent">{actualCount} actual</Badge>
          {projCount > 0 && <Badge variant="gold">+{projCount} projected</Badge>}
        </div>
        <div className="flex gap-2">
          {projCount === 0 ? (
            <Button variant="gold" onClick={buildProjection}>
              <CalendarPlus size={14} /> Add 3Y projection
            </Button>
          ) : (
            <Button variant="secondary" onClick={clearProjection}>
              <Trash2 size={14} /> Clear projection
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-panel p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              view === t.key
                ? "bg-accent/15 text-accent"
                : "text-muted-foreground hover:bg-elevated"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {view === "reports" && <ReportsView c={c} />}
      {view === "seasonality" && <SeasonalityView c={c} onChange={onChange} />}
      {view === "analysis" && <AnalysisView c={c} />}
      {view === "edit" && (
        <InputsView
          c={c}
          onUpdatePeriod={updatePeriod}
          onRemovePeriod={removePeriod}
          onAddYear={addPeriod}
        />
      )}
      {view === "quiz" && <QuizView c={c} onChange={onChange} />}
      {view === "analyst" && <AnalystView c={c} />}
      {view === "playbook" && <CasePlaybook />}
      {view === "formulas" && <Formulas />}
    </div>
  );
}

/* ---------------------- Reports: IS / BS / CF -------------------------- */
interface MatrixCol {
  label: string;
  projected: boolean;
}
interface MatrixRow {
  label: string;
  vals: (number | null)[];
  bold?: boolean;
  indent?: boolean;
  memo?: boolean;
  pct?: (string | null)[];
}

function StatementMatrix({
  title,
  subtitle,
  cols,
  rows,
}: {
  title: string;
  subtitle?: string;
  cols: MatrixCol[];
  rows: MatrixRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="sticky left-0 bg-panel px-4 py-2 text-left font-medium">
                {title.split(" ")[0]}
              </th>
              {cols.map((col) => (
                <th
                  key={col.label}
                  className={`px-3 py-2 text-right font-medium ${
                    col.projected ? "text-gold" : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-border/40 ${
                  row.bold ? "bg-elevated/40 font-semibold" : ""
                } ${row.memo ? "text-muted-foreground" : ""}`}
              >
                <td
                  className={`sticky left-0 bg-panel px-4 py-1.5 text-left ${
                    row.indent ? "pl-7 text-muted-foreground" : ""
                  } ${row.bold ? "bg-elevated/40 font-semibold" : ""}`}
                >
                  {row.label}
                </td>
                {row.vals.map((v, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-1.5 text-right tabular ${
                      cols[ci]?.projected ? "text-gold/90" : ""
                    } ${row.bold ? "font-semibold" : ""}`}
                  >
                    {v === null ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      <>
                        {eur(v)}
                        {row.pct && row.pct[ci] && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {row.pct[ci]}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ReportsView({ c }: { c: StatementCase }) {
  const sorted = useMemo(
    () => [...c.periods].sort((a, b) => yearOf(a.label) - yearOf(b.label)),
    [c.periods]
  );
  if (!sorted.length || !sorted.some((p) => p.pl.revenue))
    return <EmptyState message="Enter the statements first (Edit data tab)." />;

  const an = sorted.map(analysePeriod);
  const cols: MatrixCol[] = sorted.map((p) => ({
    label: p.label,
    projected: !!p.projected,
  }));
  const pctMargin = (num: number, den: number) =>
    den ? `${((num / den) * 100).toFixed(0)}%` : "";

  // Income statement
  const isRows: MatrixRow[] = [
    { label: "Revenue", vals: an.map((a) => a.revenue), bold: true },
    { label: "Cost of goods sold", vals: sorted.map((p) => p.pl.cogs), indent: true },
    {
      label: "Gross profit",
      vals: an.map((a) => a.grossProfit),
      bold: true,
      pct: an.map((a) => `${a.grossMargin.toFixed(0)}%`),
    },
    { label: "Salaries & wages", vals: sorted.map((p) => p.pl.salaries), indent: true },
    { label: "Transport & logistics", vals: sorted.map((p) => p.pl.transport), indent: true },
    { label: "Marketing & selling", vals: sorted.map((p) => p.pl.marketing), indent: true },
    { label: "Other operating expenses", vals: sorted.map((p) => p.pl.opex), indent: true },
    {
      label: "EBITDA",
      vals: an.map((a) => a.ebitda),
      bold: true,
      pct: an.map((a) => `${a.ebitdaMargin.toFixed(0)}%`),
    },
    { label: "Depreciation & amortisation", vals: sorted.map((p) => p.pl.da), indent: true },
    { label: "EBIT", vals: an.map((a) => a.ebit), bold: true },
    { label: "Interest", vals: sorted.map((p) => p.pl.interest), indent: true },
    { label: "Tax", vals: sorted.map((p) => p.pl.tax), indent: true },
    {
      label: "Net income",
      vals: an.map((a) => a.netIncome),
      bold: true,
      pct: an.map((a) => `${a.netMargin.toFixed(0)}%`),
    },
  ];

  // Balance sheet
  const bsRows: MatrixRow[] = [
    { label: "Cash", vals: sorted.map((p) => p.bs.cash), indent: true },
    { label: "Receivables", vals: sorted.map((p) => p.bs.receivables), indent: true },
    { label: "Inventory", vals: sorted.map((p) => p.bs.inventory), indent: true },
    { label: "Other current assets", vals: sorted.map((p) => p.bs.otherCA), indent: true },
    { label: "Total current assets", vals: an.map((a) => a.totalCurrentAssets), bold: true },
    { label: "PP&E", vals: sorted.map((p) => p.bs.ppe), indent: true },
    { label: "Intangibles & goodwill", vals: sorted.map((p) => p.bs.intangibles), indent: true },
    { label: "Other non-current assets", vals: sorted.map((p) => p.bs.otherNCA), indent: true },
    { label: "Total assets", vals: an.map((a) => a.totalAssets), bold: true },
    { label: "Payables", vals: sorted.map((p) => p.bs.payables), indent: true },
    { label: "Short-term debt", vals: sorted.map((p) => p.bs.shortDebt), indent: true },
    { label: "Other current liabilities", vals: sorted.map((p) => p.bs.otherCL), indent: true },
    { label: "Long-term debt", vals: sorted.map((p) => p.bs.longDebt), indent: true },
    { label: "Other non-current liabilities", vals: sorted.map((p) => p.bs.otherLTL), indent: true },
    { label: "Total liabilities", vals: an.map((a) => a.totalLiabilities), bold: true },
    { label: "Total equity", vals: an.map((a) => a.totalEquity), bold: true },
    { label: "Net debt", vals: an.map((a) => a.netDebt), memo: true },
  ];

  // Cash flow (indirect) — first period has no prior, so it is blank
  const cf = caseCashFlows(c.periods);
  const cfByLabel = new Map(cf.map((r) => [r.label, r]));
  const cfVal = (sel: (r: (typeof cf)[number]) => number) =>
    sorted.map((p) => {
      const r = cfByLabel.get(p.label);
      return r ? sel(r) : null;
    });
  const cfRows: MatrixRow[] = [
    { label: "Net income", vals: cfVal((r) => r.netIncome), indent: true },
    { label: "+ Depreciation & amortisation", vals: cfVal((r) => r.da), indent: true },
    { label: "± Change in working capital", vals: cfVal((r) => r.deltaWC), indent: true },
    { label: "Operating cash flow", vals: cfVal((r) => r.operating), bold: true },
    { label: "Capex", vals: cfVal((r) => r.capex), indent: true },
    { label: "Other investing", vals: cfVal((r) => r.otherInvesting), indent: true },
    { label: "Investing cash flow", vals: cfVal((r) => r.investing), bold: true },
    { label: "Δ Debt", vals: cfVal((r) => r.debtFlow), indent: true },
    { label: "Equity / dividends", vals: cfVal((r) => r.equityFlow), indent: true },
    { label: "Financing cash flow", vals: cfVal((r) => r.financing), bold: true },
    { label: "Net change in cash", vals: cfVal((r) => r.netChange), bold: true },
    { label: "Closing cash", vals: cfVal((r) => r.closingCash), memo: true },
  ];

  return (
    <div className="space-y-4">
      <Card className="panel-grad">
        <CardContent className="flex items-start gap-3 p-4 text-xs text-muted-foreground">
          <Layers3 size={16} className="mt-0.5 shrink-0 text-accent" />
          <span>
            Three integrated statements across 8 years — actual history plus a 3-year
            analyst projection (the <span className="text-gold">gold</span> columns).
            The cash flow is derived from the P&amp;L and balance-sheet movements
            (indirect method), so it ties the statements together. Figures shown in the
            company's reporting currency.
          </span>
        </CardContent>
      </Card>

      <StatementMatrix
        title="Income Statement"
        subtitle="Revenue down to net income, with margins on the key lines"
        cols={cols}
        rows={isRows}
      />
      <StatementMatrix
        title="Balance Sheet"
        subtitle="What the company owns and owes at each year-end — watch how it shifts"
        cols={cols}
        rows={bsRows}
      />
      <StatementMatrix
        title="Cash Flow Statement"
        subtitle="Indirect method — operating, investing and financing flows derived from the other two statements"
        cols={cols}
        rows={cfRows}
      />
    </div>
  );
}

/* --------------------------- Seasonality ------------------------------- */
function SeasonalityView({
  c,
  onChange,
}: {
  c: StatementCase;
  onChange: (c: StatementCase) => void;
}) {
  const sorted = [...c.periods].sort((a, b) => yearOf(a.label) - yearOf(b.label));
  const actuals = sorted.filter((p) => !p.projected);
  const base = actuals.at(-1) || sorted.at(-1);
  const seas = base?.seasonality || Array(12).fill(100 / 12);
  const total = seas.reduce((x, y) => x + y, 0) || 1;
  const latestRev = base ? analysePeriod(base).revenue : 0;
  const monthly = seas.map((w, i) => ({
    m: MONTHS[i],
    weight: Number(((w / total) * 100).toFixed(1)),
    rev: Math.round((w / total) * latestRev),
  }));

  function setMonth(i: number, v: number) {
    const next = [...seas];
    next[i] = v;
    onChange({
      ...c,
      periods: c.periods.map((p) => ({ ...p, seasonality: next })),
    });
  }

  const peak = monthly.reduce((a, b) => (b.weight > a.weight ? b : a), monthly[0]);
  const trough = monthly.reduce((a, b) => (b.weight < a.weight ? b : a), monthly[0]);

  return (
    <div className="space-y-4">
      <Card className="panel-grad">
        <CardContent className="flex items-start gap-3 p-4 text-xs text-muted-foreground">
          <CalendarPlus size={16} className="mt-0.5 shrink-0 text-accent" />
          <span>
            How revenue moves through the year. Peaks drive working-capital swings and
            peak net debt — key to reading a part-year (LTM) number and sizing a
            revolving facility. Peak: <span className="text-foreground">{peak.m}</span> ·
            Trough: <span className="text-foreground">{trough.m}</span>.
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly revenue profile (latest year)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={0} />
                <YAxis tickFormatter={(v) => eur(v)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={52} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--panel))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => eurFull(v)}
                />
                <Bar dataKey="rev" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seasonality weights (% of annual revenue)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {seas.map((v, i) => (
              <div key={i}>
                <label className="text-[10px] text-muted-foreground">{MONTHS[i]}</label>
                <Input
                  type="number"
                  value={Number(v.toFixed(1))}
                  onChange={(e) => setMonth(i, +e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------- Inputs ---------------------------------- */
const PL_FIELDS: { key: keyof PLData; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "COGS (cost of goods sold)" },
  { key: "salaries", label: "Salaries & wages" },
  { key: "transport", label: "Transport & logistics" },
  { key: "marketing", label: "Marketing & selling" },
  { key: "opex", label: "Other operating expenses (rent, admin…)" },
  { key: "otherIncome", label: "Other income" },
  { key: "da", label: "Depreciation & amortisation" },
  { key: "interest", label: "Interest expense" },
  { key: "tax", label: "Tax" },
];

const BS_FIELDS: { key: keyof BSData; label: string; group: string }[] = [
  { key: "cash", label: "Cash", group: "Assets" },
  { key: "receivables", label: "Receivables", group: "Assets" },
  { key: "inventory", label: "Inventory", group: "Assets" },
  { key: "otherCA", label: "Other current assets", group: "Assets" },
  { key: "ppe", label: "PP&E", group: "Assets" },
  { key: "intangibles", label: "Intangibles / goodwill", group: "Assets" },
  { key: "otherNCA", label: "Other non-current assets", group: "Assets" },
  { key: "payables", label: "Payables", group: "Liabilities" },
  { key: "shortDebt", label: "Short-term debt", group: "Liabilities" },
  { key: "otherCL", label: "Other current liabilities", group: "Liabilities" },
  { key: "longDebt", label: "Long-term debt", group: "Liabilities" },
  { key: "otherLTL", label: "Other non-current liabilities", group: "Liabilities" },
  { key: "equity", label: "Total equity", group: "Equity" },
];

function InputsView({
  c,
  onUpdatePeriod,
  onRemovePeriod,
  onAddYear,
}: {
  c: StatementCase;
  onUpdatePeriod: (id: string, patch: Partial<StatementPeriod>) => void;
  onRemovePeriod: (id: string) => void;
  onAddYear: () => void;
}) {
  const sortedPeriods = [...c.periods].sort(
    (a, b) => yearOf(a.label) - yearOf(b.label)
  );
  const [activePeriod, setActivePeriod] = useState(
    sortedPeriods.filter((p) => !p.projected).at(-1)?.id ||
      sortedPeriods.at(-1)?.id ||
      ""
  );
  const period = c.periods.find((p) => p.id === activePeriod) || c.periods[0];
  if (!period) return <EmptyState message="Add a period to begin." />;
  const a = analysePeriod(period);

  const setPL = (k: keyof PLData, v: number) =>
    onUpdatePeriod(period.id, { pl: { ...period.pl, [k]: v } });
  const setBS = (k: keyof BSData, v: number) =>
    onUpdatePeriod(period.id, { bs: { ...period.bs, [k]: v } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {sortedPeriods.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePeriod(p.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              p.id === activePeriod
                ? "border-accent/40 bg-accent/15 text-accent"
                : p.projected
                ? "border-gold/30 bg-gold/10 text-gold hover:bg-gold/20"
                : "border-border bg-panel text-muted-foreground hover:bg-elevated"
            }`}
          >
            {p.label}
          </button>
        ))}
        <Button size="sm" variant="secondary" onClick={onAddYear}>
          <Plus size={13} /> Add year
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Field label="Period label" className="w-40">
          <Input
            value={period.label}
            onChange={(e) => onUpdatePeriod(period.id, { label: e.target.value })}
          />
        </Field>
        {c.periods.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-5 text-negative"
            onClick={() => onRemovePeriod(period.id)}
          >
            <Trash2 size={13} /> Remove period
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* P&L */}
        <Card>
          <CardHeader>
            <CardTitle>Income Statement (P&amp;L)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PL_FIELDS.map((f) => (
              <Row
                key={f.key}
                label={f.label}
                value={period.pl[f.key]}
                onChange={(v) => setPL(f.key, v)}
              />
            ))}
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <Derived label="Gross profit" value={a.grossProfit} pctOf={`${a.grossMargin.toFixed(1)}% margin`} />
              <Derived label="EBITDA" value={a.ebitda} pctOf={`${a.ebitdaMargin.toFixed(1)}% margin`} highlight />
              <Derived label="EBIT" value={a.ebit} pctOf={`${a.ebitMargin.toFixed(1)}%`} />
              <Derived label="Net income" value={a.netIncome} pctOf={`${a.netMargin.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>

        {/* Balance sheet */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["Assets", "Liabilities", "Equity"].map((g) => (
              <div key={g}>
                <div className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g}
                </div>
                {BS_FIELDS.filter((f) => f.group === g).map((f) => (
                  <Row
                    key={f.key}
                    label={f.label}
                    value={period.bs[f.key]}
                    onChange={(v) => setBS(f.key, v)}
                  />
                ))}
              </div>
            ))}
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <Derived label="Total assets" value={a.totalAssets} />
              <Derived label="Liabilities + equity" value={a.totalLiabilities + a.totalEquity} />
              <div
                className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                  a.balances ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                }`}
              >
                <span>{a.balances ? "Balance sheet balances ✓" : "Out of balance"}</span>
                <span className="tabular">{eur(a.balanceGap)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonality + segments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Seasonality (revenue weight %)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {period.seasonality.map((v, i) => (
                <div key={i}>
                  <label className="text-[10px] text-muted-foreground">{MONTHS[i]}</label>
                  <Input
                    type="number"
                    value={Number(v.toFixed(1))}
                    onChange={(e) => {
                      const next = [...period.seasonality];
                      next[i] = +e.target.value;
                      onUpdatePeriod(period.id, { seasonality: next });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={period.seasonality.map((v, i) => ({ m: MONTHS[i], v }))}>
                  <XAxis dataKey="m" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} interval={0} />
                  <Bar dataKey="v" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Revenue Segments</CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                onUpdatePeriod(period.id, {
                  segments: [...period.segments, { name: "Segment", value: 0 }],
                })
              }
            >
              <Plus size={13} /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {period.segments.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add the revenue split (by product, customer or geography) to test concentration.
              </p>
            )}
            {period.segments.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={s.name}
                  onChange={(e) => {
                    const next = [...period.segments];
                    next[i] = { ...next[i], name: e.target.value };
                    onUpdatePeriod(period.id, { segments: next });
                  }}
                  className="h-8 flex-1 text-xs"
                />
                <Input
                  type="number"
                  value={s.value}
                  onChange={(e) => {
                    const next = [...period.segments];
                    next[i] = { ...next[i], value: +e.target.value };
                    onUpdatePeriod(period.id, { segments: next });
                  }}
                  className="h-8 w-28 text-xs"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() =>
                    onUpdatePeriod(period.id, {
                      segments: period.segments.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="h-8 w-32 text-right text-xs tabular"
      />
    </div>
  );
}

function Derived({
  label,
  value,
  pctOf,
  highlight,
}: {
  label: string;
  value: number;
  pctOf?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={highlight ? "font-medium text-gold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {pctOf && <span className="text-[10px] text-muted-foreground">{pctOf}</span>}
        <span className={`tabular font-semibold ${highlight ? "text-gold" : ""}`}>
          {eurFull(value)}
        </span>
      </span>
    </div>
  );
}

/* ---------------------------- Analysis --------------------------------- */
function AnalysisView({ c }: { c: StatementCase }) {
  const a = analyseCase(c);
  if (!a.latest)
    return <EmptyState message="Enter at least one period of data." />;

  const trend = a.periods.map((p) => ({
    label: p.label,
    Revenue: Math.round(p.revenue),
    EBITDA: Math.round(p.ebitda),
    "EBITDA %": Number(p.ebitdaMargin.toFixed(1)),
    "Gross %": Number(p.grossMargin.toFixed(1)),
  }));

  const seg = c.periods.at(-1)?.segments || [];
  const segTotal = sumSegments(seg);
  const L = a.latest;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Revenue" value={eur(L.revenue)} sub={`${L.label}`} accent="accent" />
        <KpiCard label="EBITDA" value={eur(L.ebitda)} sub={`${L.ebitdaMargin.toFixed(1)}% margin`} accent="gold" />
        <KpiCard
          label="Revenue CAGR"
          value={a.periods.length > 1 ? `${a.revenueCagr.toFixed(1)}%` : "—"}
          sub="across periods"
          accent="positive"
        />
        <KpiCard
          label="Net debt / EBITDA"
          value={`${L.netDebtToEbitda.toFixed(1)}x`}
          sub={`net debt ${eur(L.netDebt)}`}
          accent={L.netDebtToEbitda > 4 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue, EBITDA &amp; Margin Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis yAxisId="l" tickFormatter={(v) => eur(v)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={50} />
                <YAxis yAxisId="r" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={38} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--panel))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" dataKey="Revenue" fill="#4f8ae6" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="l" dataKey="EBITDA" fill="hsl(var(--gold))" radius={[3, 3, 0, 0]} />
                <Line yAxisId="r" dataKey="EBITDA %" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="r" dataKey="Gross %" stroke="#46b6a6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {a.bridge && (
          <Card>
            <CardHeader>
              <CardTitle>EBITDA Bridge · {a.prior?.label} → {a.latest.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <BridgeRow label={`Starting EBITDA (${a.prior?.label})`} value={a.bridge.fromEbitda} bold />
              <BridgeRow label="Volume / growth effect" value={a.bridge.volumeEffect} delta />
              <BridgeRow label="Gross margin effect (price / mix)" value={a.bridge.grossMarginEffect} delta />
              <BridgeRow label="Opex leverage & other" value={a.bridge.otherEffect} delta />
              <BridgeRow label={`Ending EBITDA (${a.latest.label})`} value={a.bridge.toEbitda} bold />
              <p className="pt-2 text-xs text-muted-foreground">
                If margin expansion is driven by gross margin (pricing / mix) it is usually more
                durable than expansion from one-off cost cuts.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Working Capital &amp; Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="DSO (receivable days)" value={`${L.dso.toFixed(0)}d`} />
              <Stat label="DIO (inventory days)" value={`${L.dio.toFixed(0)}d`} />
              <Stat label="DPO (payable days)" value={`${L.dpo.toFixed(0)}d`} />
              <Stat label="Cash conversion cycle" value={`${L.cashConversionCycle.toFixed(0)}d`} highlight />
              <Stat label="Current ratio" value={`${L.currentRatio.toFixed(2)}x`} />
              <Stat label="Working capital" value={eur(L.workingCapital)} />
              <Stat label="ROE" value={`${L.roe.toFixed(1)}%`} />
              <Stat label="ROA" value={`${L.roa.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {seg.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Concentration</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={seg} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {seg.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--panel))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => eurFull(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-2">
              {seg.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {s.name}
                  </span>
                  <span className="tabular text-muted-foreground">
                    {segTotal ? ((s.value / segTotal) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BridgeRow({ label, value, bold, delta }: { label: string; value: number; bold?: boolean; delta?: boolean }) {
  const positive = value >= 0;
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={`tabular ${bold ? "font-semibold" : delta ? (positive ? "text-positive" : "text-negative") : ""}`}>
        {delta && positive ? "+" : ""}
        {eurFull(value)}
      </span>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular ${highlight ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

/* ------------------------------ Quiz ----------------------------------- */
function QuizView({ c, onChange }: { c: StatementCase; onChange: (c: StatementCase) => void }) {
  const quiz = useMemo(() => buildQuiz(c), [c]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [graded, setGraded] = useState<Record<string, GradeResult>>({});

  if (!c.periods.length || !c.periods.some((p) => p.pl.revenue))
    return <EmptyState message="Enter the P&L and balance sheet first, then take the quiz." />;

  function setAnswer(id: string, v: string) {
    onChange({ ...c, answers: { ...c.answers, [id]: v } });
  }

  return (
    <div className="space-y-4">
      <Card className="panel-grad">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Answer each prompt out loud, the way you would in an EY case interview, then type your
          thesis and reveal the data-driven talking points to check yourself.
        </CardContent>
      </Card>

      {quiz.map((q, i) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] text-accent">
                {i + 1}
              </span>
              {q.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={c.answers[q.id] || ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder="Your analysis…"
              className="min-h-[80px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  setGraded((g) => ({ ...g, [q.id]: gradeQuizAnswer(q, c.answers[q.id] || "", c) }))
                }
              >
                <Check size={13} /> Check my answer
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))}
              >
                <Eye size={13} /> {revealed[q.id] ? "Hide" : "Reveal"} talking points
              </Button>
            </div>
            {graded[q.id] &&
              (() => {
                const g = graded[q.id];
                const tone =
                  g.status === "correct"
                    ? "border-green-500/50 bg-green-500/10 text-green-400"
                    : g.status === "incorrect"
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : g.status === "partial"
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-accent/40 bg-accent/10 text-accent";
                const label =
                  g.status === "correct"
                    ? "On the money"
                    : g.status === "incorrect"
                    ? "Off"
                    : g.status === "partial"
                    ? "Defensible"
                    : "Self-check";
                return (
                  <div className={`space-y-2 rounded-md border p-3 text-xs ${tone}`}>
                    <p className="font-semibold uppercase tracking-wide">{label}</p>
                    <p className="text-foreground">{g.message}</p>
                    <p className="text-foreground">
                      <span className="font-medium text-gold">Correct conclusion: </span>
                      {q.correct}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-accent">How we got there: </span>
                      {q.reasoning}
                    </p>
                  </div>
                );
              })()}
            {revealed[q.id] && (
              <div className="space-y-2 rounded-md border border-border bg-elevated p-3 text-xs">
                <p>
                  <span className="font-medium text-accent">Data: </span>
                  {q.hint}
                </p>
                <p>
                  <span className="font-medium text-gold">EY angle: </span>
                  {q.eyAngle}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* The verdict & the reveal */}
      <Card className="border-gold/40">
        <CardHeader>
          <CardTitle className="text-gold">Your verdict &amp; the reveal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Your sector guess">
              <Input
                value={c.guessSector}
                onChange={(e) => onChange({ ...c, guessSector: e.target.value })}
                placeholder="e.g. Industrials — Manufacturing"
              />
            </Field>
            <Field label={`Self-assessed score: ${c.score}/100`}>
              <input
                type="range"
                min={0}
                max={100}
                value={c.score}
                onChange={(e) => onChange({ ...c, score: +e.target.value })}
                className="w-full"
              />
            </Field>
          </div>
          <Field label="Your call — BUY or PASS, at what price / EV-EBITDA multiple, and what does the business actually do?">
            <Textarea
              value={c.notes}
              onChange={(e) => onChange({ ...c, notes: e.target.value })}
              placeholder="My verdict: …  Valuation: …  Business: …"
            />
          </Field>

          {!c.revealed ? (
            <div className="rounded-md border border-dashed border-gold/50 bg-gold/5 p-4 text-center">
              <p className="mb-3 text-xs text-muted-foreground">
                Commit to your guess and verdict above — then reveal the truth.
              </p>
              <Button variant="gold" onClick={() => onChange({ ...c, revealed: true })}>
                <Eye size={14} /> Reveal the answer
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-gold/40 bg-gold/5 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Actual sector">
                  <Input
                    value={c.actualSector}
                    onChange={(e) => onChange({ ...c, actualSector: e.target.value })}
                  />
                </Field>
                <Field label="Actual business">
                  <Input
                    value={c.actualBusiness}
                    onChange={(e) => onChange({ ...c, actualBusiness: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Your guess:{" "}
                  <span className="font-medium text-foreground">{c.guessSector || "—"}</span>{" "}
                  · Actual:{" "}
                  <span className="font-medium text-gold">{c.actualSector || "—"}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => onChange({ ...c, revealed: false })}>
                  Hide answer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
  Layers3,
  CalendarPlus,
  Flame,
  ExternalLink,
  Trophy,
  Globe,
  Lock,
  Sparkles,
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
  projectForward,
  emptyPL,
  emptyBS,
  MONTHS,
  sumSegments,
  computeStreak,
  statementProficiency,
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

const PIE_COLORS = ["#14264a", "#c19a4b", "#3d5a80", "#8aa1c1", "#9c7b30", "#5b7aa8"];

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

      {/* Company of the day */}
      <Card className="mb-6 overflow-hidden border-gold/40">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gold">
                  Company of the Day
                </span>
                <Badge variant={dailyDone ? "positive" : "warning"}>
                  {dailyDone ? "Solved ✓" : "Unsolved"}
                </Badge>
              </div>
              <h3 className="mt-1 font-display text-lg font-semibold">
                Today's mystery business · #{dailyNumber} of {COMPANY_LIBRARY.length}
              </h3>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                Read its P&amp;L, balance sheet and seasonality (5 consolidated years).
                Decide what it does, which sector it is, whether to buy it and at what
                price — then reveal. Identity is hidden until you do.
              </p>
            </div>
          </div>
          <Button variant="gold" onClick={() => openLibraryCompany(daily)}>
            <Sparkles size={15} /> Analyse today's company
          </Button>
        </div>
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
type View = "inputs" | "analysis" | "projection" | "quiz";

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
  const [view, setView] = useState<View>("inputs");
  const analysis = useMemo(() => analyseCase(c), [c]);

  function addPeriod() {
    const lastLabel = c.periods.at(-1)?.label || "FY2023";
    const year = parseInt((lastLabel.match(/\d{4}/) || ["2023"])[0], 10) + 1;
    onChange({ ...c, periods: [...c.periods, newPeriod(`FY${year}`)] });
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

  const tabs: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "inputs", label: "Statements", icon: <Calculator size={14} /> },
    { key: "analysis", label: "Analysis", icon: <LineIcon size={14} /> },
    { key: "projection", label: "Projection", icon: <CalendarPlus size={14} /> },
    { key: "quiz", label: "EY Quiz", icon: <HelpCircle size={14} /> },
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
            className="h-9 w-44 font-display text-base font-semibold"
          />
          <Badge variant="accent">{c.periods.length} periods</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={addPeriod}>
            <Plus size={14} /> Add year
          </Button>
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

      {view === "inputs" && (
        <InputsView
          c={c}
          onUpdatePeriod={updatePeriod}
          onRemovePeriod={removePeriod}
        />
      )}
      {view === "analysis" && <AnalysisView c={c} />}
      {view === "projection" && <ProjectionView c={c} onChange={onChange} />}
      {view === "quiz" && <QuizView c={c} onChange={onChange} />}
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
}: {
  c: StatementCase;
  onUpdatePeriod: (id: string, patch: Partial<StatementPeriod>) => void;
  onRemovePeriod: (id: string) => void;
}) {
  const [activePeriod, setActivePeriod] = useState(c.periods.at(-1)?.id || "");
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
        {c.periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePeriod(p.id)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              p.id === activePeriod
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-border bg-panel text-muted-foreground hover:bg-elevated"
            }`}
          >
            {p.label}
          </button>
        ))}
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
                <Bar yAxisId="l" dataKey="Revenue" fill="#14264a" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="l" dataKey="EBITDA" fill="hsl(var(--gold))" radius={[3, 3, 0, 0]} />
                <Line yAxisId="r" dataKey="EBITDA %" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="r" dataKey="Gross %" stroke="#3d5a80" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
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

/* --------------------------- Projection -------------------------------- */
function ProjectionView({ c, onChange }: { c: StatementCase; onChange: (c: StatementCase) => void }) {
  const a = analyseCase(c);
  const [growth, setGrowth] = useState<number | null>(null);
  const proj = useMemo(() => projectForward(c, growth, 3), [c, growth]);
  if (!a.latest) return <EmptyState message="Enter at least one period to project." />;

  const chartData = [
    ...a.periods.map((p) => ({ label: p.label, Revenue: Math.round(p.revenue), EBITDA: Math.round(p.ebitda), type: "actual" })),
    ...proj.map((p) => ({ label: p.label, Revenue: Math.round(p.revenue), EBITDA: Math.round(p.ebitda), type: "proj" })),
  ];

  const seas = c.periods.at(-1)?.seasonality || Array(12).fill(100 / 12);
  const seasTotal = seas.reduce((x, y) => x + y, 0) || 1;
  const nextYearRev = proj[0]?.revenue || 0;
  const monthly = seas.map((w, i) => ({ m: MONTHS[i], rev: Math.round((w / seasTotal) * nextYearRev) }));

  const effG = growth !== null ? growth : a.periods.length > 1 ? a.revenueCagr : 5;
  const isDecline = effG < -0.5;

  return (
    <div className="space-y-4">
      <Card className="panel-grad">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Forward projection from the latest period, holding the current EBITDA
              margin constant. Pick a growth rate — or model a{" "}
              <span className="text-foreground">decline</span>:
            </div>
            <Badge variant={isDecline ? "negative" : "positive"}>
              {isDecline ? "Projected DECLINE" : "Projected GROWTH"} ·{" "}
              {effG >= 0 ? "+" : ""}
              {effG.toFixed(0)}%/yr
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={growth === null ? "default" : "secondary"} onClick={() => setGrowth(null)}>
              Auto trend {a.periods.length > 1 ? `(${a.revenueCagr >= 0 ? "+" : ""}${a.revenueCagr.toFixed(0)}%)` : "(5%)"}
            </Button>
            {[-15, -10, -5, 5, 10, 15, 20].map((g) => (
              <Button
                key={g}
                size="sm"
                variant={growth === g ? "default" : "secondary"}
                className={g < 0 && growth === g ? "bg-negative text-white hover:bg-negative/90" : ""}
                onClick={() => setGrowth(g)}
              >
                {g > 0 ? "+" : ""}
                {g}%
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue &amp; EBITDA — Actual vs Projected</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tickFormatter={(v) => eur(v)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ background: "hsl(var(--panel))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => eurFull(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Revenue" fill="#14264a" radius={[3, 3, 0, 0]} />
                <Line dataKey="EBITDA" stroke="hsl(var(--gold))" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projected Summary</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Year</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2 text-right">EBITDA</th>
                  <th className="px-4 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {proj.map((p) => (
                  <tr key={p.label} className="border-b border-border/50">
                    <td className="px-4 py-2 font-medium tabular">{p.label}</td>
                    <td className="px-3 py-2 text-right tabular">{eurFull(p.revenue)}</td>
                    <td className="px-3 py-2 text-right tabular text-gold">{eurFull(p.ebitda)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted-foreground">{p.ebitdaMargin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Year Monthly Revenue (seasonal)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="m" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} interval={0} />
                  <YAxis tickFormatter={(v) => eur(v)} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} width={44} />
                  <Tooltip contentStyle={{ background: "hsl(var(--panel))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => eurFull(v)} />
                  <Bar dataKey="rev" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ Quiz ----------------------------------- */
function QuizView({ c, onChange }: { c: StatementCase; onChange: (c: StatementCase) => void }) {
  const quiz = useMemo(() => buildQuiz(c), [c]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

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
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))}
            >
              <Eye size={13} /> {revealed[q.id] ? "Hide" : "Reveal"} talking points
            </Button>
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

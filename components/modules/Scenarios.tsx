"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import type { AppState, ScenarioKey } from "@/lib/types";
import { computeMetrics, SCENARIOS } from "@/lib/calculations";
import { eur, eurFull, cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  SectionHeader,
} from "../ui";
import { StatPill } from "../shared";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const ORDER: ScenarioKey[] = [
  "conservative",
  "base",
  "aggressive",
  "exceptional",
];

const SC_COLOR: Record<ScenarioKey, string> = {
  conservative: "#8fa0bc", // slate
  base: "#4f8ae6", // azure
  aggressive: "#46b6a6", // teal
  exceptional: "#ddb341", // gold
};

export function Scenarios() {
  const { state, setState } = useStore();

  // Probability per scenario, holding the rest of the profile constant.
  const scenarioMetrics = useMemo(() => {
    return ORDER.map((key) => {
      const probe: AppState = { ...state, scenario: key };
      const m = computeMetrics(probe);
      const peakComp =
        Math.max(
          ...state.compensation.map(
            (r) => r.base + r.bonus + r.carry + r.coInvestment
          )
        ) * SCENARIOS[key].compMultiplier;
      const cumulative =
        state.compensation.reduce(
          (a, r) => a + r.base + r.bonus + r.carry + r.coInvestment,
          0
        ) * SCENARIOS[key].compMultiplier;
      return { key, cfg: SCENARIOS[key], probability: m.partnerProbability, peakComp, cumulative };
    });
  }, [state]);

  // Comp trajectory comparison across scenarios.
  const chartData = useMemo(() => {
    const years = [...state.compensation].sort((a, b) => a.year - b.year);
    return years.map((r) => {
      const base = r.base + r.bonus + r.carry + r.coInvestment;
      const row: Record<string, number> = { year: r.year };
      for (const key of ORDER) {
        row[key] = Math.round(base * SCENARIOS[key].compMultiplier);
      }
      return row;
    });
  }, [state.compensation]);

  function pick(key: ScenarioKey) {
    setState((prev) => ({ ...prev, scenario: key }));
  }

  return (
    <div>
      <SectionHeader
        title="Scenario Analysis"
        subtitle="Four futures for the same plan. Switch the active scenario — every score and comp figure across the app recalculates."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scenarioMetrics.map(({ key, cfg, probability, peakComp, cumulative }) => {
          const active = state.scenario === key;
          return (
            <Card
              key={key}
              className={cn(
                "relative cursor-pointer p-5 transition-all hover:border-accent/50",
                active && "border-accent ring-1 ring-accent/40"
              )}
              onClick={() => pick(key)}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check size={12} />
                </span>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: SC_COLOR[key] }}
                />
                <h3 className="text-sm font-semibold">{cfg.label}</h3>
              </div>
              <p className="mt-2 min-h-[56px] text-[11px] leading-relaxed text-muted-foreground">
                {cfg.description}
              </p>
              <div className="mt-3 space-y-2">
                <div className="flex items-end justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Partner probability
                  </span>
                  <span
                    className="text-2xl font-semibold tabular"
                    style={{ color: SC_COLOR[key] }}
                  >
                    {probability}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${probability}%`,
                      background: SC_COLOR[key],
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatPill label="Peak comp" value={eur(peakComp)} />
                <StatPill label="Lifetime" value={eur(cumulative)} />
                <StatPill label="End role" value={<span className="text-[11px]">{cfg.expectedPosition}</span>} />
                <StatPill label="Deals" value={cfg.expectedDeals} />
              </div>
              <Button
                variant={active ? "default" : "secondary"}
                size="sm"
                className="mt-4 w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  pick(key);
                }}
              >
                {active ? "Active scenario" : "Activate"}
              </Button>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compensation Trajectory by Scenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  tickFormatter={(v) => eur(v)}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--panel))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, name) => [eurFull(v), SCENARIOS[name as ScenarioKey].label]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => SCENARIOS[v as ScenarioKey].label}
                />
                {ORDER.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={SC_COLOR[key]}
                    strokeWidth={state.scenario === key ? 2.5 : 1.5}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

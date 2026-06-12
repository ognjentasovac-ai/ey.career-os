"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { SCENARIOS } from "@/lib/calculations";
import { eur, eurFull } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  SectionHeader,
  Badge,
} from "../ui";
import { KpiCard } from "../shared";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = {
  base: "#14264a", // navy
  bonus: "#3d5a80", // steel blue
  carry: "#c19a4b", // gold
  coInvestment: "#8aa1c1", // light steel
};

export function Compensation() {
  const { state, setState } = useStore();
  const [editMode, setEditMode] = useState(false);
  const mult = SCENARIOS[state.scenario].compMultiplier;

  const data = useMemo(
    () =>
      [...state.compensation]
        .sort((a, b) => a.year - b.year)
        .map((r) => {
          const base = Math.round(r.base * mult);
          const bonus = Math.round(r.bonus * mult);
          const carry = Math.round(r.carry * mult);
          const coInvestment = Math.round(r.coInvestment * mult);
          return {
            year: r.year,
            base,
            bonus,
            carry,
            coInvestment,
            total: base + bonus + carry + coInvestment,
          };
        }),
    [state.compensation, mult]
  );

  const totals = useMemo(() => {
    const cumulative = data.reduce((a, r) => a + r.total, 0);
    const peak = data.length ? data[data.length - 1].total : 0;
    const firstYear = data[0]?.total || 0;
    const cagr =
      data.length > 1 && firstYear > 0
        ? (Math.pow(peak / firstYear, 1 / (data.length - 1)) - 1) * 100
        : 0;
    return { cumulative, peak, cagr };
  }, [data]);

  function updateRow(year: number, field: string, value: number) {
    setState((prev) => ({
      ...prev,
      compensation: prev.compensation.map((r) =>
        r.year === year ? { ...r, [field]: value } : r
      ),
    }));
  }

  return (
    <div>
      <SectionHeader
        title="Compensation Roadmap"
        subtitle="Base, bonus, carry and co-investment from EY junior to PE Partner — scaled by your active scenario."
        action={
          <Button
            variant={editMode ? "default" : "secondary"}
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? "Done editing" : "Edit assumptions"}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="2041 total comp"
          value={eur(totals.peak)}
          accent="gold"
        />
        <KpiCard
          label="Cumulative 2026–41"
          value={eur(totals.cumulative)}
          accent="accent"
        />
        <KpiCard label="Comp CAGR" value={`${totals.cagr.toFixed(0)}%`} accent="positive" />
        <KpiCard
          label="Scenario"
          value={SCENARIOS[state.scenario].label}
          sub={`×${mult.toFixed(2)} multiplier`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Total Compensation Build · 2026–2041</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  formatter={(v: number, name) => [eurFull(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="base" stackId="c" fill={COLORS.base} name="Base" />
                <Bar dataKey="bonus" stackId="c" fill={COLORS.bonus} name="Bonus" />
                <Bar dataKey="carry" stackId="c" fill={COLORS.carry} name="Carry" />
                <Bar
                  dataKey="coInvestment"
                  stackId="c"
                  fill={COLORS.coInvestment}
                  name="Co-investment"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                  dot={false}
                  name="Total"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Annual Build {editMode && <span className="text-muted-foreground">· editing base assumptions (pre-scenario)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Year</th>
                <th className="px-3 py-3 text-right">Base</th>
                <th className="px-3 py-3 text-right">Bonus</th>
                <th className="px-3 py-3 text-right">Carry</th>
                <th className="px-3 py-3 text-right">Co-invest</th>
                <th className="px-5 py-3 text-right">Total ({SCENARIOS[state.scenario].label})</th>
              </tr>
            </thead>
            <tbody>
              {[...state.compensation]
                .sort((a, b) => a.year - b.year)
                .map((r) => {
                  const total =
                    (r.base + r.bonus + r.carry + r.coInvestment) * mult;
                  return (
                    <tr
                      key={r.year}
                      className="border-b border-border/50 hover:bg-elevated/50"
                    >
                      <td className="px-5 py-2 font-medium tabular">{r.year}</td>
                      {(["base", "bonus", "carry", "coInvestment"] as const).map(
                        (f) => (
                          <td key={f} className="px-3 py-2 text-right tabular">
                            {editMode ? (
                              <Input
                                type="number"
                                value={r[f]}
                                onChange={(e) =>
                                  updateRow(r.year, f, +e.target.value)
                                }
                                className="h-7 w-24 text-right text-xs"
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {eur(r[f])}
                              </span>
                            )}
                          </td>
                        )
                      )}
                      <td className="px-5 py-2 text-right font-semibold tabular text-gold">
                        {eurFull(total)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: COLORS.base }} />
          Base
        </Badge>
        <Badge>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: COLORS.bonus }} />
          Bonus
        </Badge>
        <Badge>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: COLORS.carry }} />
          Carry — the partner wealth engine
        </Badge>
        <Badge>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: COLORS.coInvestment }} />
          Co-investment
        </Badge>
      </div>
    </div>
  );
}

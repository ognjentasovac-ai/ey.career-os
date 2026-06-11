"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { computeMetrics, SCENARIOS } from "@/lib/calculations";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  SectionHeader,
} from "../ui";
import { ScoreRing } from "../shared";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

export function PartnerProbability() {
  const { state } = useStore();
  const m = useMemo(() => computeMetrics(state), [state]);
  const scenario = SCENARIOS[state.scenario];

  // Contribution of each readiness factor (value * weight), normalised to %.
  const contributions = m.factors
    .map((f) => ({
      label: f.label,
      contribution: Math.round(f.value * f.weight),
      value: Math.round(f.value),
      weight: Math.round(f.weight * 100),
    }))
    .sort((a, b) => b.contribution - a.contribution);

  const top = contributions[0];
  const weakest = [...contributions].sort((a, b) => a.value - b.value)[0];

  const barColor = (v: number) =>
    v >= 70 ? "hsl(var(--positive))" : v >= 40 ? "hsl(var(--gold))" : "hsl(var(--negative))";

  return (
    <div>
      <SectionHeader
        title="Partner Probability Engine"
        subtitle="A weighted model estimating your likelihood of making Partner — driven entirely by the data you log."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-4 p-8">
          <ScoreRing
            value={m.partnerProbability}
            label="Partner Probability"
            sublabel={scenario.label}
            size={180}
            stroke={14}
            color="hsl(var(--gold))"
          />
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Logistic model centred on a fully-built partner profile, with a{" "}
            <span className="text-foreground">{scenario.label}</span> scenario bias of{" "}
            {scenario.probabilityBias >= 0 ? "+" : ""}
            {scenario.probabilityBias}pts.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Factor Contribution to Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contributions}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={130}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--panel))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number, _n, p: any) => [
                      `${p.payload.value}/100 · weight ${p.payload.weight}%`,
                      p.payload.label,
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {contributions.map((c, i) => (
                      <Cell key={i} fill={barColor(c.value)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-positive" /> Biggest driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{top?.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Currently your strongest contribution at {top?.value}/100 with a{" "}
              {top?.weight}% model weight. Keep compounding it — this is where you
              are already winning.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-negative" /> Biggest gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{weakest?.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Sitting at {weakest?.value}/100 — your highest-leverage area to
              improve. Moving this up will lift Partner Probability the fastest.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>How the model works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground">Partner Readiness</span> is a weighted
            blend of eight pillars (experience, education, technical mastery, deal
            track record, modelling output, network, leadership, and origination /
            fundraising). Each contributes according to how much it matters for a
            PE partnership.
          </p>
          <p>
            <span className="text-foreground">Partner Probability</span> takes that
            readiness, over-weights the partner-defining skills (origination,
            leadership, network), adds the scenario bias, and squashes the result
            through a logistic curve so it behaves like a real probability.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="accent">Readiness {m.partnerReadiness}%</Badge>
            <Badge variant="gold">Origination {m.originationScore}%</Badge>
            <Badge variant="positive">Leadership {m.leadershipScore}%</Badge>
            <Badge>Statement fluency {m.statementProficiency}%</Badge>
            <Badge>Network {m.networkScore}%</Badge>
            <Badge>Experience {m.yearsExperience.toFixed(1)}y</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  Briefcase,
  TrendingUp,
  FileText,
  Users,
  GraduationCap,
  Target,
  Layers,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  computeMetrics,
  currentPosition,
  nextPosition,
  SCENARIOS,
} from "@/lib/calculations";
import { eur, eurFull } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from "../ui";
import { KpiCard, ScoreRing, ScoreBar } from "../shared";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PolarRadiusAxis,
} from "recharts";

export function Dashboard() {
  const { state } = useStore();
  const m = useMemo(() => computeMetrics(state), [state]);
  const cur = currentPosition(state);
  const next = nextPosition(state);
  const scenario = SCENARIOS[state.scenario];

  const radarData = [
    { axis: "Technical", value: m.technicalScore },
    { axis: "Statements", value: m.statementProficiency },
    { axis: "Deals", value: Math.min(100, (m.dealsTotal / 55) * 100) },
    { axis: "Network", value: m.networkScore },
    { axis: "Leadership", value: m.leadershipScore },
    { axis: "Origination", value: m.originationScore },
    { axis: "Education", value: m.cfaProgress },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="accent">CURRENT</Badge>
              <span className="text-xs text-muted-foreground">
                {scenario.label} scenario
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {cur?.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {cur?.company} · {cur?.startYear}–{cur?.endYear}
              </p>
            </div>
            {next && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Next target:</span>
                <Badge variant="gold">{next.title}</Badge>
                <span className="text-xs text-muted-foreground">
                  → {next.company}
                </span>
              </div>
            )}
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              {state.profile.longTermGoal}
            </p>
          </div>
          <div className="flex items-center gap-8">
            <ScoreRing
              value={m.overallProgress}
              label="Path to Partner"
              sublabel="overall progress"
              color="hsl(var(--gold))"
            />
            <ScoreRing
              value={m.partnerProbability}
              label="Partner Probability"
              sublabel={scenario.label}
            />
          </div>
        </div>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Experience"
          value={`${m.yearsExperience.toFixed(1)}y`}
          sub="since EY start"
          icon={<Briefcase size={15} />}
        />
        <KpiCard
          label="Transactions"
          value={m.dealsTotal}
          sub={`${m.dealsCompleted} completed`}
          icon={<TrendingUp size={15} />}
          accent="accent"
        />
        <KpiCard
          label="Financial Models"
          value={m.models}
          sub="models + LBOs"
          icon={<Layers size={15} />}
        />
        <KpiCard
          label="Investment Memos"
          value={m.memos}
          sub="IC-grade write-ups"
          icon={<FileText size={15} />}
        />
        <KpiCard
          label="Network"
          value={m.contacts}
          sub={`strength ${m.networkScore}/100`}
          icon={<Users size={15} />}
        />
        <KpiCard
          label="CFA Progress"
          value={`${m.cfaProgress}%`}
          sub="across all levels"
          icon={<GraduationCap size={15} />}
          accent="gold"
        />
        <KpiCard
          label="Partner Readiness"
          value={`${m.partnerReadiness}%`}
          sub="composite score"
          icon={<Target size={15} />}
          accent="positive"
        />
        <KpiCard
          label="Statement Fluency"
          value={`${m.statementProficiency}%`}
          sub={`${m.statementsCompleted}/${m.statementsCount} readings done`}
          icon={<Layers size={15} />}
          accent="accent"
        />
      </div>

      {/* Scores + radar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Capability Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      dataKey="value"
                      stroke="hsl(var(--accent))"
                      fill="hsl(var(--accent))"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-4">
                <ScoreBar label="Partner Readiness" value={m.partnerReadiness} color="bg-gold" />
                <ScoreBar label="Deal Origination" value={m.originationScore} color="bg-accent" />
                <ScoreBar label="Leadership" value={m.leadershipScore} color="bg-sky-500" />
                <ScoreBar label="Technical Mastery" value={m.technicalScore} color="bg-violet-500" />
                <ScoreBar label="Network Strength" value={m.networkScore} color="bg-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {next ? (
              <>
                <div>
                  <div className="text-sm font-semibold">{next.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {next.company} · target {next.startYear}
                  </div>
                </div>
                <Requirement
                  label="Transactions"
                  have={m.dealsTotal}
                  need={next.requiredDeals}
                />
                <Requirement
                  label="Financial models"
                  have={m.models}
                  need={next.requiredModels}
                />
                <Requirement
                  label="Investment memos"
                  have={m.memos}
                  need={next.requiredMemos}
                />
                <Requirement
                  label="Network score"
                  have={m.networkScore}
                  need={next.requiredNetworkScore}
                />
                <div className="rounded-md border border-border bg-elevated p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Expected compensation
                  </div>
                  <div className="mt-0.5 text-lg font-semibold tabular text-gold">
                    {eurFull(
                      next.compensation * SCENARIOS[state.scenario].compMultiplier
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You have reached the top of the ladder. Now build the franchise.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Requirement({
  label,
  have,
  need,
}: {
  label: string;
  have: number;
  need: number;
}) {
  const pct = need > 0 ? Math.min(100, (have / need) * 100) : 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">
          {have} / {need}
        </span>
      </div>
      <Progress value={pct} barClassName={pct >= 100 ? "bg-positive" : "bg-accent"} />
    </div>
  );
}

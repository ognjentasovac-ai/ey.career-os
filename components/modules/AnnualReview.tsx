"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { computeMetrics, currentPosition } from "@/lib/calculations";
import type { AnnualNote } from "@/lib/types";
import { eur } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  Textarea,
  Field,
  Badge,
  SectionHeader,
} from "../ui";

export function AnnualReview() {
  const { state, setState } = useStore();
  const years = useMemo(() => {
    const set = new Set<number>();
    const start = new Date(state.profile.startDate).getFullYear();
    for (let y = start; y <= 2041; y++) set.add(y);
    state.deals.forEach((d) => set.add(new Date(d.date).getFullYear()));
    return Array.from(set).sort((a, b) => a - b);
  }, [state.deals, state.profile.startDate]);

  const [year, setYear] = useState<number>(() => {
    const now = new Date().getFullYear();
    return now;
  });

  const review = useMemo(() => buildReview(state, year), [state, year]);
  const note: AnnualNote = state.annualNotes.find((n) => n.year === year) || {
    year,
    highlights: "",
    weaknesses: "",
    custom: "",
  };

  function updateNote(patch: Partial<AnnualNote>) {
    setState((prev) => {
      const exists = prev.annualNotes.some((n) => n.year === year);
      const merged = { ...note, ...patch, year };
      return {
        ...prev,
        annualNotes: exists
          ? prev.annualNotes.map((n) => (n.year === year ? merged : n))
          : [...prev.annualNotes, merged],
      };
    });
  }

  return (
    <div>
      <SectionHeader
        title="Annual Career Review"
        subtitle="An automatic year-end appraisal — achieved goals, gaps, and the playbook for next year."
        action={
          <Select
            value={year}
            onChange={(e) => setYear(+e.target.value)}
            className="w-32"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-xs text-muted-foreground">Position in {year}</div>
            <div className="text-lg font-semibold">{review.positionTitle}</div>
            <div className="text-xs text-muted-foreground">{review.company}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">{review.dealsThisYear} deals logged</Badge>
            <Badge variant="gold">Comp {eur(review.comp)}</Badge>
            <Badge variant="positive">Readiness {review.readiness}%</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <ReviewCard
          title="Achieved goals"
          icon={<CheckCircle2 size={16} className="text-positive" />}
          items={review.achieved}
          empty="No goals marked complete yet for this year."
        />
        <ReviewCard
          title="Missed / pending goals"
          icon={<XCircle size={16} className="text-negative" />}
          items={review.missed}
          empty="Nothing outstanding — strong year."
        />
        <ReviewCard
          title="Biggest wins"
          icon={<TrendingUp size={16} className="text-accent" />}
          items={review.wins}
          empty="Log completed deals to surface wins."
        />
        <ReviewCard
          title="Weaknesses to address"
          icon={<AlertTriangle size={16} className="text-warning" />}
          items={review.weaknesses}
          empty="No critical weaknesses detected."
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb size={16} className="text-gold" /> Recommendations for{" "}
            {year + 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {review.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                <span className="text-muted-foreground">{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Your reflections · {year}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Personal highlights">
            <Textarea
              value={note.highlights}
              onChange={(e) => updateNote({ highlights: e.target.value })}
              placeholder="What went well that the data doesn't capture?"
            />
          </Field>
          <Field label="What to improve">
            <Textarea
              value={note.weaknesses}
              onChange={(e) => updateNote({ weaknesses: e.target.value })}
              placeholder="Honest self-assessment."
            />
          </Field>
          <Field label="Notes & commitments for next year" className="md:col-span-2">
            <Textarea
              value={note.custom}
              onChange={(e) => updateNote({ custom: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewCard({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                <span className="text-muted-foreground">{it}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

function buildReview(state: import("@/lib/types").AppState, year: number) {
  const m = computeMetrics(state);
  const pos =
    [...state.positions]
      .sort((a, b) => a.startYear - b.startYear)
      .find((p) => year >= p.startYear && year < p.endYear) ||
    currentPosition(state);

  const yearDeals = state.deals.filter(
    (d) => new Date(d.date).getFullYear() === year
  );
  const completed = yearDeals.filter((d) => d.status === "Completed");
  const comp =
    state.compensation.find((c) => c.year === year)?.base !== undefined
      ? (() => {
          const r = state.compensation.find((c) => c.year === year)!;
          return r.base + r.bonus + r.carry + r.coInvestment;
        })()
      : 0;

  const achieved: string[] = [];
  const missed: string[] = [];
  const wins: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Achievements
  if (completed.length)
    achieved.push(
      `Closed ${completed.length} transaction${
        completed.length > 1 ? "s" : ""
      } (${completed.map((d) => d.type).join(", ")}).`
    );
  const passedEdu = state.education.filter(
    (e) =>
      (e.status === "Passed" || e.status === "Completed") &&
      new Date(e.deadline).getFullYear() === year
  );
  passedEdu.forEach((e) => achieved.push(`Completed ${e.name} (${e.provider}).`));
  if (m.networkScore >= (pos?.requiredNetworkScore || 0))
    achieved.push(
      `Network score (${m.networkScore}) meets the ${pos?.title} target.`
    );

  // Missed / pending
  if (pos && m.dealsTotal < pos.requiredDeals)
    missed.push(
      `Deal count ${m.dealsTotal}/${pos.requiredDeals} for ${pos.title} — keep building the sheet.`
    );
  if (pos && m.models < pos.requiredModels)
    missed.push(`Financial models ${m.models}/${pos.requiredModels}.`);
  if (pos && m.memos < pos.requiredMemos)
    missed.push(`Investment memos ${m.memos}/${pos.requiredMemos}.`);
  const dueEdu = state.education.filter(
    (e) =>
      e.status !== "Passed" &&
      e.status !== "Completed" &&
      new Date(e.deadline).getFullYear() === year
  );
  dueEdu.forEach((e) =>
    missed.push(`${e.name} due this year — currently ${e.progress}%.`)
  );

  // Wins
  const biggest = [...yearDeals].sort((a, b) => b.size - a.size)[0];
  if (biggest)
    wins.push(
      `Largest engagement: ${biggest.name} (${eur(biggest.size)}, ${
        biggest.industry || "n/a"
      }).`
    );
  if (m.partnerReadiness >= 50)
    wins.push(`Partner readiness crossed ${m.partnerReadiness}%.`);
  const topSkill = [...state.skills].sort((a, b) => b.level - a.level)[0];
  if (topSkill)
    wins.push(`Strongest skill: ${topSkill.name} at ${topSkill.level}/100.`);

  // Weaknesses — lowest skills
  const lowSkills = [...state.skills]
    .sort((a, b) => a.level - b.level)
    .slice(0, 3);
  lowSkills.forEach((s) =>
    weaknesses.push(`${s.name} only at ${s.level}/100 (target ${s.target}).`)
  );
  if (m.originationScore < 30)
    weaknesses.push(
      `Origination & fundraising (${m.originationScore}) is the partner-defining gap.`
    );

  // Recommendations
  if (m.originationScore < 50)
    recommendations.push(
      "Treat deal origination as a skill: build a proprietary sourcing list and a personal thesis on 2–3 CEE sub-sectors."
    );
  if (pos && m.dealsTotal < pos.requiredDeals)
    recommendations.push(
      `Aim to add ${Math.max(
        2,
        pos.requiredDeals - m.dealsTotal
      )} more logged transactions toward the ${pos.title} bar.`
    );
  if (m.cfaProgress < 100)
    recommendations.push(
      "Stay on the CFA schedule — the charter is the single cheapest credibility signal for the buy-side."
    );
  if (m.networkScore < 60)
    recommendations.push(
      "Convert 3–5 weak ties into strong relationships (strength 8+). Schedule the follow-ups in the CRM."
    );
  recommendations.push(
    "Write one investment memo per quarter on a company you'd actually buy — it compounds judgement and gives you origination material."
  );

  return {
    positionTitle: pos?.title || "—",
    company: pos?.company || "",
    dealsThisYear: yearDeals.length,
    comp,
    readiness: m.partnerReadiness,
    achieved,
    missed,
    wins,
    weaknesses,
    recommendations,
  };
}

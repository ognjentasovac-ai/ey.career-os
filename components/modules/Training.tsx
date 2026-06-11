"use client";

import { useState } from "react";
import { ExternalLink, GraduationCap, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TrainingResource, TrainingCategory, TrainingStatus } from "@/lib/types";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Progress,
  SectionHeader,
} from "../ui";
import { KpiCard } from "../shared";

const CATEGORIES: (TrainingCategory | "All")[] = [
  "All",
  "Financial Modeling",
  "Valuation",
  "Accounting",
  "LBO & PE",
  "M&A",
  "Excel",
];

const STATUS_NEXT: Record<TrainingStatus, TrainingStatus> = {
  "Not started": "In Progress",
  "In Progress": "Completed",
  Completed: "Not started",
};

export function Training() {
  const { state, setState } = useStore();
  const [filter, setFilter] = useState<TrainingCategory | "All">("All");

  const resources = state.training;
  const visible = filter === "All" ? resources : resources.filter((r) => r.category === filter);

  const completed = resources.filter((r) => r.status === "Completed").length;
  const inProgress = resources.filter((r) => r.status === "In Progress").length;
  const overall = resources.length
    ? Math.round(resources.reduce((a, r) => a + (r.status === "Completed" ? 100 : r.progress), 0) / resources.length)
    : 0;

  function cycle(id: string) {
    setState((prev) => ({
      ...prev,
      training: prev.training.map((r) =>
        r.id === id
          ? {
              ...r,
              status: STATUS_NEXT[r.status],
              progress: STATUS_NEXT[r.status] === "Completed" ? 100 : STATUS_NEXT[r.status] === "Not started" ? 0 : Math.max(r.progress, 10),
            }
          : r
      ),
    }));
  }

  return (
    <div>
      <SectionHeader
        title="Modeling Academy"
        subtitle="Curated, mostly-free training to build the technical core EY and PE expect — financial modeling, valuation, LBOs and accounting."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Overall progress" value={`${overall}%`} accent="accent" />
        <KpiCard label="Completed" value={completed} accent="positive" />
        <KpiCard label="In progress" value={inProgress} accent="gold" />
        <KpiCard label="Resources" value={resources.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? resources.length : resources.filter((r) => r.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === cat
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border bg-panel text-muted-foreground hover:bg-elevated"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((r) => (
          <ResourceCard key={r.id} r={r} onCycle={() => cycle(r.id)} />
        ))}
      </div>
    </div>
  );
}

function ResourceCard({ r, onCycle }: { r: TrainingResource; onCycle: () => void }) {
  const statusIcon =
    r.status === "Completed" ? (
      <CheckCircle2 size={16} className="text-positive" />
    ) : r.status === "In Progress" ? (
      <PlayCircle size={16} className="text-gold" />
    ) : (
      <Circle size={16} className="text-muted-foreground" />
    );

  return (
    <Card className="hover-lift flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <GraduationCap size={18} />
        </div>
        <Badge variant={r.cost === "Free" ? "positive" : "gold"}>{r.cost}</Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-tight">{r.title}</h3>
      <p className="text-xs text-muted-foreground">{r.provider}</p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground">{r.description}</p>

      <div className="mt-3">
        <Badge variant="accent">{r.category}</Badge>
      </div>

      <div className="mt-3">
        <Progress value={r.status === "Completed" ? 100 : r.progress} barClassName={r.status === "Completed" ? "bg-positive" : "bg-accent"} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onCycle}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {statusIcon}
          {r.status}
        </button>
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className="ml-auto"
        >
          <Button size="sm" variant="secondary">
            Open <ExternalLink size={12} />
          </Button>
        </a>
      </div>
    </Card>
  );
}

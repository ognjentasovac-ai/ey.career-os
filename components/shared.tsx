"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./ui";

/* ----------------------------- KPI Card -------------------------------- */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "accent" | "gold" | "positive" | "warning" | "default";
  trend?: string;
}) {
  const accentColor =
    accent === "gold"
      ? "text-gold"
      : accent === "positive"
      ? "text-positive"
      : accent === "warning"
      ? "text-warning"
      : accent === "accent"
      ? "text-accent"
      : "text-foreground";

  const chipBg =
    accent === "gold"
      ? "bg-gold/10 text-gold"
      : accent === "positive"
      ? "bg-positive/10 text-positive"
      : accent === "warning"
      ? "bg-warning/10 text-warning"
      : accent === "accent"
      ? "bg-accent/10 text-accent"
      : "bg-elevated text-muted-foreground";

  return (
    <Card className="hover-lift relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", chipBg)}>
            {icon}
          </span>
        )}
      </div>
      <div className={cn("mt-2 font-display text-2xl font-semibold tabular", accentColor)}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
      {trend && (
        <div className="mt-1 text-[11px] font-medium text-positive">
          {trend}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------- Score Ring ------------------------------- */
export function ScoreRing({
  value,
  label,
  size = 132,
  stroke = 10,
  color = "hsl(var(--accent))",
  sublabel,
}: {
  value: number;
  label: string;
  size?: number;
  stroke?: number;
  color?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = c - (clamped / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular">{Math.round(clamped)}</span>
          <span className="text-[10px] text-muted-foreground">%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm font-medium">{label}</div>
        {sublabel && (
          <div className="text-xs text-muted-foreground">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Mini Score Bar ---------------------------- */
export function ScoreBar({
  label,
  value,
  color = "bg-accent",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ----------------------------- Stat pill ------------------------------- */
export function StatPill({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular">{value}</div>
    </div>
  );
}

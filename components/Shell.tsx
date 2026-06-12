"use client";

import { useRef, useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Network,
  Briefcase,
  Users,
  GraduationCap,
  Wallet,
  Gauge,
  SlidersHorizontal,
  CalendarCheck,
  BookOpenCheck,
  Layers3,
  Download,
  Upload,
  RotateCcw,
  Menu,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useStore, type SyncStatus } from "@/lib/store";
import { SCENARIOS, currentPosition, computeMetrics } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { Button, Modal, Input, Field } from "./ui";

import { Dashboard } from "./modules/Dashboard";
import { Timeline } from "./modules/Timeline";
import { SkillTree } from "./modules/SkillTree";
import { DealTracker } from "./modules/DealTracker";
import { NetworkCRM } from "./modules/NetworkCRM";
import { Education } from "./modules/Education";
import { Compensation } from "./modules/Compensation";
import { PartnerProbability } from "./modules/PartnerProbability";
import { Scenarios } from "./modules/Scenarios";
import { AnnualReview } from "./modules/AnnualReview";
import { Statements } from "./modules/Statements";
import { Training } from "./modules/Training";

type TabKey =
  | "dashboard"
  | "timeline"
  | "skills"
  | "deals"
  | "statements"
  | "training"
  | "network"
  | "education"
  | "compensation"
  | "probability"
  | "scenarios"
  | "review";

const NAV: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  group: string;
}[] = [
  { key: "dashboard", label: "Executive Dashboard", icon: <LayoutDashboard size={16} />, group: "Overview" },
  { key: "timeline", label: "Career Timeline", icon: <GitBranch size={16} />, group: "Overview" },
  { key: "statements", label: "3-Statement Lab", icon: <Layers3 size={16} />, group: "Training" },
  { key: "training", label: "Modeling Academy", icon: <BookOpenCheck size={16} />, group: "Training" },
  { key: "skills", label: "Skill Tree", icon: <Network size={16} />, group: "Development" },
  { key: "deals", label: "Deal Experience", icon: <Briefcase size={16} />, group: "Development" },
  { key: "network", label: "Network CRM", icon: <Users size={16} />, group: "Development" },
  { key: "education", label: "Education & Certs", icon: <GraduationCap size={16} />, group: "Development" },
  { key: "compensation", label: "Compensation", icon: <Wallet size={16} />, group: "Strategy" },
  { key: "probability", label: "Partner Probability", icon: <Gauge size={16} />, group: "Strategy" },
  { key: "scenarios", label: "Scenario Analysis", icon: <SlidersHorizontal size={16} />, group: "Strategy" },
  { key: "review", label: "Annual Review", icon: <CalendarCheck size={16} />, group: "Strategy" },
];

const GROUPS = ["Overview", "Training", "Development", "Strategy"];

export function Shell() {
  const { state, hydrated, reset, exportJSON, importJSON } = useStore();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          Loading Career OS…
        </div>
      </div>
    );
  }

  const cur = currentPosition(state);
  const m = computeMetrics(state);

  function handleExport() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `career-os-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result));
      if (!ok) alert("Invalid backup file.");
    };
    reader.readAsText(file);
  }

  const content = (
    <>
      {tab === "dashboard" && <Dashboard />}
      {tab === "timeline" && <Timeline />}
      {tab === "statements" && <Statements />}
      {tab === "training" && <Training />}
      {tab === "skills" && <SkillTree />}
      {tab === "deals" && <DealTracker />}
      {tab === "network" && <NetworkCRM />}
      {tab === "education" && <Education />}
      {tab === "compensation" && <Compensation />}
      {tab === "probability" && <PartnerProbability />}
      {tab === "scenarios" && <Scenarios />}
      {tab === "review" && <AnnualReview />}
    </>
  );

  return (
    <div className="flex min-h-screen">
      <AuthGate />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-panel/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-accent to-[hsl(215_55%_34%)] text-sm font-bold text-white shadow-lg shadow-accent/20 ring-1 ring-gold/40">
              OT
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">
                Career OS
              </div>
              <div className="text-[10px] tracking-wide text-muted-foreground">
                2026 — 2041 · PE TRACK
              </div>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Mini readiness strip */}
        <div className="border-b border-border px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Partner readiness</span>
            <span className="tabular text-accent">{m.partnerReadiness}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-gold"
              style={{ width: `${m.partnerReadiness}%` }}
            />
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group}>
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group}
              </div>
              <div className="space-y-0.5">
                {NAV.filter((n) => n.group === group).map((n) => (
                  <button
                    key={n.key}
                    onClick={() => {
                      setTab(n.key);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all",
                      tab === n.key
                        ? "bg-accent/15 font-medium text-accent shadow-[inset_2px_0_0_0_hsl(var(--accent))]"
                        : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                    )}
                  >
                    <span className={tab === n.key ? "text-accent" : "text-muted-foreground/70 group-hover:text-foreground"}>
                      {n.icon}
                    </span>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-md bg-elevated px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {state.profile.name}
            </div>
            <div className="truncate text-xs font-medium">{cur?.title}</div>
            <div className="text-[10px] text-muted-foreground">
              {state.profile.location}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="flex-1" onClick={handleExport} title="Export backup">
              <Download size={13} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
              title="Import backup"
            >
              <Upload size={13} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                if (confirm("Reset all data to the initial roadmap? This cannot be undone.")) reset();
              }}
              title="Reset data"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} className="text-muted-foreground" />
            </button>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Career Operating System
              </div>
              <div className="font-display text-sm font-semibold">
                {state.profile.name} · Path to PE Partner
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SyncIndicator />
            <ScenarioBadge />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {content}
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-[11px] text-muted-foreground lg:px-8">
          Career OS · Built for {state.profile.name} · EY Transaction & Corporate
          Finance → Private Equity Partner, CEE
        </footer>
      </div>
    </div>
  );
}

function SyncIndicator() {
  const { syncStatus } = useStore();
  const map: Record<SyncStatus, { icon: React.ReactNode; label: string; cls: string }> = {
    synced: { icon: <Cloud size={13} />, label: "Synced", cls: "text-positive" },
    syncing: { icon: <RefreshCw size={13} className="animate-spin" />, label: "Syncing", cls: "text-gold" },
    local: { icon: <CloudOff size={13} />, label: "Local only", cls: "text-muted-foreground" },
    error: { icon: <CloudOff size={13} />, label: "Sync error", cls: "text-negative" },
    auth: { icon: <Lock size={13} />, label: "Locked", cls: "text-warning" },
  };
  const s = map[syncStatus];
  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-md border border-border bg-panel px-2.5 py-1.5 text-[11px] font-medium sm:flex",
        s.cls
      )}
      title="Data sync status"
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function AuthGate() {
  const { syncStatus, authenticate } = useStore();
  const [key, setKey] = useState("");
  if (syncStatus !== "auth") return null;
  return (
    <Modal
      open
      onClose={() => {}}
      title="Unlock your Career OS"
      description="This deployment is password-protected. Enter your access key to load and sync your data."
      footer={
        <Button onClick={() => authenticate(key)} disabled={!key}>
          <CheckCircle2 size={14} /> Unlock
        </Button>
      }
    >
      <Field label="Access key">
        <Input
          type="password"
          value={key}
          autoFocus
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && key && authenticate(key)}
          placeholder="••••••••"
        />
      </Field>
      <p className="mt-3 text-xs text-muted-foreground">
        The key is set via the <code className="rounded bg-elevated px-1">ACCESS_PASSWORD</code>{" "}
        environment variable on your host. Leave it unset to run without a password.
      </p>
    </Modal>
  );
}

function ScenarioBadge() {
  const { state, setState } = useStore();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] text-muted-foreground sm:inline">
        Scenario
      </span>
      <select
        value={state.scenario}
        onChange={(e) =>
          setState((prev) => ({ ...prev, scenario: e.target.value as any }))
        }
        className="h-8 rounded-md border border-border bg-elevated px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {(["conservative", "base", "aggressive", "exceptional"] as const).map(
          (k) => (
            <option key={k} value={k}>
              {SCENARIOS[k].label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

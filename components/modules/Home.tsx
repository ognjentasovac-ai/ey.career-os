"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  GitBranch,
  Layers3,
  BookOpenCheck,
  Network,
  Briefcase,
  Users,
  GraduationCap,
  Wallet,
  Gauge,
  SlidersHorizontal,
  CalendarCheck,
  Search,
  ArrowRight,
} from "lucide-react";

interface Tool {
  key: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  group: string;
}

const TOOLS: Tool[] = [
  { key: "dashboard", title: "Executive Dashboard", desc: "Tvoj snimak spremnosti za Partnera — progres, KPI, radar sposobnosti.", icon: <LayoutDashboard size={20} />, group: "Pregled" },
  { key: "timeline", title: "Career Timeline", desc: "Svaki korak od EY analitičara do PE Partnera, 2026–2041.", icon: <GitBranch size={20} />, group: "Pregled" },
  { key: "statements", title: "3-Statement Lab", desc: "Čitaj prave izveštaje, analiziraj firmu, vežbaj EY case veštine.", icon: <Layers3 size={20} />, group: "Trening" },
  { key: "training", title: "Modeling Academy", desc: "Odabrani besplatni kursevi za majstorstvo finansijskog modeliranja.", icon: <BookOpenCheck size={20} />, group: "Trening" },
  { key: "skills", title: "Skill Tree", desc: "Prati 19 veština koje se slažu u Partner-level majstorstvo.", icon: <Network size={20} />, group: "Razvoj" },
  { key: "deals", title: "Deal Experience", desc: "Beleži svaku transakciju ka 10 koje su ti potrebne.", icon: <Briefcase size={20} />, group: "Razvoj" },
  { key: "network", title: "Network CRM", desc: "Gradi i neguj odnose koji otvaraju vrata.", icon: <Users size={20} />, group: "Razvoj" },
  { key: "education", title: "Education & Certs", desc: "CFA, kursevi i sertifikati na putu.", icon: <GraduationCap size={20} />, group: "Razvoj" },
  { key: "compensation", title: "Compensation", desc: "Modeliraj platu, bonus i carry do finansijske slobode.", icon: <Wallet size={20} />, group: "Strategija" },
  { key: "probability", title: "Partner Probability", desc: "Logistički model tvojih šansi da postaneš Partner.", icon: <Gauge size={20} />, group: "Strategija" },
  { key: "scenarios", title: "Scenario Analysis", desc: "Stres-testiraj ishode od Konzervativnog do Izuzetnog.", icon: <SlidersHorizontal size={20} />, group: "Strategija" },
  { key: "review", title: "Annual Review", desc: "Reflektuj, oceni i isplaniraj svaku godinu.", icon: <CalendarCheck size={20} />, group: "Strategija" },
];

export function Home({
  name = "Ognjen",
  onLaunch,
}: {
  name?: string;
  onLaunch: (key: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const tools = query
    ? TOOLS.filter(
        (t) => t.title.toLowerCase().includes(query) || t.desc.toLowerCase().includes(query)
      )
    : TOOLS;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Welcome back, {name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Tvoji alati na putu do PE Partnera — izaberi i pokreni.
          </p>
        </div>
        <div className="relative max-w-md">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pretraži alate…"
            className="w-full rounded-md border border-border bg-panel py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Tool cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => onLaunch(t.key)}
            className="group flex flex-col rounded-lg border border-border bg-panel p-5 text-left transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg hover:shadow-black/20"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-elevated text-gold">
                {t.icon}
              </span>
              <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t.group}
              </span>
            </div>
            <h3 className="font-display text-base font-semibold text-foreground">{t.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 self-start rounded-md border border-gold/60 px-3 py-1.5 text-xs font-semibold text-gold transition-colors group-hover:bg-gold/10">
              Launch <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
      </div>

      {tools.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nema alata za „{q}".
        </p>
      )}
    </div>
  );
}

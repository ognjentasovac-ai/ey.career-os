"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Deal, DealType, DealStatus } from "@/lib/types";
import { uid, todayISO, formatDate, eurFull, eur } from "@/lib/utils";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Field,
  Badge,
  SectionHeader,
  EmptyState,
} from "../ui";
import { KpiCard } from "../shared";

const TYPES: DealType[] = [
  "M&A",
  "LBO",
  "Due Diligence",
  "Investment Memo",
  "Financial Model",
  "Industry Research",
];
const STATUSES: DealStatus[] = ["Planned", "In Progress", "Completed", "On Hold"];

const STATUS_VARIANT: Record<DealStatus, "default" | "accent" | "positive" | "warning"> = {
  Planned: "default",
  "In Progress": "warning",
  Completed: "positive",
  "On Hold": "default",
};

function emptyDeal(): Deal {
  return {
    id: uid("deal"),
    name: "",
    type: "M&A",
    date: todayISO(),
    industry: "",
    size: 0,
    description: "",
    status: "Planned",
    lessons: "",
  };
}

export function DealTracker() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filter, setFilter] = useState<DealType | "All">("All");

  const stats = useMemo(() => {
    const byType = Object.fromEntries(
      TYPES.map((t) => [t, state.deals.filter((d) => d.type === t).length])
    ) as Record<DealType, number>;
    const totalValue = state.deals.reduce((a, d) => a + d.size, 0);
    const completed = state.deals.filter((d) => d.status === "Completed").length;
    return { byType, totalValue, completed };
  }, [state.deals]);

  const visible =
    filter === "All"
      ? state.deals
      : state.deals.filter((d) => d.type === filter);
  const sorted = [...visible].sort((a, b) => b.date.localeCompare(a.date));

  function save() {
    if (!editing) return;
    setState((prev) => {
      const exists = prev.deals.some((d) => d.id === editing.id);
      return {
        ...prev,
        deals: exists
          ? prev.deals.map((d) => (d.id === editing.id ? editing : d))
          : [editing, ...prev.deals],
      };
    });
    setEditing(null);
  }
  function remove(id: string) {
    setState((prev) => ({ ...prev, deals: prev.deals.filter((d) => d.id !== id) }));
    setEditing(null);
  }

  return (
    <div>
      <SectionHeader
        title="Deal Experience Tracker"
        subtitle="Every transaction, model, memo and research piece — your evidence base for the buy-side."
        action={
          <Button
            onClick={() => {
              setEditing(emptyDeal());
              setIsNew(true);
            }}
          >
            <Plus size={15} /> Add entry
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total entries" value={state.deals.length} accent="accent" />
        <KpiCard label="Completed" value={stats.completed} accent="positive" />
        <KpiCard
          label="Aggregate value"
          value={eur(stats.totalValue)}
          sub="transaction / EV"
          accent="gold"
        />
        <KpiCard
          label="M&A + LBO"
          value={stats.byType["M&A"] + stats.byType["LBO"]}
          sub="core deal work"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={filter === "All"} onClick={() => setFilter("All")}>
          All ({state.deals.length})
        </FilterChip>
        {TYPES.map((t) => (
          <FilterChip
            key={t}
            active={filter === t}
            onClick={() => setFilter(t)}
          >
            {t} ({stats.byType[t]})
          </FilterChip>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          message="No entries yet. Log your first transaction or model."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(emptyDeal());
                setIsNew(true);
              }}
            >
              <Plus size={15} /> Add entry
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => (
            <Card key={d.id} className="group p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">{d.type}</Badge>
                    <Badge variant={STATUS_VARIANT[d.status]}>{d.status}</Badge>
                    {d.industry && <Badge>{d.industry}</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(d.date)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{d.name}</h3>
                  {d.description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {d.description}
                    </p>
                  )}
                  {d.lessons && (
                    <p className="mt-2 rounded-md border-l-2 border-gold/50 bg-elevated px-3 py-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-gold">Lessons: </span>
                      {d.lessons}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="whitespace-nowrap text-sm font-semibold tabular text-gold">
                    {d.size > 0 ? eurFull(d.size) : "—"}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...d });
                        setIsNew(false);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(d.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          open
          wide
          onClose={() => setEditing(null)}
          title={isNew ? "Add deal entry" : "Edit deal entry"}
          footer={
            <>
              {!isNew && (
                <Button variant="destructive" onClick={() => remove(editing.id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              )}
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={save}>Save</Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Sell-side FDD — Project Atlas"
              />
            </Field>
            <Field label="Type">
              <Select
                value={editing.type}
                onChange={(e) =>
                  setEditing({ ...editing, type: e.target.value as DealType })
                }
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={editing.status}
                onChange={(e) =>
                  setEditing({ ...editing, status: e.target.value as DealStatus })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input
                type="date"
                value={editing.date}
                onChange={(e) => setEditing({ ...editing, date: e.target.value })}
              />
            </Field>
            <Field label="Industry">
              <Input
                value={editing.industry}
                onChange={(e) =>
                  setEditing({ ...editing, industry: e.target.value })
                }
                placeholder="Consumer / FMCG"
              />
            </Field>
            <Field label="Transaction size (EUR)" className="sm:col-span-2">
              <Input
                type="number"
                value={editing.size}
                onChange={(e) =>
                  setEditing({ ...editing, size: +e.target.value })
                }
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </Field>
            <Field label="Lessons learned" className="sm:col-span-2">
              <Textarea
                value={editing.lessons}
                onChange={(e) =>
                  setEditing({ ...editing, lessons: e.target.value })
                }
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-border bg-panel text-muted-foreground hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

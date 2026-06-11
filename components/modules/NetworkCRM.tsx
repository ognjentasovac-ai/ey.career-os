"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Mail, Linkedin, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Contact, ContactCategory } from "@/lib/types";
import { uid, todayISO, formatDate, daysUntil } from "@/lib/utils";
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

const CATEGORIES: ContactCategory[] = [
  "Private Equity",
  "Investment Banking",
  "Corporate Finance",
  "CEO",
  "Founder",
  "Lawyer",
  "Accountant",
  "LP Investor",
  "Family Office",
  "Consultant",
];

function emptyContact(): Contact {
  return {
    id: uid("c"),
    name: "",
    firm: "",
    position: "",
    email: "",
    linkedin: "",
    category: "Private Equity",
    strength: 5,
    lastContact: todayISO(),
    nextFollowUp: "",
    notes: "",
  };
}

function strengthColor(s: number) {
  if (s >= 8) return "text-positive";
  if (s >= 5) return "text-gold";
  return "text-muted-foreground";
}

export function NetworkCRM() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Contact | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filter, setFilter] = useState<ContactCategory | "All">("All");

  const networkScore = useMemo(() => {
    const sum = state.contacts.reduce((a, c) => a + c.strength, 0);
    return Math.min(100, Math.round(sum * 1.6 + state.contacts.length * 1.2));
  }, [state.contacts]);

  const avgStrength = state.contacts.length
    ? (
        state.contacts.reduce((a, c) => a + c.strength, 0) /
        state.contacts.length
      ).toFixed(1)
    : "0";

  const dueFollowUps = state.contacts.filter((c) => {
    const d = daysUntil(c.nextFollowUp);
    return d !== null && d <= 14;
  }).length;

  const visible =
    filter === "All"
      ? state.contacts
      : state.contacts.filter((c) => c.category === filter);
  const sorted = [...visible].sort((a, b) => b.strength - a.strength);

  function save() {
    if (!editing) return;
    setState((prev) => {
      const exists = prev.contacts.some((c) => c.id === editing.id);
      return {
        ...prev,
        contacts: exists
          ? prev.contacts.map((c) => (c.id === editing.id ? editing : c))
          : [editing, ...prev.contacts],
      };
    });
    setEditing(null);
  }
  function remove(id: string) {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }));
    setEditing(null);
  }

  const catCounts = Object.fromEntries(
    CATEGORIES.map((c) => [c, state.contacts.filter((x) => x.category === c).length])
  );

  return (
    <div>
      <SectionHeader
        title="Network CRM"
        subtitle="Relationships compound. Track every PE, banking, founder and LP connection that moves you toward Partner."
        action={
          <Button
            onClick={() => {
              setEditing(emptyContact());
              setIsNew(true);
            }}
          >
            <Plus size={15} /> Add contact
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Network Strength"
          value={`${networkScore}/100`}
          accent="accent"
        />
        <KpiCard label="Contacts" value={state.contacts.length} />
        <KpiCard label="Avg relationship" value={`${avgStrength}/10`} accent="gold" />
        <KpiCard
          label="Follow-ups due"
          value={dueFollowUps}
          sub="within 14 days"
          accent={dueFollowUps > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={filter === "All"} onClick={() => setFilter("All")}>
          All ({state.contacts.length})
        </Chip>
        {CATEGORIES.filter((c) => catCounts[c] > 0 || filter === c).map((c) => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)}>
            {c} ({catCounts[c]})
          </Chip>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState message="No contacts in this view yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((c) => {
            const fu = daysUntil(c.nextFollowUp);
            return (
              <Card key={c.id} className="group p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-elevated text-sm font-semibold">
                      {c.name.slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {c.name || "Unnamed"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {c.position}
                        {c.firm && ` · ${c.firm}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...c });
                        setIsNew(false);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(c.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="accent">{c.category}</Badge>
                  <span
                    className={`text-xs font-semibold tabular ${strengthColor(
                      c.strength
                    )}`}
                  >
                    {c.strength}/10
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${c.strength * 10}%` }}
                  />
                </div>

                {c.notes && (
                  <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                    {c.notes}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Mail size={12} /> email
                    </a>
                  )}
                  {c.linkedin && (
                    <a
                      href={c.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <Linkedin size={12} /> LinkedIn
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> last {formatDate(c.lastContact)}
                  </span>
                  {fu !== null && (
                    <span
                      className={
                        fu <= 14 ? "font-medium text-warning" : ""
                      }
                    >
                      follow-up {fu < 0 ? `${-fu}d overdue` : `in ${fu}d`}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          open
          wide
          onClose={() => setEditing(null)}
          title={isNew ? "Add contact" : "Edit contact"}
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
            <Field label="Name">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <Field label="Firm">
              <Input
                value={editing.firm}
                onChange={(e) => setEditing({ ...editing, firm: e.target.value })}
              />
            </Field>
            <Field label="Position">
              <Input
                value={editing.position}
                onChange={(e) =>
                  setEditing({ ...editing, position: e.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <Select
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as ContactCategory,
                  })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <Input
                value={editing.email}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </Field>
            <Field label="LinkedIn URL">
              <Input
                value={editing.linkedin}
                onChange={(e) =>
                  setEditing({ ...editing, linkedin: e.target.value })
                }
              />
            </Field>
            <Field label={`Relationship strength: ${editing.strength}/10`} className="sm:col-span-2">
              <input
                type="range"
                min={1}
                max={10}
                value={editing.strength}
                onChange={(e) =>
                  setEditing({ ...editing, strength: +e.target.value })
                }
                className="w-full"
              />
            </Field>
            <Field label="Last contact">
              <Input
                type="date"
                value={editing.lastContact}
                onChange={(e) =>
                  setEditing({ ...editing, lastContact: e.target.value })
                }
              />
            </Field>
            <Field label="Next follow-up">
              <Input
                type="date"
                value={editing.nextFollowUp}
                onChange={(e) =>
                  setEditing({ ...editing, nextFollowUp: e.target.value })
                }
              />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea
                value={editing.notes}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Chip({
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

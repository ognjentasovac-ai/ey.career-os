"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GraduationCap, CalendarClock } from "lucide-react";
import { useStore } from "@/lib/store";
import type {
  Education as Edu,
  EducationType,
  EducationStatus,
} from "@/lib/types";
import { uid, todayISO, formatDate, daysUntil } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Field,
  Badge,
  Progress,
  SectionHeader,
} from "../ui";
import { KpiCard } from "../shared";

const TYPES: EducationType[] = ["CFA", "ACCA", "MBA", "Course", "Certificate"];
const STATUSES: EducationStatus[] = [
  "Planned",
  "In Progress",
  "Completed",
  "Passed",
];

const STATUS_VARIANT: Record<
  EducationStatus,
  "default" | "warning" | "positive"
> = {
  Planned: "default",
  "In Progress": "warning",
  Completed: "positive",
  Passed: "positive",
};

function emptyEdu(): Edu {
  return {
    id: uid("edu"),
    name: "",
    type: "Course",
    provider: "",
    progress: 0,
    deadline: "",
    status: "Planned",
    notes: "",
  };
}

export function Education() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Edu | null>(null);
  const [isNew, setIsNew] = useState(false);

  const overall = state.education.length
    ? Math.round(
        state.education.reduce(
          (a, e) => a + (e.status === "Passed" ? 100 : e.progress),
          0
        ) / state.education.length
      )
    : 0;
  const done = state.education.filter(
    (e) => e.status === "Passed" || e.status === "Completed"
  ).length;
  const cfa = state.education.filter((e) => e.type === "CFA");
  const cfaProgress = cfa.length
    ? Math.round(
        cfa.reduce((a, e) => a + (e.status === "Passed" ? 100 : e.progress), 0) /
          cfa.length
      )
    : 0;

  function save() {
    if (!editing) return;
    setState((prev) => {
      const exists = prev.education.some((e) => e.id === editing.id);
      return {
        ...prev,
        education: exists
          ? prev.education.map((e) => (e.id === editing.id ? editing : e))
          : [...prev.education, editing],
      };
    });
    setEditing(null);
  }
  function remove(id: string) {
    setState((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }));
    setEditing(null);
  }

  const sorted = [...state.education].sort((a, b) =>
    (a.deadline || "9999").localeCompare(b.deadline || "9999")
  );

  return (
    <div>
      <SectionHeader
        title="Education & Certifications"
        subtitle="CFA charter, financial modelling, and the credentials that signal you belong on the buy-side."
        action={
          <Button
            onClick={() => {
              setEditing(emptyEdu());
              setIsNew(true);
            }}
          >
            <Plus size={15} /> Add item
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Overall completion" value={`${overall}%`} accent="accent" />
        <KpiCard label="CFA progress" value={`${cfaProgress}%`} accent="gold" />
        <KpiCard label="Completed" value={done} accent="positive" />
        <KpiCard label="Total items" value={state.education.length} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((e) => {
          const d = daysUntil(e.deadline);
          const prog = e.status === "Passed" ? 100 : e.progress;
          return (
            <Card key={e.id} className="group p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-elevated">
                    <GraduationCap size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{e.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.provider}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing({ ...e });
                        setIsNew(false);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(e.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                  <Badge>{e.type}</Badge>
                  <span className="tabular text-muted-foreground">{prog}%</span>
                </div>
                <Progress
                  value={prog}
                  barClassName={prog >= 100 ? "bg-positive" : "bg-accent"}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarClock size={12} />
                  {e.deadline ? formatDate(e.deadline) : "no deadline"}
                </span>
                {d !== null && e.status !== "Passed" && (
                  <span
                    className={
                      d < 0
                        ? "font-medium text-negative"
                        : d < 60
                        ? "font-medium text-warning"
                        : ""
                    }
                  >
                    {d < 0 ? `${-d}d overdue` : `${d}d left`}
                  </span>
                )}
              </div>
              {e.notes && (
                <p className="mt-2 text-[11px] text-muted-foreground">{e.notes}</p>
              )}
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={isNew ? "Add education item" : "Edit education item"}
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
          <div className="space-y-4">
            <Field label="Name">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value as EducationType,
                    })
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
                    setEditing({
                      ...editing,
                      status: e.target.value as EducationStatus,
                    })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Provider">
              <Input
                value={editing.provider}
                onChange={(e) =>
                  setEditing({ ...editing, provider: e.target.value })
                }
              />
            </Field>
            <Field label={`Progress: ${editing.progress}%`}>
              <input
                type="range"
                min={0}
                max={100}
                value={editing.progress}
                onChange={(e) =>
                  setEditing({ ...editing, progress: +e.target.value })
                }
                className="w-full"
              />
            </Field>
            <Field label="Deadline">
              <Input
                type="date"
                value={editing.deadline}
                onChange={(e) =>
                  setEditing({ ...editing, deadline: e.target.value })
                }
              />
            </Field>
            <Field label="Notes">
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

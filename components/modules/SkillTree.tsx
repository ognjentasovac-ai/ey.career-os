"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Skill, SkillCategory } from "@/lib/types";
import { uid, todayISO, formatDate } from "@/lib/utils";
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
  SectionHeader,
} from "../ui";

const CATEGORIES: SkillCategory[] = [
  "Technical",
  "Transactions",
  "Investing",
  "Leadership",
  "Origination",
];

const CAT_COLOR: Record<SkillCategory, string> = {
  Technical: "bg-[#3d5a80]",
  Transactions: "bg-[#5b7aa8]",
  Investing: "bg-accent",
  Leadership: "bg-[#9c7b30]",
  Origination: "bg-gold",
};

function emptySkill(): Skill {
  return {
    id: uid("sk"),
    name: "",
    category: "Technical",
    level: 0,
    target: 80,
    notes: "",
    updatedAt: todayISO(),
  };
}

export function SkillTree() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Skill | null>(null);
  const [isNew, setIsNew] = useState(false);

  const byCat = useMemo(() => {
    const map: Record<string, Skill[]> = {};
    for (const c of CATEGORIES) map[c] = [];
    for (const s of state.skills) (map[s.category] ||= []).push(s);
    return map;
  }, [state.skills]);

  const avg = state.skills.length
    ? Math.round(
        state.skills.reduce((a, s) => a + s.level, 0) / state.skills.length
      )
    : 0;

  function save() {
    if (!editing) return;
    const next = { ...editing, updatedAt: todayISO() };
    setState((prev) => {
      const exists = prev.skills.some((s) => s.id === next.id);
      return {
        ...prev,
        skills: exists
          ? prev.skills.map((s) => (s.id === next.id ? next : s))
          : [...prev.skills, next],
      };
    });
    setEditing(null);
  }
  function remove(id: string) {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
    setEditing(null);
  }
  function quickSet(id: string, level: number) {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.id === id ? { ...s, level, updatedAt: todayISO() } : s
      ),
    }));
  }

  return (
    <div>
      <SectionHeader
        title="Skill Tree"
        subtitle={`19-skill mastery map · average level ${avg}/100. Drag a slider to update.`}
        action={
          <Button
            onClick={() => {
              setEditing(emptySkill());
              setIsNew(true);
            }}
          >
            <Plus size={15} /> Add skill
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <Card key={cat}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${CAT_COLOR[cat]}`} />
                {cat}
              </CardTitle>
              <Badge>{byCat[cat]?.length || 0}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {byCat[cat]?.length ? (
                byCat[cat].map((s) => (
                  <div key={s.id} className="group">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular text-muted-foreground">
                          {s.level}/{s.target}
                        </span>
                        <button
                          onClick={() => {
                            setEditing({ ...s });
                            setIsNew(false);
                          }}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Pencil
                            size={12}
                            className="text-muted-foreground hover:text-foreground"
                          />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      {/* target marker */}
                      <div
                        className="absolute top-0 z-10 h-2 w-0.5 bg-gold/70"
                        style={{ left: `${s.target}%` }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={s.level}
                        onChange={(e) => quickSet(s.id, +e.target.value)}
                        className="range-input h-2 w-full cursor-pointer appearance-none rounded-full bg-muted"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--accent)) ${s.level}%, hsl(var(--muted)) ${s.level}%)`,
                        }}
                      />
                    </div>
                    {s.notes && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {s.notes}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      Updated {formatDate(s.updatedAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No skills yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={isNew ? "Add skill" : "Edit skill"}
          footer={
            <>
              {!isNew && (
                <Button
                  variant="destructive"
                  onClick={() => remove(editing.id)}
                >
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
            <Field label="Skill name">
              <Input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label="Category">
              <Select
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value as SkillCategory,
                  })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Current level: ${editing.level}`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editing.level}
                  onChange={(e) =>
                    setEditing({ ...editing, level: +e.target.value })
                  }
                  className="w-full"
                />
              </Field>
              <Field label={`Target: ${editing.target}`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editing.target}
                  onChange={(e) =>
                    setEditing({ ...editing, target: +e.target.value })
                  }
                  className="w-full"
                />
              </Field>
            </div>
            <Field label="Notes / goal">
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

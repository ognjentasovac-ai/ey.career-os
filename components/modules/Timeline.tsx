"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Position } from "@/lib/types";
import { uid, eurFull } from "@/lib/utils";
import { SCENARIOS } from "@/lib/calculations";
import {
  Card,
  Button,
  Input,
  Textarea,
  Modal,
  Field,
  Badge,
  SectionHeader,
} from "../ui";

const PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#eab308",
  "#ec4899",
  "#14b8a6",
];

function emptyPosition(): Position {
  const y = new Date().getFullYear();
  return {
    id: uid("pos"),
    title: "",
    company: "",
    startYear: y,
    endYear: y + 2,
    description: "",
    skills: [],
    certifications: [],
    requiredDeals: 0,
    requiredModels: 0,
    requiredMemos: 0,
    requiredNetworkScore: 0,
    compensation: 0,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  };
}

export function Timeline() {
  const { state, setState } = useStore();
  const [editing, setEditing] = useState<Position | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sorted = [...state.positions].sort((a, b) => a.startYear - b.startYear);
  const minYear = sorted.length ? sorted[0].startYear : 2026;
  const maxYear = sorted.length
    ? Math.max(...sorted.map((p) => p.endYear))
    : 2042;
  const span = Math.max(1, maxYear - minYear);
  const mult = SCENARIOS[state.scenario].compMultiplier;

  function openNew() {
    setEditing(emptyPosition());
    setIsNew(true);
  }
  function openEdit(p: Position) {
    setEditing({ ...p });
    setIsNew(false);
  }
  function save() {
    if (!editing) return;
    setState((prev) => {
      const exists = prev.positions.some((p) => p.id === editing.id);
      return {
        ...prev,
        positions: exists
          ? prev.positions.map((p) => (p.id === editing.id ? editing : p))
          : [...prev.positions, editing],
      };
    });
    setEditing(null);
  }
  function remove(id: string) {
    setState((prev) => ({
      ...prev,
      positions: prev.positions.filter((p) => p.id !== id),
    }));
    setEditing(null);
  }

  return (
    <div>
      <SectionHeader
        title="Career Timeline"
        subtitle="2026 → 2041 · the full arc from EY analyst to PE Partner. Everything is editable."
        action={
          <Button onClick={openNew}>
            <Plus size={15} /> Add position
          </Button>
        }
      />

      {/* Horizontal timeline rail */}
      <Card className="mb-6 overflow-x-auto p-6">
        <div className="min-w-[760px]">
          <div className="relative mb-2 flex justify-between text-[10px] text-muted-foreground">
            {Array.from({ length: span + 1 }).map((_, i) => (
              <span key={i} className="tabular">
                {minYear + i}
              </span>
            ))}
          </div>
          <div className="relative h-2 rounded-full bg-muted">
            {sorted.map((p, idx) => {
              const left = ((p.startYear - minYear) / span) * 100;
              const width = ((p.endYear - p.startYear) / span) * 100;
              return (
                <button
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className="group absolute top-1/2 h-2 -translate-y-1/2 rounded-full transition-all hover:h-3 hover:-translate-y-1/2"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: p.color,
                    zIndex: idx + 1,
                  }}
                  title={`${p.title} — ${p.company}`}
                />
              );
            })}
          </div>
          <div className="relative mt-4 h-px">
            {sorted.map((p) => {
              const left = ((p.startYear - minYear) / span) * 100;
              const width = ((p.endYear - p.startYear) / span) * 100;
              return (
                <div
                  key={p.id}
                  className="absolute top-0"
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <div className="px-1">
                    <div
                      className="truncate text-[11px] font-medium"
                      style={{ color: p.color }}
                    >
                      {p.title}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {p.company}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Position cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <Card key={p.id} className="group relative p-5">
            <div
              className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
              style={{ background: p.color }}
            />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={15} className="text-muted-foreground" />
                <Badge variant="default">
                  {p.startYear}–{p.endYear}
                </Badge>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                  <Pencil size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
            <p className="text-xs text-muted-foreground">{p.company}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {p.description}
            </p>
            {p.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {p.skills.slice(0, 4).map((s) => (
                  <Badge key={s} variant="accent">
                    {s}
                  </Badge>
                ))}
                {p.skills.length > 4 && (
                  <Badge>+{p.skills.length - 4}</Badge>
                )}
              </div>
            )}
            <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center">
              <Mini label="Deals" value={p.requiredDeals} />
              <Mini label="Models" value={p.requiredModels} />
              <Mini label="Memos" value={p.requiredMemos} />
              <Mini label="Net." value={p.requiredNetworkScore} />
            </div>
            <div className="mt-3 rounded-md bg-elevated px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Expected comp
              </span>
              <div className="text-sm font-semibold tabular text-gold">
                {eurFull(p.compensation * mult)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <PositionEditor
          position={editing}
          isNew={isNew}
          onChange={setEditing}
          onSave={save}
          onClose={() => setEditing(null)}
          onDelete={() => remove(editing.id)}
        />
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function PositionEditor({
  position,
  isNew,
  onChange,
  onSave,
  onClose,
  onDelete,
}: {
  position: Position;
  isNew: boolean;
  onChange: (p: Position) => void;
  onSave: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const set = (patch: Partial<Position>) => onChange({ ...position, ...patch });
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={isNew ? "Add position" : "Edit position"}
      description="Define the role, its requirements and expected compensation."
      footer={
        <>
          {!isNew && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={position.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Private Equity Associate"
          />
        </Field>
        <Field label="Company">
          <Input
            value={position.company}
            onChange={(e) => set({ company: e.target.value })}
            placeholder="CEE PE Fund"
          />
        </Field>
        <Field label="Start year">
          <Input
            type="number"
            value={position.startYear}
            onChange={(e) => set({ startYear: +e.target.value })}
          />
        </Field>
        <Field label="End year">
          <Input
            type="number"
            value={position.endYear}
            onChange={(e) => set({ endYear: +e.target.value })}
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            value={position.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <Field label="Required skills (comma separated)" className="sm:col-span-2">
          <Input
            value={position.skills.join(", ")}
            onChange={(e) =>
              set({
                skills: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Certifications (comma separated)" className="sm:col-span-2">
          <Input
            value={position.certifications.join(", ")}
            onChange={(e) =>
              set({
                certifications: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </Field>
        <Field label="Required deals">
          <Input
            type="number"
            value={position.requiredDeals}
            onChange={(e) => set({ requiredDeals: +e.target.value })}
          />
        </Field>
        <Field label="Required models">
          <Input
            type="number"
            value={position.requiredModels}
            onChange={(e) => set({ requiredModels: +e.target.value })}
          />
        </Field>
        <Field label="Required memos">
          <Input
            type="number"
            value={position.requiredMemos}
            onChange={(e) => set({ requiredMemos: +e.target.value })}
          />
        </Field>
        <Field label="Required network score">
          <Input
            type="number"
            value={position.requiredNetworkScore}
            onChange={(e) => set({ requiredNetworkScore: +e.target.value })}
          />
        </Field>
        <Field label="Expected compensation (EUR)">
          <Input
            type="number"
            value={position.compensation}
            onChange={(e) => set({ compensation: +e.target.value })}
          />
        </Field>
        <Field label="Accent color">
          <div className="flex gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => set({ color: c })}
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: c,
                  borderColor: position.color === c ? "white" : "transparent",
                }}
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

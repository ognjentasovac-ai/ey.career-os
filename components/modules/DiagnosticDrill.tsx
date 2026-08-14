"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Eye, Check, Target, AlertTriangle, RotateCcw } from "lucide-react";
import type { StatementCase } from "@/lib/types";
import {
  DIAGNOSTIC_DRILL,
  drillKey,
  drillSummary,
  gradeDrill,
  type DrillGrade,
} from "@/lib/diagnostic-drill";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Badge,
  Progress,
} from "../ui";
import { KpiCard } from "../shared";

/**
 * Dijagnostički drill — deset generičkih pitanja koja proveravaju *kako* čitaš
 * izveštaje. Odgovori se čuvaju u istom `answers` mapu kao i EY kviz (prefiks
 * `drill:`), pa idu u export/sync zajedno sa ostatkom slučaja.
 */
export default function DiagnosticDrill({
  c,
  onChange,
}: {
  c: StatementCase;
  onChange: (c: StatementCase) => void;
}) {
  const [graded, setGraded] = useState<Record<string, DrillGrade>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const summary = useMemo(() => drillSummary(c.answers), [c.answers]);

  function setAnswer(id: string, v: string) {
    onChange({ ...c, answers: { ...c.answers, [drillKey(id)]: v } });
  }
  function checkAll() {
    const next: Record<string, DrillGrade> = {};
    for (const q of DIAGNOSTIC_DRILL)
      next[q.id] = gradeDrill(q, c.answers[drillKey(q.id)] || "");
    setGraded(next);
  }
  function resetAll() {
    const answers = { ...c.answers };
    for (const q of DIAGNOSTIC_DRILL) delete answers[drillKey(q.id)];
    onChange({ ...c, answers });
    setGraded({});
    setShown({});
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">Dijagnostički drill</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Deset pitanja koja ne proveravaju formule nego <span className="text-foreground">način na koji
          gledaš izveštaje</span>. Piši odgovor svojim rečima, pa ga proveri — provera traži da li si
          pomenuo uglove koje bi EY / PE sagovornik očekivao. Model odgovor otvaraj tek posle.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Odgovoreno"
          value={`${summary.answered}/${summary.total}`}
          icon={<ClipboardCheck size={15} />}
          accent="accent"
        />
        <KpiCard
          label="Prosečno pokrivanje"
          value={`${summary.avg}%`}
          sub="udeo traženih uglova koje si pomenuo"
          icon={<Target size={15} />}
          accent={summary.avg >= 70 ? "positive" : summary.avg >= 40 ? "gold" : "default"}
        />
        <Card className="flex flex-col justify-center gap-2 p-4">
          <Button size="sm" onClick={checkAll}>
            <Check size={13} /> Proveri sve odgovore
          </Button>
          <Button size="sm" variant="secondary" onClick={resetAll}>
            <RotateCcw size={13} /> Obriši moje odgovore
          </Button>
        </Card>
      </div>

      {DIAGNOSTIC_DRILL.map((q, i) => {
        const key = drillKey(q.id);
        const answer = c.answers[key] || "";
        const g = graded[q.id];
        const live = q.live?.(c) || null;
        const tone =
          g?.status === "strong"
            ? "border-positive/50 bg-positive/10"
            : g?.status === "partial"
            ? "border-gold/50 bg-gold/10"
            : g?.status === "thin"
            ? "border-negative/50 bg-negative/10"
            : "border-accent/40 bg-accent/10";

        return (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] text-accent">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{q.question}</span>
              </CardTitle>
              <p className="pl-[30px] text-xs text-muted-foreground">
                <span className="font-medium text-gold">Testira: </span>
                {q.tests}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {live && (
                <div className="rounded-md border border-border bg-elevated px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-accent">Na ovom slučaju: </span>
                  {live}
                </div>
              )}

              <Textarea
                value={answer}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                placeholder="Tvoj odgovor…"
                className="min-h-[90px]"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setGraded((s) => ({ ...s, [q.id]: gradeDrill(q, answer) }))}
                >
                  <Check size={13} /> Proveri odgovor
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShown((s) => ({ ...s, [q.id]: !s[q.id] }))}
                >
                  <Eye size={13} /> {shown[q.id] ? "Sakrij" : "Prikaži"} model odgovor
                </Button>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {q.checkpoints.length} traženih uglova
                </span>
              </div>

              {g && (
                <div className={`space-y-2 rounded-md border p-3 text-xs ${tone}`}>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold uppercase tracking-wide text-foreground">
                      {g.status === "strong"
                        ? "Jako"
                        : g.status === "partial"
                        ? "Delimično"
                        : g.status === "thin"
                        ? "Preusko"
                        : "Prazno"}
                    </span>
                    {g.status !== "empty" && (
                      <>
                        <Progress
                          value={g.coverage}
                          className="h-1.5 max-w-[160px]"
                          barClassName={
                            g.status === "strong"
                              ? "bg-positive"
                              : g.status === "partial"
                              ? "bg-gold"
                              : "bg-negative"
                          }
                        />
                        <span className="tabular text-muted-foreground">{g.coverage}%</span>
                      </>
                    )}
                  </div>
                  <p className="text-foreground">{g.message}</p>
                  {g.hit.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.hit.map((h) => (
                        <Badge key={h} variant="positive">
                          ✓ {h}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {g.missed.length > 0 && g.status !== "empty" && (
                    <div className="flex flex-wrap gap-1.5">
                      {g.missed.map((m) => (
                        <Badge key={m} variant="warning">
                          nedostaje: {m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {shown[q.id] && (
                <div className="space-y-2 rounded-md border border-border bg-elevated p-3 text-xs leading-relaxed">
                  <p className="font-medium text-gold">Model odgovor</p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    {q.model.map((m, k) => (
                      <li key={k} className="flex gap-2">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                        <span className="text-foreground/90">{m}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="flex items-start gap-2 border-t border-border pt-2 text-muted-foreground">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0 text-negative" />
                    <span>
                      <span className="font-medium text-negative">Klasična greška: </span>
                      {q.trap}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-gold/40">
        <CardHeader>
          <CardTitle className="text-gold">Kako da koristiš drill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>
            1. Odgovori na sva pitanja bez otvaranja model odgovora — ovo je test, ne štivo.
          </p>
          <p>
            2. Proveri sve odgovore odjednom i pogledaj koje uglove sistematski propuštaš; ti se
            ponavljaju i u pravim razgovorima.
          </p>
          <p>
            3. Otvori model odgovore, pa se vrati za nedelju dana na isti slučaj sa obrisanim
            odgovorima — vrednost je u ponavljanju, ne u čitanju.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

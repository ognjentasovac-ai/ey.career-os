"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "../ui";
import { eur } from "@/lib/utils";
import { analyseCase } from "@/lib/statements";
import {
  buildDCF,
  defaultDcfAssumptions,
  buildLBO,
  defaultLboAssumptions,
  lboSensitivity,
  type DcfAssumptions,
  type LboAssumptions,
} from "@/lib/valuation";
import type { StatementCase } from "@/lib/types";
import { Calculator, TrendingUp } from "lucide-react";

function Assume({
  label,
  value,
  suffix,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-elevated px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          value={Number.isFinite(value) ? +value.toFixed(2) : 0}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 rounded border border-border bg-input px-2 py-1 text-right text-sm tabular focus:border-gold/50 focus:outline-none"
        />
        <span className="w-6 text-[11px] text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border border-border bg-elevated p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-semibold tabular ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

export default function ValuationView({ c }: { c: StatementCase }) {
  const [mode, setMode] = useState<"dcf" | "lbo">("dcf");
  const [dcf, setDcf] = useState<DcfAssumptions>(() => defaultDcfAssumptions(c));
  const [lbo, setLbo] = useState<LboAssumptions>(() => defaultLboAssumptions(c));

  const a = analyseCase(c);
  const L = a.latest;
  if (!L || !L.revenue)
    return <EmptyState message="Unesi izveštaje prvo — valuacija se računa iz finansija." />;

  const r = buildDCF(c, dcf);
  const entryEbitda = L.ebitda;
  const lr = buildLBO(entryEbitda, lbo);
  const setD = (k: keyof DcfAssumptions, v: number) => setDcf((s) => ({ ...s, [k]: v }));
  const setL = (k: keyof LboAssumptions, v: number) => setLbo((s) => ({ ...s, [k]: v }));

  const entriesGrid = [lbo.entryMultiple - 1, lbo.entryMultiple, lbo.entryMultiple + 1];
  const exitsGrid = [lbo.exitMultiple - 1, lbo.exitMultiple, lbo.exitMultiple + 1];
  const grid = lboSensitivity(entryEbitda, lbo, entriesGrid, exitsGrid);

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-panel p-1">
        {(["dcf", "lbo"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              mode === m ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-elevated"
            }`}
          >
            {m === "dcf" ? <Calculator size={14} /> : <TrendingUp size={14} />}
            {m === "dcf" ? "DCF valuacija" : "LBO / prinosi"}
          </button>
        ))}
      </div>

      {mode === "dcf" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Pretpostavke (uredi)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0 sm:grid-cols-2 lg:grid-cols-3">
              <Assume label="Rast prihoda" value={dcf.revGrowth} suffix="%" onChange={(v) => setD("revGrowth", v)} />
              <Assume label="EBIT marža" value={dcf.ebitMargin} suffix="%" onChange={(v) => setD("ebitMargin", v)} />
              <Assume label="Poreska stopa" value={dcf.taxRate} suffix="%" onChange={(v) => setD("taxRate", v)} />
              <Assume label="Amortizacija (% prih.)" value={dcf.daPct} suffix="%" onChange={(v) => setD("daPct", v)} />
              <Assume label="CapEx (% prih.)" value={dcf.capexPct} suffix="%" onChange={(v) => setD("capexPct", v)} />
              <Assume label="Δ NWC (% rasta)" value={dcf.nwcPct} suffix="%" onChange={(v) => setD("nwcPct", v)} />
              <Assume label="WACC" value={dcf.wacc} suffix="%" step={0.5} onChange={(v) => setD("wacc", v)} />
              <Assume label="Terminalni rast" value={dcf.terminalGrowth} suffix="%" step={0.5} onChange={(v) => setD("terminalGrowth", v)} />
              <Assume label="Izlazni EV/EBITDA" value={dcf.exitMultiple} suffix="x" step={0.5} onChange={(v) => setD("exitMultiple", v)} />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="EV (Gordon)" value={eur(r.evGordon)} accent="text-gold" />
            <Stat label="EV (izlazni multipl)" value={eur(r.evExit)} accent="text-gold" />
            <Stat label="Equity value (Gordon)" value={eur(r.equityGordon)} accent="text-positive" />
            <Stat label="Implicirani EV/EBITDA" value={`${r.impliedEntryMultiple.toFixed(1)}x`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">FCFF projekcija</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Godina</th>
                    <th className="px-3 py-2 text-right font-medium">Prihod</th>
                    <th className="px-3 py-2 text-right font-medium">EBIT</th>
                    <th className="px-3 py-2 text-right font-medium">NOPAT</th>
                    <th className="px-3 py-2 text-right font-medium">FCFF</th>
                    <th className="px-3 py-2 text-right font-medium">PV</th>
                  </tr>
                </thead>
                <tbody>
                  {r.rows.map((row) => (
                    <tr key={row.year} className="border-b border-border/40">
                      <td className="px-4 py-1.5 text-left text-muted-foreground">+{row.year}</td>
                      <td className="px-3 py-1.5 text-right tabular">{eur(row.revenue)}</td>
                      <td className="px-3 py-1.5 text-right tabular">{eur(row.ebit)}</td>
                      <td className="px-3 py-1.5 text-right tabular">{eur(row.nopat)}</td>
                      <td className="px-3 py-1.5 text-right tabular">{eur(row.fcff)}</td>
                      <td className="px-3 py-1.5 text-right tabular text-gold/90">{eur(row.pv)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/40 bg-elevated/40 font-semibold">
                    <td className="px-4 py-1.5 text-left">PV eksplicitnog perioda</td>
                    <td colSpan={4} />
                    <td className="px-3 py-1.5 text-right tabular text-gold">{eur(r.pvExplicit)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="px-4 py-1.5 text-left">+ PV terminalne vrednosti (Gordon)</td>
                    <td colSpan={4} />
                    <td className="px-3 py-1.5 text-right tabular text-gold">{eur(r.pvTvGordon)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="px-1 text-[11px] text-muted-foreground">
            DCF iz finansija firme: FCFF = NOPAT + amortizacija − CapEx − ΔNWC, diskontovano WACC-om; terminalna vrednost
            kao Gordon (rast {dcf.terminalGrowth}%) i kao izlazni multipl ({dcf.exitMultiple}x). Equity = EV − neto dug ({eur(r.netDebt)}).
          </p>
        </>
      )}

      {mode === "lbo" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">LBO pretpostavke (uredi)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-0 sm:grid-cols-2 lg:grid-cols-3">
              <Assume label="Ulazni EV/EBITDA" value={lbo.entryMultiple} suffix="x" step={0.5} onChange={(v) => setL("entryMultiple", v)} />
              <Assume label="Leveridž (dug/EBITDA)" value={lbo.leverage} suffix="x" step={0.5} onChange={(v) => setL("leverage", v)} />
              <Assume label="Rast EBITDA" value={lbo.ebitdaGrowth} suffix="%" onChange={(v) => setL("ebitdaGrowth", v)} />
              <Assume label="Izlazni EV/EBITDA" value={lbo.exitMultiple} suffix="x" step={0.5} onChange={(v) => setL("exitMultiple", v)} />
              <Assume label="Period držanja" value={lbo.hold} suffix="g" onChange={(v) => setL("hold", Math.max(1, Math.round(v)))} />
              <Assume label="Keš za otplatu (% EBITDA)" value={lbo.capexPct} suffix="%" onChange={(v) => setL("capexPct", v)} />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Ulazni equity ček" value={eur(lr.entryEquity)} />
            <Stat label="Izlazni equity" value={eur(lr.exitEquity)} accent="text-positive" />
            <Stat label="MOIC" value={`${lr.moic.toFixed(2)}x`} accent="text-gold" />
            <Stat label="IRR" value={`${lr.irr.toFixed(1)}%`} accent={lr.irr >= 20 ? "text-positive" : lr.irr >= 12 ? "text-gold" : "text-negative"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">IRR senzitivnost — ulazni × izlazni multipl</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Ulaz \ Izlaz</th>
                    {exitsGrid.map((x) => (
                      <th key={x} className="px-3 py-2 text-right font-medium">{x.toFixed(1)}x</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entriesGrid.map((em, i) => (
                    <tr key={em} className="border-b border-border/40">
                      <td className="px-4 py-1.5 text-left text-muted-foreground">{em.toFixed(1)}x</td>
                      {grid[i].map((irr, j) => (
                        <td
                          key={j}
                          className={`px-3 py-1.5 text-right tabular ${
                            irr >= 25 ? "text-positive font-semibold" : irr >= 15 ? "text-gold" : "text-muted-foreground"
                          }`}
                        >
                          {irr.toFixed(0)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="px-1 text-[11px] text-muted-foreground">
            LBO iz tekuće EBITDA ({eur(entryEbitda)}): kupovina po ulaznom multiplu sa leveridžom, EBITDA raste,
            slobodan keš otplaćuje dug, izlaz po izlaznom multiplu → MOIC i IRR. Prinos dolazi od deleveraging-a, rasta EBITDA i promene multipla.
          </p>
        </>
      )}

      <p className="px-1 pb-2 text-center text-[11px] text-muted-foreground">
        Edukativna valuacija iz unetih/povučenih finansija — nije investiciona preporuka.
      </p>
    </div>
  );
}

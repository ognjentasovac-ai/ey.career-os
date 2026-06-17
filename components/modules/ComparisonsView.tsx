"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui";
import { eur } from "@/lib/utils";
import { analyseCase, computeCashFlow } from "@/lib/statements";
import type { StatementCase } from "@/lib/types";
import { Lock, TrendingUp, Loader2 } from "lucide-react";

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-elevated text-muted-foreground">
          <Lock size={22} />
        </div>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{children}</p>
      </CardContent>
    </Card>
  );
}

export default function ComparisonsView({ c }: { c: StatementCase }) {
  const a = analyseCase(c);
  const L = a.latest;
  const ticker = c.ticker;
  const shares = c.sharesOutstanding || 0;
  const canShow = !!ticker && c.revealed && shares > 0 && !!L;

  const [quote, setQuote] = useState<{ price: number; date: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!canShow) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    fetch(`/api/quote?ticker=${ticker}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.ok) setQuote({ price: j.price, date: j.date });
        else setErr(j.error || "Nema cene");
      })
      .catch(() => alive && setErr("Greška pri preuzimanju cene"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ticker, canShow]);

  if (!ticker)
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Tržište & multiplikatori</h2>
        <Note>
          Tržišni podaci (cena, market cap, P/E, EV/EBITDA) dostupni su za prave US firme. Importuj
          ticker (npr. AAPL) ili koristi „Real Company of the Day".
        </Note>
      </div>
    );
  if (!c.revealed)
    return (
      <div className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">Tržište & multiplikatori</h2>
        <Note>
          Otkrij firmu prvo (tab <span className="text-gold">EY Kviz</span> → „Reveal the answer") — cena i
          market cap bi odali identitet, pa su skriveni do otkrivanja.
        </Note>
      </div>
    );

  const price = quote?.price ?? 0;
  const mktCap = shares * price;
  const ev = mktCap + (L?.netDebt ?? 0);
  const eps = L && shares ? L.netIncome / shares : 0;
  const pe = eps > 0 ? price / eps : null;
  const evEbitda = L?.ebitda ? ev / L.ebitda : null;
  const evSales = L?.revenue ? ev / L.revenue : null;

  // FCF yield from the latest derived cash flow.
  const sortedActuals = [...c.periods].filter((p) => !p.projected);
  const lastP = sortedActuals.at(-1);
  const prevP = sortedActuals.length > 1 ? sortedActuals.at(-2) : null;
  const cf = lastP && prevP ? computeCashFlow(prevP, lastP) : null;
  const fcfYield = cf && mktCap ? (cf.fcf / mktCap) * 100 : null;

  const bench: { label: string; val: number | null; fmt: (v: number) => string; lo: number; hi: number }[] = [
    { label: "P/E", val: pe, fmt: (v) => `${v.toFixed(1)}x`, lo: 15, hi: 25 },
    { label: "EV/EBITDA", val: evEbitda, fmt: (v) => `${v.toFixed(1)}x`, lo: 8, hi: 14 },
    { label: "EV/Sales", val: evSales, fmt: (v) => `${v.toFixed(1)}x`, lo: 1, hi: 4 },
    { label: "FCF prinos", val: fcfYield, fmt: (v) => `${v.toFixed(1)}%`, lo: 3, hi: 6 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">Tržište & multiplikatori</h2>
        <span className="text-xs text-muted-foreground">{ticker}{quote?.date ? ` · ${quote.date}` : ""}</span>
      </div>

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Preuzimam cenu…
          </CardContent>
        </Card>
      )}
      {!loading && (err || !quote) && (
        <Note>Nije moguće preuzeti cenu za {ticker} ({err || "nema podataka"}). Tržišni izvor je možda nedostupan.</Note>
      )}

      {!loading && quote && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Cena akcije" value={`$${price.toFixed(2)}`} />
            <Stat label="Tržišna kap." value={eur(mktCap)} accent="text-gold" />
            <Stat label="Enterprise Value" value={eur(ev)} accent="text-gold" />
            <Stat label="Neto dug" value={eur(L?.netDebt ?? 0)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp size={16} className="text-accent" /> Multiplikatori vs tipičan raspon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {bench.map((b) => {
                const v = b.val;
                const verdict =
                  v == null
                    ? ""
                    : b.label === "FCF prinos"
                    ? v > b.hi
                      ? "jeftino"
                      : v < b.lo
                      ? "skupo"
                      : "u rasponu"
                    : v < b.lo
                    ? "jeftino"
                    : v > b.hi
                    ? "skupo"
                    : "u rasponu";
                const color = verdict === "jeftino" ? "text-positive" : verdict === "skupo" ? "text-negative" : "text-muted-foreground";
                return (
                  <div key={b.label} className="flex items-center justify-between border-b border-border/60 py-2.5 last:border-0">
                    <span className="text-sm text-muted-foreground">{b.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground/70">tip. {b.fmt(b.lo)}–{b.fmt(b.hi)}</span>
                      <span className="w-16 text-right text-sm font-semibold text-foreground tabular">{v == null ? "n/a" : b.fmt(v)}</span>
                      <span className={`w-16 text-right text-xs font-medium ${color}`}>{verdict}</span>
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <p className="px-1 text-[11px] text-muted-foreground">
            Live cena sa Stooq-a × {(shares / 1e6).toFixed(0)}M akcija = market cap; EV = + neto dug. Multiplikatori se porede sa grubim
            tipičnim rasponima (nije sektorski precizno). Uporedi sa svojom DCF procenom u tabu „DCF / LBO valuacija".
          </p>
        </>
      )}
    </div>
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

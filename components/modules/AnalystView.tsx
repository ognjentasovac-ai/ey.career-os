"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "../ui";
import { buildAnalystReport, type AnalystLang } from "@/lib/statements";
import type { StatementCase } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Building2, Search, ExternalLink } from "lucide-react";

const REGISTRIES: { label: string; note: string; url: string }[] = [
  { label: "SEC EDGAR", note: "US — zvanični 10-K/20-F filings (besplatno)", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany" },
  { label: "APR Srbija", note: "Srbija — finansijski izveštaji privrednih društava", url: "https://pretraga2.apr.gov.rs/unifiedentitysearch" },
  { label: "BELEX", note: "Beogradska berza — listirane RS kompanije", url: "https://www.belex.rs" },
  { label: "ZSE / LJSE", note: "Zagrebačka / Ljubljanska berza", url: "https://zse.hr" },
  { label: "Companies House", note: "UK — zvanični registar i izveštaji", url: "https://find-and-update.company-information.service.gov.uk" },
  { label: "Bundesanzeiger", note: "Nemačka — zvanični finansijski izveštaji", url: "https://www.bundesanzeiger.de" },
  { label: "EU e-Justice (BRIS)", note: "Pretraga firmi kroz sve EU registre", url: "https://e-justice.europa.eu/content_find_a_company-489-en.do" },
];

const toneStyle: Record<string, string> = {
  pos: "border-green-500/40",
  neg: "border-red-500/40",
  warn: "border-gold/40",
  neutral: "border-border",
};
const toneIcon: Record<string, React.ReactNode> = {
  pos: <TrendingUp size={15} className="text-green-400" />,
  neg: <TrendingDown size={15} className="text-red-400" />,
  warn: <AlertTriangle size={15} className="text-gold" />,
  neutral: <Minus size={15} className="text-muted-foreground" />,
};

const scenarioStyle: Record<string, { border: string; label: string }> = {
  Bull: { border: "border-green-500/40 bg-green-500/5", label: "text-green-400" },
  Base: { border: "border-accent/40 bg-accent/5", label: "text-accent" },
  Bear: { border: "border-red-500/40 bg-red-500/5", label: "text-red-400" },
};

export default function AnalystView({ c }: { c: StatementCase }) {
  const [lang, setLang] = useState<AnalystLang>("sr");
  const report = buildAnalystReport(c, lang);
  const t = (en: string, sr: string) => (lang === "sr" ? sr : en);
  const isReal = c.id.startsWith("sec"); // real SEC filing vs synthetic training case

  if (!report.ready)
    return (
      <EmptyState
        message={t(
          "Enter the P&L and balance sheet first — the analyst write-up is generated from the numbers.",
          "Prvo unesi bilans uspeha i bilans stanja — analiza se generiše iz brojeva."
        )}
      />
    );

  return (
    <div className="space-y-4">
      {/* Headline + language toggle */}
      <Card className="panel-grad border-accent/30">
        <CardContent className="space-y-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {t("Analyst write-up", "Analiza analitičara")}
            </p>
            <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
              {(["sr", "en"] as AnalystLang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 text-[11px] font-medium uppercase transition-colors ${
                    lang === l ? "bg-accent/20 text-accent" : "text-muted-foreground hover:bg-elevated"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{report.headline}</p>
          <p className="text-[11px] text-muted-foreground">
            {t(
              "Auto-generated from this company's statements — updates live as you edit the data. The way a professional analyst would read it.",
              "Automatski iz izveštaja ove firme — menja se uživo kako menjaš podatke. Kako bi je pročitao profesionalni analitičar."
            )}
          </p>
        </CardContent>
      </Card>

      {/* Reveal & verify on official registries */}
      <Card className="border-gold/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Search size={15} className="text-gold" />{" "}
            {t("Reveal & verify on official registries", "Otkrij i proveri na zvaničnim registrima")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isReal
              ? t(
                  "This is a REAL company pulled from official SEC filings (figures as reported). To reveal its name, open the EY Quiz tab and press “Reveal the answer”, then verify the exact filing on SEC EDGAR below.",
                  "Ovo je STVARNA firma povučena iz zvaničnih SEC izveštaja (brojevi kako su prijavljeni). Da otkriješ ime, otvori tab EY Quiz i pritisni „Reveal the answer“, pa proveri tačan izveštaj na SEC EDGAR-u ispod."
                )
              : t(
                  "This case is a training archetype (synthetic) — not a real filing. To reveal what it represents, open the EY Quiz tab and press “Reveal the answer”. For real, 99%-accurate statements, use the SEC daily challenge / import a US ticker, or pull the official report from a registry below.",
                  "Ovaj slučaj je trening-arhetip (sintetički) — nije stvarni izveštaj. Da vidiš šta predstavlja, otvori tab EY Quiz i pritisni „Reveal the answer“. Za stvarne, 99% tačne izveštaje koristi SEC dnevni izazov / importuj US ticker, ili povuci zvanični izveštaj sa registra ispod."
                )}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {REGISTRIES.map((r) => (
              <a
                key={r.label}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 rounded-md border border-border bg-elevated p-2.5 transition-colors hover:border-accent/50"
              >
                <ExternalLink size={13} className="mt-0.5 shrink-0 text-accent" />
                <span className="text-xs">
                  <span className="font-medium text-foreground">{r.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{r.note}</span>
                </span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Narrative sections */}
      {report.sections.map((s) => (
        <Card key={s.id} className={toneStyle[s.tone]}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              {toneIcon[s.tone]}
              {s.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {s.paragraphs.filter(Boolean).map((p, i) => (
              <p key={i} className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                {p}
              </p>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Building2 size={16} className="text-accent" />{" "}
            {t("What could happen — scenarios", "Šta može da se desi — scenariji")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 md:grid-cols-3">
          {report.scenarios.map((sc) => {
            const st = scenarioStyle[sc.name] ?? scenarioStyle.Base;
            return (
              <div key={sc.name} className={`rounded-md border p-3 ${st.border}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${st.label}`}>
                  {sc.label}
                </p>
                <p className="mb-1 text-[11px] italic text-muted-foreground">{sc.tag}</p>
                <p className="text-[12px] leading-relaxed text-foreground">{sc.body}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card className="border-gold/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gold">
            <Target size={16} /> {t("Investment call", "Investiciona preporuka")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-elevated p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Verdict", "Ocena")}
              </p>
              <p className="text-sm font-semibold text-gold">{report.recommendation.verdict}</p>
            </div>
            <div className="rounded-md border border-border bg-elevated p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Who should own it", "Ko treba da je kupi")}
              </p>
              <p className="text-[13px] text-foreground">{report.recommendation.investorType}</p>
            </div>
          </div>
          <div className="rounded-md border border-border bg-elevated p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("How much to pay", "Koliko platiti")}
            </p>
            <p className="text-[12px] leading-relaxed text-foreground">{report.recommendation.sizing}</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {report.recommendation.body}
          </p>
        </CardContent>
      </Card>

      <p className="px-1 pb-2 text-center text-[11px] text-muted-foreground">
        {t(
          "Educational, data-derived commentary — not investment advice.",
          "Edukativni komentar izveden iz podataka — nije investicioni savet."
        )}
      </p>
    </div>
  );
}

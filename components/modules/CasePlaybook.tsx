"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui";
import {
  ChevronDown,
  Link2,
  ArrowRightLeft,
  Sigma,
  Gauge,
  Wallet,
  Scale,
  Droplets,
  TrendingUp,
  Calculator,
  ListChecks,
  AlertTriangle,
  Target,
  Building2,
} from "lucide-react";

/* Small presentational helpers ---------------------------------------- */

function F({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground">
      {children}
    </div>
  );
}

function Note({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-xs leading-relaxed text-muted-foreground ${className}`}>{children}</p>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-accent">{children}</p>;
}

/* Accordion section ---------------------------------------------------- */

interface Section {
  id: string;
  title: string;
  tag: string; // SR/EN short subtitle
  icon: React.ReactNode;
  body: React.ReactNode;
}

export default function CasePlaybook() {
  const sections = buildSections();
  const [open, setOpen] = useState<Record<string, boolean>>({ links: true });
  const allOpen = sections.every((s) => open[s.id]);

  function toggle(id: string) {
    setOpen((o) => ({ ...o, [id]: !o[id] }));
  }
  function setAll(v: boolean) {
    setOpen(Object.fromEntries(sections.map((s) => [s.id, v])));
  }

  return (
    <div className="space-y-4">
      <Card className="panel-grad">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Case Playbook — EY &amp; CFA
              </h2>
              <p className="text-xs text-muted-foreground">
                Sve formule, povezanost tri izveštaja, šta je bitno, i profili ~50 sektora. ·
                Everything you must know to crush the next case.
              </p>
            </div>
            <button
              onClick={() => setAll(!allOpen)}
              className="rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setOpen((o) => ({ ...o, [s.id]: true }));
                  document.getElementById(`pb-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-full border border-border bg-panel px-2.5 py-1 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-accent"
              >
                {s.title}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {sections.map((s) => (
        <Card key={s.id} id={`pb-${s.id}`} className="scroll-mt-4">
          <button onClick={() => toggle(s.id)} className="w-full text-left">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <span className="text-accent">{s.icon}</span>
                {s.title}
                <span className="hidden text-[11px] font-normal text-muted-foreground sm:inline">
                  · {s.tag}
                </span>
              </CardTitle>
              <ChevronDown
                size={18}
                className={`shrink-0 text-muted-foreground transition-transform ${open[s.id] ? "rotate-180" : ""}`}
              />
            </CardHeader>
          </button>
          {open[s.id] && <CardContent className="space-y-4 pt-0">{s.body}</CardContent>}
        </Card>
      ))}

      <p className="px-1 pb-2 text-center text-[11px] text-muted-foreground">
        Brojevi marži po sektorima su tipični rasponi za orijentaciju — uvek proveri sa stvarnim podacima kompanije.
      </p>
    </div>
  );
}

/* ===================================================================== */
/* Content                                                                */
/* ===================================================================== */

function buildSections(): Section[] {
  return [
    /* 1 — The spine: how the 3 statements link ----------------------- */
    {
      id: "links",
      title: "Kako se 3 izveštaja povezuju",
      tag: "the spine of every model",
      icon: <Link2 size={16} />,
      body: (
        <>
          <Note>
            Tri izveštaja nisu odvojena — to je jedan sistem. Bilo koja promena negde mora da se „zatvori"
            na druga dva mesta. Ovo je srž svakog case-a i modela.
          </Note>
          <div className="space-y-2">
            <H>Glavne veze (zlatna pravila)</H>
            <F>Neto dobit (BU) → vrh CFO &amp; → Zadržana dobit (BS, kapital)</F>
            <F>Amortizacija (nenovčano) → dodaje se nazad u CFO; smanjuje neto PP&amp;E (BS)</F>
            <F>↑ Imovina (zalihe, potraživanja) = ODLIV keša (−CFO)</F>
            <F>↑ Obaveza (dobavljači, avansi) = PRILIV keša (+CFO)</F>
            <F>CapEx → CFI (−); ↑ PP&amp;E (BS)</F>
            <F>Krediti +/−, emisija akcija, dividende → CFF; menja dug/kapital (BS)</F>
            <F>Krajnji keš (CF) = red „Gotovina" u bilansu stanja</F>
            <F>AKTIVA = OBAVEZE + KAPITAL (bilans uvek mora da balansira)</F>
          </div>
          <Note>
            <span className="text-gold">Mnemonik:</span> „Svaka promena u bilansu stanja ima posledicu u
            cash flow-u ili u bilansu uspeha." Ako se nešto ne zatvara — negde ti fali stavka.
          </Note>
        </>
      ),
    },

    /* 2 — Walk me through ------------------------------------------- */
    {
      id: "walk",
      title: "Walk me through… scenariji",
      tag: "the classic interview test",
      icon: <ArrowRightLeft size={16} />,
      body: (
        <>
          <Note>
            Najčešće EY/IB pitanje. Uvek istim redom: <b>BU → CF → BS</b>, pa proveri da li bilans balansira.
            Pretpostavka poreske stope = 40% (klasičan primer; realno ~18–25%).
          </Note>

          <div className="space-y-1.5">
            <H>Amortizacija +100 (tax 40%)</H>
            <Note><b>BU:</b> EBIT −100 → porez −40 → neto dobit −60.</Note>
            <Note><b>CF:</b> kreni od NI −60, dodaj amortizaciju +100 → CFO +40. Keš +40.</Note>
            <Note><b>BS:</b> Keš +40, PP&amp;E −100 → aktiva −60; kapital (RE) −60. ✔ Balansira.</Note>
            <Note className="text-gold">Pointa: amortizacija je nenovčana i poreski štit — keš zapravo RASTE za iznos uštede na porezu.</Note>
          </div>

          <div className="space-y-1.5">
            <H>Zalihe +100 (kupljene na keš)</H>
            <Note><b>BU:</b> nema efekta (još nije prodato).</Note>
            <Note><b>CF:</b> ↑ zalihe = −100 u CFO. Keš −100.</Note>
            <Note><b>BS:</b> zalihe +100, keš −100 → aktiva ravna. ✔</Note>
          </div>

          <div className="space-y-1.5">
            <H>Podizanje duga +100</H>
            <Note><b>BU:</b> nema (dok ne plati kamatu).</Note>
            <Note><b>CF:</b> +100 u CFF. Keš +100.</Note>
            <Note><b>BS:</b> keš +100 (aktiva), dug +100 (obaveze). ✔</Note>
          </div>

          <div className="space-y-1.5">
            <H>Otpis (write-down) zaliha −100 (tax 40%)</H>
            <Note><b>BU:</b> trošak +100 → neto dobit −60.</Note>
            <Note><b>CF:</b> NI −60, dodaj nazad nenovčani otpis +100 → CFO +40 (ušteda na porezu).</Note>
            <Note><b>BS:</b> keš +40, zalihe −100 → aktiva −60; kapital −60. ✔</Note>
          </div>
        </>
      ),
    },

    /* 3 — Working capital & cash cycle ------------------------------ */
    {
      id: "wc",
      title: "Obrtni kapital i ciklus keša",
      tag: "where cash hides",
      icon: <Wallet size={16} />,
      body: (
        <>
          <F>Neto obrtni kapital (NWC) = (obrtna imovina − keš) − (kratk. obaveze − kratk. dug)</F>
          <F>DSO = Potraživanja / Prihod × 365 — dani naplate</F>
          <F>DIO = Zalihe / COGS × 365 — dani zaliha</F>
          <F>DPO = Dobavljači / COGS × 365 — dani plaćanja</F>
          <F>Ciklus konverzije keša (CCC) = DSO + DIO − DPO</F>
          <Note>
            <b>CCC &lt; 0</b> = dobavljači finansiraju posao (super — supermarketi, e-commerce).
            <b> CCC visok</b> = keš zaglavljen; rast „jede" gotovinu. <b>↑ NWC = odliv keša.</b>
          </Note>
        </>
      ),
    },

    /* 4 — Margins & profitability ----------------------------------- */
    {
      id: "margins",
      title: "Marže i profitabilnost",
      tag: "is it a good business?",
      icon: <Gauge size={16} />,
      body: (
        <>
          <F>Bruto marža = Bruto dobit / Prihod</F>
          <F>EBITDA marža = EBITDA / Prihod &nbsp;(EBITDA = EBIT + amortizacija)</F>
          <F>Operativna (EBIT) marža = EBIT / Prihod</F>
          <F>Neto marža = Neto dobit / Prihod</F>
          <F>Kontribuciona marža = (Prihod − varijabilni troškovi) / Prihod</F>
          <F>Operativni leveridž = %Δ EBIT / %Δ Prihod</F>
          <Note>
            Visok fiksni trošak (plate, flota, zakup) = visok operativni leveridž → EBITDA snažno reaguje na
            obim. To je srce i bull i bear scenarija.
          </Note>
        </>
      ),
    },

    /* 5 — Returns --------------------------------------------------- */
    {
      id: "returns",
      title: "Prinosi (ROE / ROA / ROIC) + DuPont",
      tag: "returns on capital",
      icon: <TrendingUp size={16} />,
      body: (
        <>
          <F>ROA = Neto dobit / Prosečna aktiva</F>
          <F>ROE = Neto dobit / Prosečan kapital</F>
          <F>ROIC = NOPAT / Investirani kapital &nbsp; (NOPAT = EBIT × (1 − poreska stopa))</F>
          <F>Investirani kapital = Dug + Kapital − Keš ( = neto obrtni kap. + neto fiksna imovina)</F>
          <div className="space-y-1">
            <H>DuPont razlaganje ROE</H>
            <F>ROE = Neto marža × Obrt aktive × Multiplikator kapitala</F>
            <F>= (NI/Prihod) × (Prihod/Aktiva) × (Aktiva/Kapital)</F>
          </div>
          <Note>
            <b>ROIC vs WACC</b> je test stvaranja vrednosti: ROIC &gt; WACC = kompanija stvara vrednost rastom;
            ROIC &lt; WACC = rast UNIŠTAVA vrednost.
          </Note>
        </>
      ),
    },

    /* 6 — Leverage, coverage, FCF ----------------------------------- */
    {
      id: "leverage",
      title: "Zaduženost, pokriće i slobodan keš",
      tag: "can it survive?",
      icon: <Scale size={16} />,
      body: (
        <>
          <F>Neto dug = Ukupan dug − Keš i ekvivalenti</F>
          <F>Neto dug / EBITDA &nbsp;(&lt;2x nisko · 2–4x umereno · &gt;4x visoko/rizično)</F>
          <F>Dug / Kapital · Dug / (Dug + Kapital)</F>
          <F>Pokriće kamate = EBIT / Kamata &nbsp;(ili EBITDA / Kamata)</F>
          <F>Slobodan novčani tok (FCF) = CFO − CapEx</F>
          <F>FCFF = EBIT×(1−t) + amortizacija − CapEx − ΔNWC</F>
          <F>FCF konverzija = FCF / EBITDA &nbsp;(kvalitet zarade; &gt;50% je dobro)</F>
          <Note>
            U PE/LBO logici: <b>Neto dug/EBITDA</b> i <b>pokriće kamate</b> određuju koliko duga posao podnosi i
            koliko ima „covenant headroom"-a pre nego što banke pozovu.
          </Note>
        </>
      ),
    },

    /* 7 — Liquidity ------------------------------------------------- */
    {
      id: "liquidity",
      title: "Likvidnost",
      tag: "short-term survival",
      icon: <Droplets size={16} />,
      body: (
        <>
          <F>Tekuća likvidnost (current) = Obrtna imovina / Kratkoročne obaveze &nbsp;(&gt;1 zdravo)</F>
          <F>Brza (quick/acid) = (Obrtna imovina − Zalihe) / Kratk. obaveze</F>
          <F>Keš racio = Keš / Kratk. obaveze</F>
          <Note>Negativan obrtni kapital nije uvek loš — kod retaila/usluga to je znak da dobavljači finansiraju posao.</Note>
        </>
      ),
    },

    /* 8 — EBITDA & quality of earnings ------------------------------ */
    {
      id: "qoe",
      title: "EBITDA i kvalitet zarade (QoE)",
      tag: "the number you pay a multiple on",
      icon: <Sigma size={16} />,
      body: (
        <>
          <F>EBITDA = EBIT + amortizacija = aproksimacija keš operativnog profita</F>
          <Note>
            <b>Zašto se koristi:</b> neutralan na strukturu kapitala i poreze → poredi firme jabuka-s-jabukom.
            <b> Mane:</b> ignoriše CapEx, obrtni kapital i kamatu — <i>nije</i> cash flow. (Munger: „bullshit earnings".)
          </Note>
          <div className="space-y-1">
            <H>Normalizovana / Adjusted EBITDA</H>
            <Note>
              Dodaj nazad jednokratne stavke: restrukturiranje, sudski troškovi, vlasničke „add-back"-ove
              (plate vlasnika iznad tržišne, lični troškovi). QoO (quality of earnings) izbacuje agresivne add-back-ove
              i daje „čistu" EBITDA — to je broj na koji kupac plaća multiplikator.
            </Note>
          </div>
          <Note className="text-gold">
            Crveni signal: ako je EBITDA visoka a CFO mnogo niži → zarada je „papirnata" (loš kvalitet).
          </Note>
        </>
      ),
    },

    /* 9 — Valuation ------------------------------------------------- */
    {
      id: "valuation",
      title: "Valuacija (EV, multipli, DCF, LBO)",
      tag: "what's it worth?",
      icon: <Calculator size={16} />,
      body: (
        <>
          <F>EV (enterprise value) = Equity value + Neto dug + manjinski int. + pref. − pridružena društva</F>
          <F>Equity bridge: Equity value = EV − Neto dug</F>
          <F>Multipli: EV/EBITDA · EV/EBIT · EV/Sales · P/E · P/B · FCF prinos</F>
          <div className="space-y-1">
            <H>DCF (skelet)</H>
            <F>Vrednost = Σ FCFF_t / (1+WACC)^t + Terminalna vrednost</F>
            <F>TV = FCF×(1+g) / (WACC − g) &nbsp; ILI &nbsp; izlazni EV/EBITDA multipl</F>
          </div>
          <div className="space-y-1">
            <H>LBO intuicija</H>
            <Note>
              Prinos (IRR/MOIC) dolazi iz 3 izvora: <b>deleveraging</b> (otplata duga keš tokom), <b>rast EBITDA</b>
              (operativno poboljšanje) i <b>multiple expansion</b> (kupi jeftino, prodaj skupo). Ulazni leveridž
              pojačava sve.
            </Note>
          </div>
          <Note>Multipl se zaslužuje: viši rast + širenje marže = viši multipl; leveridž i koncentracija ga obaraju.</Note>
        </>
      ),
    },

    /* 10 — What matters vs noise ------------------------------------ */
    {
      id: "matters",
      title: "Šta je BITNO, šta je šum",
      tag: "signal vs noise",
      icon: <Target size={16} />,
      body: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3">
              <H>✓ Bitno (na ovo troši vreme)</H>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground">
                <li>Kvalitet i drajveri rasta prihoda (volumen vs cena vs miks)</li>
                <li>Trajektorija marže i <i>zašto</i> (struktura troškova)</li>
                <li>Konverzija keša (CCC, FCF/EBITDA) i CapEx potrebe</li>
                <li>Leveridž i covenant headroom</li>
                <li>Koncentracija kupaca / recurring vs jednokratno</li>
                <li>Normalizovana EBITDA (QoE)</li>
                <li>Downside scenario — šta lomi tezu</li>
              </ul>
            </div>
            <div className="rounded-md border border-red-500/40 bg-red-500/5 p-3">
              <H>✗ Šum (ne gubi vreme)</H>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-foreground">
                <li>Sitne jednokratne stavke koje se ponište</li>
                <li>Preciznost preko 1 decimale</li>
                <li>Računovodstvena „geografija" koja neto = 0</li>
                <li>Nematerijalne linije bilansa</li>
                <li>GAAP vs non-GAAP kozmetika bez keš efekta</li>
                <li>Savršeno modeliranje pre nego što razumeš posao</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },

    /* 11 — Case attack plan ----------------------------------------- */
    {
      id: "plan",
      title: "Plan napada na case (EY)",
      tag: "step by step",
      icon: <ListChecks size={16} />,
      body: (
        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-foreground">
          <li><b>Šta posao radi</b> i kako pravi novac (unit economics) — pre svih brojeva.</li>
          <li><b>Top line:</b> rast, volumen vs cena vs miks, recurring vs jednokratno, koncentracija.</li>
          <li><b>Marže:</b> bruto → EBITDA → neto; trend i drajveri; fiksno vs varijabilno.</li>
          <li><b>Keš:</b> CCC, FCF konverzija, intenzitet CapEx-a.</li>
          <li><b>Bilans:</b> leveridž, likvidnost, vanbilansne stavke, rezervisanja.</li>
          <li><b>Kvalitet zarade:</b> normalizuj EBITDA (skini one-off i add-back).</li>
          <li><b>Valuacija:</b> raspon multiplikatora, EV → equity.</li>
          <li><b>Verdikt:</b> Buy / Pass, po kojoj ceni, ključni rizici i šta lomi tezu.</li>
        </ol>
      ),
    },

    /* 12 — Red flags ------------------------------------------------ */
    {
      id: "flags",
      title: "Red flags i računovodstveni trikovi",
      tag: "what kills a deal",
      icon: <AlertTriangle size={16} />,
      body: (
        <ul className="list-disc space-y-1 pl-5 text-xs text-foreground">
          <li><b>Potraživanja rastu brže od prihoda</b> → „channel stuffing" / agresivno priznavanje prihoda.</li>
          <li><b>DIO raste</b> → zastarele/neprodate zalihe.</li>
          <li><b>Kapitalizacija troškova</b> koji bi trebalo da budu rashod (naduvava EBIT).</li>
          <li><b>Jednokratni dobici</b> u „ostalim prihodima" guraju EBIT naviše.</li>
          <li><b>CFO &lt;&lt; neto dobit</b> → nizak kvalitet zarade.</li>
          <li><b>„Restrukturiranje" svake godine</b> → to nije jednokratno.</li>
          <li><b>Goodwill &gt; kapital</b> → rizik preplaćenih akvizicija / impairment.</li>
          <li><b>Pogoršanje obrtnog kapitala</b> uz „rast".</li>
          <li><b>Transakcije s povezanim licima</b> — uvek čačkaj.</li>
        </ul>
      ),
    },

    /* 13 — Sector fingerprints -------------------------------------- */
    {
      id: "sectors",
      title: "Profili ~50 sektora",
      tag: "fingerprint the business",
      icon: <Building2 size={16} />,
      body: (
        <>
          <Note>
            Marža + intenzitet kapitala + oblik obrtnog kapitala obično su dovoljni da „pročitaš" sektor.
            Rasponi su tipični/orijentacioni. <b>O</b> = online, <b>F</b> = offline, <b>H</b> = hibrid.
          </Note>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] border-collapse text-[11px]">
              <thead>
                <tr className="bg-elevated text-left text-muted-foreground">
                  <th className="px-2 py-2 font-semibold">Sektor</th>
                  <th className="px-2 py-2 font-semibold">Kanal</th>
                  <th className="px-2 py-2 font-semibold">Bruto m.</th>
                  <th className="px-2 py-2 font-semibold">EBITDA m.</th>
                  <th className="px-2 py-2 font-semibold">Kapital</th>
                  <th className="px-2 py-2 font-semibold">Obrtni kap. / ključni KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {SECTORS.map((r) => (
                  <tr key={r[0]} className="hover:bg-elevated/50">
                    <td className="px-2 py-1.5 font-medium">{r[0]}</td>
                    <td className="px-2 py-1.5">{r[1]}</td>
                    <td className="px-2 py-1.5">{r[2]}</td>
                    <td className="px-2 py-1.5">{r[3]}</td>
                    <td className="px-2 py-1.5">{r[4]}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{r[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ),
    },
  ];
}

/* Sector data: [name, channel, gross, ebitda, capital intensity, WC/KPI] */
const SECTORS: string[][] = [
  ["SaaS / Software", "O", "75–85%", "20–40%", "Nizak", "Negativan WC (deferred); ARR, NRR, churn, CAC/LTV, Rule of 40"],
  ["Marketplace / platforma", "O", "60–70%", "15–30%", "Nizak", "Float (neg. WC); GMV, take rate"],
  ["E-commerce (1P)", "O", "25–40%", "3–8%", "Umeren (skladišta)", "Negativan WC; AOV, repeat rate"],
  ["Cybersecurity SaaS", "O", "75–85%", "15–30%", "Nizak", "Deferred rev; ARR, NRR, net new logos"],
  ["Fintech / payments", "O", "40–60%", "20–35%", "Asset-light", "Float; TPV, take rate"],
  ["Video igre", "O", "60–75%", "25–35%", "Umeren (dev)", "Deferred bookings; MAU, live-service rev"],
  ["Streaming / media", "O", "40–60%", "10–25%", "Content capex", "Subs, ARPU, churn, content spend"],
  ["Online edukacija", "O", "60–70%", "15–25%", "Nizak", "Deferred tuition; enrollment, completion"],
  ["Oglašavanje / agencije", "H", "—", "15–20%", "Asset-light", "Pass-through WC; organic growth"],
  ["Asset management", "H", "visoka", "30–40%", "Asset-light", "AUM, fee rate, neto prilivi"],
  ["Banke", "H", "n/a", "n/a", "Bilansno", "NIM, cost/income, CET1, ROE, NPL"],
  ["Osiguranje", "H", "n/a", "n/a", "Float", "Combined ratio, solventnost"],
  ["Telekom", "F", "visoka", "35–45%", "Vrlo visok (mreža)", "Blago neg. WC; ARPU, churn, subs"],
  ["Utilities / struja", "F", "—", "30–50%", "Vrlo visok", "Regulisan; RAB, mix proizvodnje"],
  ["Obnovljiva energija", "F", "—", "70–85%", "Vrlo visok (upfront)", "Capacity factor, PPA, LCOE"],
  ["Nafta i gas (integr.)", "F", "—", "10–20%", "Vrlo visok", "Proizvodnja, rafinerijska marža"],
  ["Rudarstvo / metali", "F", "—", "25–45%", "Vrlo visok", "Ciklično; cena robe, cash cost/t"],
  ["Hemija", "F", "20–35%", "12–20%", "Visok", "Iskorišćenost, spreadovi"],
  ["Građ. materijal (cement)", "F", "30–40%", "20–30%", "Visok", "Volumeni, cene, trošak energije"],
  ["Farma (brendirana)", "F", "75–85%", "30–40%", "Umeren (R&D)", "Pipeline, patent cliff"],
  ["Generička farma", "F", "45–55%", "20–28%", "Umeren", "Visok WC; volumen, regulativa"],
  ["Biotech (pre-revenue)", "O/F", "—", "negativna", "R&D burn", "Cash runway, pipeline"],
  ["Medicinski uređaji", "F", "60–70%", "25–30%", "Umeren", "Installed base, recurring potrošni"],
  ["Bolnice / zdravstvo", "F", "—", "15–25%", "Visok", "Potraživanja od osiguranja; popunjenost"],
  ["FMCG / hrana", "F", "30–45%", "12–20%", "Umeren", "Volumen/cena, tržišni udeo brenda"],
  ["Pića (soft/alko)", "F", "40–60%", "20–30%", "Umeren", "Volumen, neto prihod/sanduk"],
  ["Duvan", "F", "60–70%", "35–45%", "Nizak", "Pad volumena, cenovna moć"],
  ["Maloprodaja hrane", "F", "20–28%", "4–7%", "Umeren", "Negativan WC; LFL prodaja, prodaja/m²"],
  ["Moda / odeća", "H", "50–60%", "10–15%", "Umeren", "Zalihe (poz. WC); obrt, sell-through"],
  ["Luksuz", "H", "60–70%", "25–35%", "Nizak-umeren", "Brend, same-store"],
  ["Restorani (lanac)", "F", "60–70%", "15–20%", "Umeren (build-out)", "Negativan WC; same-store sales, AUV"],
  ["QSR franšizer", "H", "—", "40–50%", "Asset-light", "Rast jedinica, royalty"],
  ["Hoteli (vlasništvo)", "F", "—", "25–35%", "Vrlo visok", "RevPAR, popunjenost, ADR"],
  ["Hoteli (asset-light)", "H", "—", "30–40%", "Nizak", "Fee revenue, pipeline"],
  ["Avio-kompanije", "F", "—", "10–20%", "Vrlo visok (flota)", "Negativan WC; load factor, RASK/CASK"],
  ["Logistika / transport", "F", "15–25%", "12–20%", "Visok (flota)", "Cena/km, iskorišćenost"],
  ["Brodarstvo", "F", "—", "30–50%", "Vrlo visok", "Ciklično; day rates"],
  ["Real estate / REIT", "F", "—", "60–70% NOI", "Asset-heavy", "Popunjenost, cap rate, FFO"],
  ["Homebuilders", "F", "18–25%", "12–18%", "Zalihe (zemljište)", "Vrlo visok WC; ASP, land bank"],
  ["Automobili (OEM)", "F", "10–20%", "8–12%", "Vrlo visok", "Jedinice, ASP, iskorišćenost"],
  ["Auto delovi", "F", "15–25%", "10–15%", "Visok", "Content per vehicle"],
  ["Aerospace / odbrana", "F", "15–25%", "12–18%", "Visok", "Backlog, book-to-bill, avansi"],
  ["Industrijska oprema", "F", "30–40%", "15–20%", "Umeren-visok", "Narudžbe, backlog"],
  ["Građevina / inženjering", "F", "8–15%", "5–10%", "Umeren", "Milestone WC; backlog, marža na ugovor"],
  ["Poluprovodnici (fabless)", "O", "50–65%", "30–40%", "Nizak", "Design wins, node"],
  ["Poluprovodnici (foundry)", "F", "40–55%", "40–55%", "Ekstreman capex", "Iskorišćenost, capex/sales"],
  ["Hardver / elektronika", "F", "20–35%", "8–15%", "Umeren", "ASP, jedinice"],
  ["Poljoprivreda", "F", "nisko-umer.", "10–20%", "Visok (zemlja)", "Sezonski WC, biološka sredstva; prinos"],
  ["Konsalting / prof. usluge", "H", "—", "15–25%", "Asset-light", "Utilization, bill rate, headcount"],
  ["Staffing / HR", "F", "15–25%", "4–8%", "Asset-light", "Potraživanja; bruto marža, temp/perm"],
  ["Kockanje / kazina", "H", "—", "25–35%", "Visok (objekti)", "Negativan WC; GGR, hold %"],
  ["Lutrija / gaming (OPAP)", "H", "—", "30–45%", "Nizak", "Monopol; GGR, payout ratio"],
];

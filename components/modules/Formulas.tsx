"use client";

import { useState } from "react";
import { Card, CardContent } from "../ui";
import {
  Gauge,
  TrendingUp,
  Droplets,
  Wallet,
  Scale,
  Banknote,
  Calculator,
  LineChart,
} from "lucide-react";

interface Formula {
  name: string;
  formula: string;
  measures: string; // Meri
  impact: string; // Uticaj u bilansu / privredi
}
interface FCat {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent: string; // tailwind text color
  items: Formula[];
}

const CATS: FCat[] = [
  {
    id: "prof",
    label: "Profitabilnost",
    icon: <Gauge size={15} />,
    accent: "text-green-400",
    items: [
      { name: "Bruto marža", formula: "Bruto dobit / Prihod = (Prihod − COGS) / Prihod", measures: "koliko ostaje posle direktnih troškova proizvodnje/nabavke", impact: "Visoka = cenovna moć / value-add. Pad signalizira pritisak cena ili skuplje inpute (u privredi: inflacija sirovina/energije)." },
      { name: "Operativna (EBIT) marža", formula: "EBIT / Prihod", measures: "profitabilnost iz osnovne delatnosti, pre kamate i poreza", impact: "Odražava operativnu efikasnost; pada kad fiksni troškovi (plate, zakup) rastu brže od prihoda (operativni leveridž)." },
      { name: "EBITDA marža", formula: "EBITDA / Prihod  (EBITDA = EBIT + amortizacija)", measures: "keš-operativnu profitabilnost, bez nenovčane amortizacije", impact: "Baza za EV/EBITDA i poređenje firmi različite strukture kapitala. Ne uključuje CapEx ni obrtni kapital." },
      { name: "Neto marža", formula: "Neto dobit / Prihod", measures: "koliko od svakog dinara prihoda ostane vlasnicima posle svega", impact: "Neto dobit povećava kapital (zadržanu dobit) u bilansu stanja — veza BU → BS." },
    ],
  },
  {
    id: "ret",
    label: "Prinosi (ROE/ROA/ROIC)",
    icon: <TrendingUp size={15} />,
    accent: "text-accent",
    items: [
      { name: "ROA — prinos na aktivu", formula: "Neto dobit / Prosečna ukupna aktiva", measures: "koliko efikasno celokupna imovina pravi dobit", impact: "Spaja BU (dobit) i BS (aktiva). Niži kod kapitalno-intenzivnih (velika aktiva)." },
      { name: "ROE — prinos na kapital", formula: "Neto dobit / Prosečan kapital", measures: "prinos koji ostvaruju vlasnici na svoj uloženi kapital", impact: "Leveridž ga diže: više duga → manje kapitala u imeniocu → viši ROE (ali i veći rizik)." },
      { name: "ROI — prinos na investiciju", formula: "(Dobit od investicije − trošak) / Trošak investicije", measures: "opštu isplativost bilo kog ulaganja", impact: "Generalna mera; ne uzima u obzir vreme ni rizik (za to DCF/IRR)." },
      { name: "ROIC — prinos na uloženi kapital", formula: "NOPAT / Investirani kapital;  NOPAT = EBIT×(1−t);  Inv. kapital = Dug + Kapital − Keš", measures: "prinos na SAV kapital (dug + vlasnički) uložen u posao", impact: "Ključni test stvaranja vrednosti: ROIC > WACC = firma stvara vrednost rastom; ROIC < WACC = rast UNIŠTAVA vrednost." },
      { name: "ROCE", formula: "EBIT / Capital Employed  (Capital Employed = Ukupna aktiva − tekuće obaveze)", measures: "prinos na angažovani kapital, pre poreza i strukture finansiranja", impact: "Dobar za poređenje firmi u istom sektoru bez uticaja poreza/duga." },
      { name: "DuPont (3 faktora)", formula: "ROE = Neto marža × Obrt aktive × Multiplikator kapitala\n= (NI/Prihod) × (Prihod/Aktiva) × (Aktiva/Kapital)", measures: "razlaže ODAKLE dolazi ROE", impact: "Pokazuje da li ROE dolazi od marže (profitabilnost), efikasnosti (obrt) ili duga (leveridž) — ključno za kvalitet prinosa." },
      { name: "DuPont (5 faktora)", formula: "ROE = (NI/PBT) × (PBT/EBIT) × (EBIT/Prihod) × (Prihod/Aktiva) × (Aktiva/Kapital)\n= poreski teret × kamatni teret × oper. marža × obrt × leveridž", measures: "još finije razlaganje ROE-a", impact: "Izoluje koliko porez i kamata (struktura duga) jedu prinos." },
    ],
  },
  {
    id: "liq",
    label: "Likvidnost",
    icon: <Droplets size={15} />,
    accent: "text-cyan-400",
    items: [
      { name: "Tekuća likvidnost (Current)", formula: "Obrtna imovina / Tekuće obaveze", measures: "kratkoročnu sposobnost plaćanja obaveza", impact: "< 1 = potencijalni rizik likvidnosti. Previsoka može značiti neefikasno korišćenje keša/zaliha." },
      { name: "Brza likvidnost (Quick / Acid-test)", formula: "(Obrtna imovina − Zalihe) / Tekuće obaveze", measures: "pokrivenost obaveza bez najnelikvidnije stavke (zalihe)", impact: "Stroža mera — bitna za firme sa sporim zalihama. Quick < 1 a Current > 1 = previše keša zaglavljeno u zalihama." },
      { name: "Keš racio (Cash ratio)", formula: "(Keš + utrživi HOV) / Tekuće obaveze", measures: "najstroža likvidnost — samo gotovina", impact: "Pokazuje da li firma može da plati obaveze ODMAH, bez naplate ili prodaje zaliha." },
      { name: "Defanzivni interval", formula: "(Keš + utrživi HOV + potraživanja) / dnevni operativni troškovi", measures: "koliko DANA firma preživi bez ijednog novog priliva", impact: "Bitno u krizi / sezonskim padovima — runway u danima." },
    ],
  },
  {
    id: "wc",
    label: "Obrtni kapital & CCC",
    icon: <Wallet size={15} />,
    accent: "text-gold",
    items: [
      { name: "NWC — neto obrtni kapital", formula: "Obrtna imovina − Tekuće obaveze\n(operativni: (Potraživanja + Zalihe) − Dobavljači)", measures: "koliko je keša zaglavljeno u svakodnevnim operacijama", impact: "↑ NWC = ODLIV keša (smanjuje CFO). Rast firme bez kontrole NWC-a 'jede' gotovinu — čest uzrok kriza likvidnosti." },
      { name: "DSO — dani naplate", formula: "(Potraživanja / Prihod) × 365", measures: "prosečno koliko dana treba da se naplati od kupaca", impact: "Rast DSO brže od prihoda = kupci kasne ili agresivno priznavanje prihoda (red flag)." },
      { name: "DIO — dani zaliha", formula: "(Zalihe / COGS) × 365", measures: "koliko dana roba stoji na zalihama pre prodaje", impact: "Rast DIO = zastarele/neprodate zalihe; vezuje keš." },
      { name: "DPO — dani plaćanja", formula: "(Dobavljači / COGS) × 365", measures: "koliko dana firma kasni plaćanje dobavljačima", impact: "Visok DPO = dobavljači finansiraju firmu (besplatan kredit), ali predugo kvari odnose." },
      { name: "CCC — ciklus konverzije keša", formula: "CCC = DSO + DIO − DPO", measures: "broj dana od plaćanja dobavljaču do naplate od kupca — koliko je keš 'zarobljen'", impact: "KAKO SE DOLAZI: izračunaj DSO, DIO i DPO, pa saberi prva dva i oduzmi DPO. Negativan CCC = dobavljači finansiraju posao (supermarketi, e-commerce) — strukturna prednost. Dug CCC = rast guta keš." },
      { name: "Obrt aktive / zaliha / potraživanja", formula: "Prihod / Pros. aktiva   ·   COGS / Pros. zalihe   ·   Prihod / Pros. potraživanja", measures: "koliko puta godišnje se 'obrne' imovina/zalihe/potraživanja", impact: "Viši obrt = efikasnije korišćenje sredstava (manje kapitala za isti prihod)." },
    ],
  },
  {
    id: "lev",
    label: "Zaduženost & solventnost",
    icon: <Scale size={15} />,
    accent: "text-orange-400",
    items: [
      { name: "Dug / Kapital (D/E)", formula: "Ukupan dug / Kapital", measures: "odnos pozajmljenog i vlasničkog finansiranja", impact: "Viši = veći finansijski rizik i veći ROE u dobrim vremenima, ali brži propast u lošim." },
      { name: "Dug / Ukupan kapital", formula: "Dug / (Dug + Kapital)", measures: "udeo duga u ukupnoj strukturi finansiranja", impact: "Koristi se u WACC-u kao ponder (D/V)." },
      { name: "Neto dug / EBITDA", formula: "(Ukupan dug − Keš) / EBITDA", measures: "koliko godina EBITDA treba da otplati neto dug", impact: "< 2x nisko · 2–4x umereno · > 4x rizično. Ključna mera za PE/LBO i bankarske kovenante." },
      { name: "Pokriće kamate (TIE)", formula: "EBIT / Rashodi kamata", measures: "koliko puta operativna dobit pokriva kamatu", impact: "< 2x = tesno, malo prostora; rast kamata (makro) direktno smanjuje ovaj racio." },
      { name: "DSCR — pokriće duga", formula: "EBITDA / (Kamata + otplata glavnice)", measures: "sposobnost servisiranja celokupnog duga (kamata + glavnica)", impact: "Banke prate < 1.2x kao opasnost; centar projektnog/LBO finansiranja." },
      { name: "Finansijski leveridž", formula: "Prosečna aktiva / Prosečan kapital", measures: "koliko je aktiva 'naduvana' dugom u odnosu na kapital", impact: "Multiplikator u DuPont-u — pretvara ROA u ROE." },
    ],
  },
  {
    id: "cf",
    label: "Novčani tok (FCF)",
    icon: <Banknote size={15} />,
    accent: "text-emerald-400",
    items: [
      { name: "OCF / CFO — operativni keš tok", formula: "Neto dobit + amortizacija ± promene NWC", measures: "keš generisan iz osnovne delatnosti", impact: "Ako je CFO mnogo niži od neto dobiti → zarada je 'papirnata' (loš kvalitet)." },
      { name: "FCF — slobodan novčani tok (opšte)", formula: "FCF = CFO − CapEx", measures: "keš slobodan posle ulaganja u održavanje i rast imovine", impact: "Ono što firma zaista može da podeli, otplati dug ili reinvestira. Srž vrednosti firme." },
      { name: "FCFF — slobodan keš firme", formula: "FCFF = EBIT×(1−t) + amortizacija − CapEx − ΔNWC", measures: "keš dostupan SVIM investitorima (i dug i kapital)", impact: "Diskontuje se WACC-om u DCF-u → daje Enterprise Value (vrednost cele firme)." },
      { name: "FCFE — slobodan keš za akcionare", formula: "FCFE = FCFF − Kamata×(1−t) + neto zaduživanje\n= Neto dobit + amort − CapEx − ΔNWC + neto dug", measures: "keš dostupan SAMO akcionarima, posle servisa duga", impact: "Diskontuje se cenom kapitala (CAPM) → daje Equity Value (vrednost kapitala)." },
      { name: "FCF konverzija", formula: "FCF / EBITDA", measures: "koliko se EBITDA stvarno pretvara u keš", impact: "> 50% je dobro; nisko = velike capex/WC potrebe gutaju 'profit'." },
    ],
  },
  {
    id: "coc",
    label: "Cena kapitala (WACC/CAPM)",
    icon: <Calculator size={15} />,
    accent: "text-violet-400",
    items: [
      { name: "WACC — ponderisana cena kapitala", formula: "WACC = (E/V)×Re + (D/V)×Rd×(1−t)\nE = kapital, D = dug, V = E+D, t = poreska stopa", measures: "prosečnu cenu finansiranja firme; diskontnu stopu za FCFF", impact: "Niži WACC = viša vrednost firme. Raste kad centralna banka diže kamate (makro) → valuacije padaju." },
      { name: "Cost of equity (Re) — CAPM", formula: "Re = Rf + β × (Rm − Rf)", measures: "prinos koji akcionari traže za preuzeti rizik", impact: "Najveća komponenta WACC-a za firme s malo duga; raste s betom i premijom rizika." },
      { name: "Beta (β)", formula: "β = Cov(prinos akcije, prinos tržišta) / Var(tržište)", measures: "SISTEMSKI rizik akcije u odnosu na celo tržište", impact: "β = 1 → kreće se s tržištem · β > 1 → volatilnija/agresivnija · β < 1 → defanzivnija. Viša beta → viša cena kapitala → niža valuacija." },
      { name: "Cost of debt (Rd)", formula: "Rd = prinos do dospeća na dug (ili Kamata / Prosečan dug);  posle poreza = Rd×(1−t)", measures: "efektivnu cenu pozajmljenog novca", impact: "Kamata je poreski odbitna → 'poreski štit' (tax shield) čini dug jeftinijim od kapitala." },
      { name: "Risk-free rate (Rf)", formula: "Rf = prinos na 'bezrizičnu' državnu obveznicu (npr. 10g US Treasury / nemački Bund)", measures: "minimalni prinos bez rizika — baza svih diskontnih stopa", impact: "Raste s referentnom kamatom centralne banke → diže Re, Rd i WACC za sve firme (makro kanal)." },
      { name: "Equity Risk Premium (ERP)", formula: "ERP = Rm − Rf  (istorijski ~4–6%)", measures: "dodatni prinos koji tržište traži iznad bezrizične stope", impact: "Raste u krizama (strah) → diže cenu kapitala svima." },
    ],
  },
  {
    id: "mkt",
    label: "Tržišni / po akciji",
    icon: <LineChart size={15} />,
    accent: "text-pink-400",
    items: [
      { name: "EPS — zarada po akciji", formula: "(Neto dobit − pref. dividende) / ponderisani broj običnih akcija", measures: "deo dobiti koji pripada jednoj akciji", impact: "Pokretač cene akcije; otkup akcija ga diže (manji imenilac)." },
      { name: "P/E", formula: "Cena akcije / EPS", measures: "koliko investitori plaćaju za 1 din zarade", impact: "Viši P/E = tržište očekuje rast. Pada kad kamate (Rf) rastu." },
      { name: "P/B", formula: "Cena / Knjigovodstvena vrednost po akciji", measures: "cenu u odnosu na neto imovinu (kapital)", impact: "< 1 = trguje ispod knjige (value/distres); bitno za banke." },
      { name: "EV / EBITDA", formula: "EV = Tržišna kap. + Neto dug + manjinski + pref − pridružena;  pa EV / EBITDA", measures: "vrednost cele firme u odnosu na keš-operativnu dobit", impact: "Glavni M&A/PE multiplikator — neutralan na strukturu kapitala. Svakih 1.0x = EBITDA u vrednosti EV-a." },
      { name: "Dividendni prinos & payout", formula: "Prinos = DPS / Cena   ·   Payout = Dividende / Neto dobit", measures: "koliko firma vraća akcionarima", impact: "Visok payout = zrela firma s malo prilika za rast; nizak = reinvestira u rast." },
    ],
  },
];

export default function Formulas() {
  const [active, setActive] = useState(CATS[0].id);
  const cat = CATS.find((c) => c.id === active) ?? CATS[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="panel-grad">
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Formule — Financial Statement Analysis
            </h2>
            <p className="text-xs text-muted-foreground">
              Sve ključne formule za analizu izveštaja — šta mere i kako utiču na bilanse i na privredu.
            </p>
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active === c.id
                    ? "border-accent/60 bg-accent/15 text-accent"
                    : "border-border bg-panel text-muted-foreground hover:border-accent/40 hover:text-foreground"
                }`}
              >
                <span className={active === c.id ? "text-accent" : c.accent}>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active category header */}
      <div className="flex items-center gap-2 px-1">
        <span className={cat.accent}>{cat.icon}</span>
        <h3 className="font-display text-base font-semibold text-foreground">{cat.label}</h3>
        <span className="text-[11px] text-muted-foreground">· {cat.items.length} formula</span>
      </div>

      {/* Formula cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {cat.items.map((f) => (
          <Card key={f.name} className="flex flex-col">
            <CardContent className="space-y-2.5 p-4">
              <p className={`text-sm font-semibold ${cat.accent}`}>{f.name}</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-elevated px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground">
                {f.formula}
              </pre>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-accent">Meri: </span>
                {f.measures}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-gold">Uticaj (bilans / privreda): </span>
                {f.impact}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="px-1 pb-2 text-center text-[11px] text-muted-foreground">
        Sve što ti treba za Financial Statement Analysis (EY case + CFA L1/L2).
      </p>
    </div>
  );
}

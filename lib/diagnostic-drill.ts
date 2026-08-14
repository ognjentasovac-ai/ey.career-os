/**
 * Diagnostic Drill — deset dijagnostičkih pitanja koja proveravaju *kako* čitaš
 * finansijske izveštaje, a ne da li znaš formule (to je "Formule" tab).
 *
 * Pitanja su generička (rade i bez unetih podataka), ali se, kad slučaj ima
 * finansije, uz svako prikazuje i "Na ovom slučaju" linija sa stvarnim brojevima
 * — tako drill ostaje zakačen za kompaniju koju upravo gledaš.
 */
import type { StatementCase } from "./types";
import { analyseCase, analysePeriod, caseCashFlows } from "./statements";
import { eur } from "./utils";

/* ----------------------------- Model ----------------------------------- */

export interface DrillCheckpoint {
  /** Šta dobar odgovor mora da pomene. */
  label: string;
  /** Normalizovani okidači (bez dijakritika, mala slova) — sr + en. */
  keywords: string[];
}

export interface DrillQuestion {
  id: string;
  question: string;
  /** Šta pitanje zapravo testira. */
  tests: string;
  checkpoints: DrillCheckpoint[];
  /** Model odgovor — po tačkama. */
  model: string[];
  /** Klasična greška koju juniori prave na ovom pitanju. */
  trap: string;
  /** Linija sa stvarnim brojevima iz slučaja, ako ih ima. */
  live?: (c: StatementCase) => string | null;
}

/* --------------------------- Live anchors ------------------------------- */

function actuals(c: StatementCase) {
  return [...c.periods]
    .filter((p) => !p.projected)
    .sort((a, b) => yearNum(a.label) - yearNum(b.label));
}
function yearNum(label: string): number {
  const m = label.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
}
function hasData(c: StatementCase): boolean {
  return actuals(c).some((p) => p.pl.revenue);
}
const p1 = (n: number) => (isFinite(n) ? n.toFixed(1) : "n/a");

function liveMargins(c: StatementCase): string | null {
  if (!hasData(c)) return null;
  const ps = actuals(c);
  if (ps.length < 2) return null;
  const first = analysePeriod(ps[0]);
  const last = analysePeriod(ps[ps.length - 1]);
  const a = analyseCase(c);
  return `Prihodi ${p1(a.revenueCagr)}% CAGR, bruto marža ${p1(first.grossMargin)}% → ${p1(
    last.grossMargin
  )}% (${first.label} → ${last.label}), EBITDA marža ${a.marginDelta >= 0 ? "+" : ""}${p1(
    a.marginDelta
  )} pp.`;
}

function liveCashGap(c: StatementCase): string | null {
  if (!hasData(c)) return null;
  const cf = caseCashFlows(c.periods.filter((p) => !p.projected)).at(-1);
  if (!cf) return null;
  const gap = cf.operating - cf.netIncome;
  return `${cf.label}: neto dobit ${eur(cf.netIncome)} vs. operativni CF ${eur(
    cf.operating
  )} (razlika ${eur(gap)}); D&A ${eur(cf.da)}, promena obrtnog kapitala ${eur(cf.deltaWC)}.`;
}

function liveEbitda(c: StatementCase): string | null {
  const L = analyseCase(c).latest;
  if (!L || !L.revenue) return null;
  return `${L.label}: reportovana EBITDA ${eur(L.ebitda)} (marža ${p1(
    L.ebitdaMargin
  )}%), neto dobit ${eur(L.netIncome)}. Svaki add-back iznad ovoga mora da se brani.`;
}

function liveWorkingCapital(c: StatementCase): string | null {
  const a = analyseCase(c);
  const L = a.latest;
  if (!L || !L.revenue) return null;
  const prior = a.prior;
  const dso = prior
    ? `DSO ${p1(prior.dso)} → ${p1(L.dso)} dana`
    : `DSO ${p1(L.dso)} dana`;
  return `${dso}, DIO ${p1(L.dio)}, DPO ${p1(L.dpo)} → ciklus konverzije gotovine ${p1(
    L.cashConversionCycle
  )} dana.`;
}

function liveIntangibles(c: StatementCase): string | null {
  const ps = actuals(c);
  const last = ps.at(-1);
  if (!last) return null;
  const A = analysePeriod(last);
  if (!A.totalAssets) return null;
  const intan = last.bs.intangibles;
  return `${A.label}: nematerijalna ulaganja i goodwill ${eur(intan)} = ${p1(
    (intan / A.totalAssets) * 100
  )}% aktive; kapital ${eur(A.totalEquity)}, opipljiva knjigovodstvena vrednost ${eur(
    A.totalEquity - intan
  )}.`;
}

function liveLeverage(c: StatementCase): string | null {
  const L = analyseCase(c).latest;
  if (!L || !L.revenue) return null;
  return `${L.label}: neto dug ${eur(L.netDebt)} = ${p1(
    L.netDebtToEbitda
  )}x EBITDA, current ratio ${p1(L.currentRatio)}x.`;
}

function liveCapex(c: StatementCase): string | null {
  const cf = caseCashFlows(c.periods.filter((p) => !p.projected)).at(-1);
  if (!cf) return null;
  const capex = Math.abs(cf.capex);
  const ratio = cf.da ? capex / cf.da : 0;
  return `${cf.label}: capex ${eur(capex)} vs. D&A ${eur(cf.da)} (${p1(
    ratio
  )}x) — iznad 1.0x sugeriše ulaganje u rast, ispod 1.0x podinvestiranost.`;
}

function liveReturns(c: StatementCase): string | null {
  const ps = actuals(c);
  if (ps.length < 2) return null;
  const first = analysePeriod(ps[0]);
  const last = analysePeriod(ps[ps.length - 1]);
  const capital = (a: ReturnType<typeof analysePeriod>) => a.totalEquity + a.netDebt;
  const roic = (a: ReturnType<typeof analysePeriod>) =>
    capital(a) ? (a.ebit / capital(a)) * 100 : 0;
  return `ROE ${p1(first.roe)}% → ${p1(last.roe)}%, grubi ROIC (EBIT / (kapital + neto dug)) ${p1(
    roic(first)
  )}% → ${p1(roic(last))}% (${first.label} → ${last.label}).`;
}

function liveConcentration(c: StatementCase): string | null {
  const last = actuals(c).at(-1);
  const segs = last?.segments || [];
  if (!segs.length) return null;
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const top = [...segs].sort((a, b) => b.value - a.value)[0];
  return `Najveći segment: ${top.name} = ${p1(
    (top.value / total) * 100
  )}% prihoda. Koncentracija kupaca se ovde ne vidi — to je pitanje za menadžment.`;
}

/* ------------------------------ Pitanja --------------------------------- */

export const DIAGNOSTIC_DRILL: DrillQuestion[] = [
  {
    id: "margin-bridge",
    question:
      "Kompanija ima rast prihoda od 18%, a bruto marža pada sa 34% na 29%. Šta se najverovatnije desilo i kako bi to potvrdio iz izveštaja?",
    tests:
      "Da li povezuješ P&L linije umesto da ih čitaš izolovano — rast kupljen popustom nije isto što i rast tražnje.",
    checkpoints: [
      { label: "Cena vs. volumen", keywords: ["cena", "cene", "volumen", "kolicin", "price", "volume", "popust", "diskont", "discount"] },
      { label: "Mix proizvoda / kupaca", keywords: ["mix", "miks", "struktur", "asortiman", "segment", "kanal"] },
      { label: "Ulazni troškovi / COGS", keywords: ["cogs", "input", "ulazn", "sirovin", "nabavn", "trosk", "energ", "kurs"] },
      { label: "Provera u izveštajima", keywords: ["segment", "napomen", "notes", "bilesk", "prihod po", "mos", "bridge", "razgovor", "menadzment"] },
    ],
    model: [
      "Tri kandidata: (1) rast je kupljen cenom — popusti, agresivan pricing radi volumena; (2) mix se pomerio ka proizvodima/kanalima niže marže; (3) ulazni troškovi (sirovine, energija, kurs, plate u COGS) rasli su brže od prodajne cene.",
      "Razlikuješ ih tako što razložiš prihod: ako količine rastu ~18% a cena je ravna → pritisak na trošak. Ako je cena pala a količine skočile → kupljen rast.",
      "Potvrda: segmentna napomena (koji segment nosi rast), COGS po komponentama, zalihe (rast zaliha uz pad marže = problem tražnje), i napomene o nabavnim ugovorima.",
      "Za EY / PE: pitanje je da li je pad marže privremen (jednokratni šok inputa) ili strukturni (izgubljena pricing power). To menja ceo forward model.",
    ],
    trap:
      "Reći samo „troškovi su porasli“ bez razlaganja na cenu vs. volumen vs. mix — to je opis, ne analiza.",
    live: liveMargins,
  },
  {
    id: "ni-vs-ocf",
    question:
      "Neto dobit je 5m EUR, a operativni cash flow je −2m EUR. Nabroj tri konkretna razloga i gde tačno u izveštajima ih tražiš.",
    tests: "Most dobit → keš. Ovo je pitanje koje najbrže odvaja one koji čitaju samo P&L.",
    checkpoints: [
      { label: "Rast obrtnog kapitala", keywords: ["obrtn", "working capital", "wc", "potrazivan", "receivab", "zalih", "inventor", "dobavljac", "payab"] },
      // Namerno bez "amortizacija" — to je zamka ispod, ne tačan odgovor.
      { label: "Nenovčane stavke / kapitalizacija", keywords: ["kapitaliz", "capitaliz", "nenovcan", "non-cash", "otpis", "impairment", "rezervis", "revaloriz"] },
      { label: "Kvalitet priznavanja prihoda", keywords: ["priznavan", "recognition", "fakturis", "naplat", "avans", "ugovorn", "percentage of completion"] },
      { label: "Gde se traži", keywords: ["cash flow", "tok gotovin", "napomen", "notes", "bilesk", "indirektn", "usaglas"] },
    ],
    model: [
      "Rast obrtnog kapitala: potraživanja i/ili zalihe rastu brže od prihoda, ili su dobavljači skraćeni. Vidi se u indirektnom cash flow-u, red po red.",
      "Kapitalizacija troškova: razvoj, softver, kamate — trošak koji je izašao iz P&L-a i seo u aktivu. Traži se u kretanju nematerijalnih ulaganja i u napomenama o kapitalizaciji.",
      "Kvalitet prihoda: priznat prihod koji još nije naplaćen (ili nikad neće biti) — fakturisano unapred, dugi ugovori, percentage-of-completion. Uporedi rast prihoda sa rastom potraživanja.",
      "Dodatno: jednokratni prilivi u dobiti (prodaja imovine, revalorizacija) koji su nenovčani ili sedе u investicionom, ne operativnom toku.",
      "Provera u jednoj liniji: kumulativni OCF vs. kumulativna neto dobit kroz 3–5 godina. Ako se trajno razilaze, dobit nije keš.",
    ],
    trap:
      "Odgovoriti „zbog amortizacije“ — amortizacija ide u *plus* u operativnom toku i čini razliku manjom, ne većom.",
    live: liveCashGap,
  },
  {
    id: "adjusted-ebitda",
    question:
      "Kompanija prijavljuje Adjusted EBITDA od 12m, dok je reportovana EBITDA 8m. Koja pitanja postavljaš menadžmentu?",
    tests:
      "Skepsa prema add-back-ovima. U due diligence-u se ovde nalazi najviše razlike između tražene i plaćene cene.",
    checkpoints: [
      { label: "Lista add-back-ova stavku po stavku", keywords: ["add-back", "add back", "addback", "stavk", "lista", "bridge", "most", "razlik"] },
      { label: "Da li su stvarno jednokratni", keywords: ["jednokratn", "one-off", "one off", "nonrecurring", "ponavlj", "recurring", "svake godine"] },
      { label: "Normalizacija vlasničkih troškova", keywords: ["vlasnik", "owner", "normaliz", "plata direktor", "related", "povezan", "trzisn", "trzisn"] },
      { label: "Ko je definisao i da li je revidirano", keywords: ["revizor", "audit", "ko je", "definis", "menadzment", "qoe", "quality of earnings"] },
    ],
    model: [
      "Traži bridge: 8 → 12 stavku po stavku, sa iznosom i obrazloženjem za svaku.",
      "Za svaku stavku: da li se pojavljivala i prethodnih godina? „Jednokratni“ trošak koji se ponavlja tri godine zaredom je operativni trošak.",
      "Normalizacija u drugom smeru: plata vlasnika ispod tržišne, neplaćena kirija za objekat u vlasništvu vlasnika, transakcije sa povezanim licima — to su *negativni* add-back-ovi koje prodavac retko sam pomene.",
      "Ko je izračunao: menadžment ili nezavisni QoE (quality of earnings)? Adjusted EBITDA nije IFRS kategorija — nema je ko revidirati.",
      "Praktično: multiplikator se primenjuje na EBITDA. Razlika od 4m pri 8x je 32m EUR cene. Zato se ova pitanja postavljaju pre nego što se dogovori multiplikator.",
    ],
    trap: "Prihvatiti Adjusted EBITDA kao polaznu tačku za valuaciju bez da si video bridge.",
    live: liveEbitda,
  },
  {
    id: "dso-jump",
    question:
      "DSO je porastao sa 45 na 78 dana u jednoj godini. Kako razlikuješ problem naplate od problema priznavanja prihoda?",
    tests: "Working capital dijagnostika i osećaj za channel stuffing.",
    checkpoints: [
      { label: "Starosna struktura potraživanja (ageing)", keywords: ["ageing", "aging", "starosn", "dospel", "rocnost", "struktur potrazivan"] },
      { label: "Rezervisanja / ispravke vrednosti", keywords: ["rezervis", "ispravk", "provision", "otpis", "bad debt", "sumnjiv"] },
      { label: "Koncentracija i timing prodaje", keywords: ["koncentrac", "kupac", "kupci", "customer", "q4", "kvartal", "kraj godine", "channel stuffing", "stuffing"] },
      { label: "Povrati / kreditne note", keywords: ["povrat", "return", "kreditn nota", "rabat", "storn"] },
    ],
    model: [
      "Ageing potraživanja je prva stanica: ako je rast koncentrisan u kašnjenju preko 90 dana kod postojećih kupaca → problem naplate. Ako su potraživanja „mlada“ ali ogromna → prihod je priznat kasno u godini.",
      "Pogledaj sezonalnost prodaje: skok prihoda u poslednjem kvartalu uz skok DSO-a je klasičan potpis guranja robe u kanal (channel stuffing).",
      "Prati šta se desilo *posle* datuma bilansa: naplata u prvom kvartalu naredne godine, povrati robe, kreditne note. Povrati nakon bilansa = prihod nije bio stvaran.",
      "Uporedi ispravke vrednosti: ako potraživanja rastu 70% a rezervisanja stoje, menadžment ili ne vidi problem ili ga ne želi videti.",
      "Kvantifikuj: 33 dana × dnevni prihod = koliko keša je zaglavljeno. To je direktan odbitak od cene u net-debt / working-capital adjustment.",
    ],
    trap: "Tretirati rast DSO-a kao računovodstveni detalj — to je keš koji je izašao iz firme.",
    live: liveWorkingCapital,
  },
  {
    id: "goodwill-heavy",
    question:
      "Pogledaš bilans stanja: 40% aktive je goodwill i nematerijalna ulaganja. Šta to menja u tvojoj analizi i u valuaciji?",
    tests: "Razumevanje akvizitivne istorije, rizika impairmenta i zašto P/B ovde ne znači ništa.",
    checkpoints: [
      { label: "Akvizitivna istorija", keywords: ["akvizic", "acquisit", "m&a", "preuzim", "kupovin firm", "roll-up", "rollup"] },
      { label: "Rizik od impairmenta", keywords: ["impairment", "obezvred", "otpis", "test", "cgu"] },
      { label: "Opipljiva knjigovodstvena vrednost", keywords: ["tangible", "opipljiv", "materijaln", "book value", "knjigovodstven", "p/b", "kolateral"] },
      { label: "Organski vs. kupljeni rast", keywords: ["organsk", "organic", "kupljen rast", "like-for-like", "lfl", "same-store"] },
    ],
    model: [
      "Goodwill znači da je neko plaćao preko fer vrednosti neto imovine — prvo pitanje je koliko je plaćeno, za šta, i da li se to isplatilo (uporedi EBITDA pre i posle akvizicija).",
      "Rast mora da se razloži na organski i akvizitivni. Roll-up koji raste samo kupovinom prestaje da raste čim stane kapital.",
      "Impairment rizik: goodwill se ne amortizuje, testira se. Otpis ne dira keš, ali obara kapital — a kapital ulazi u kovenante (net debt / equity, gearing). Otpis može da obori kovenant.",
      "Za kreditnu analizu: goodwill nije kolateral. Gledaj opipljivi kapital (equity − nematerijalna) i realno pokriće duga.",
      "P/B i ROE su ovde skoro beskorisni — imenitelj je knjigovodstvena fikcija. Idi na EV/EBITDA, ROIC i konverziju keša.",
    ],
    trap:
      "Zaključiti „kompanija ima jaku aktivu od 40% u nematerijalnom“ — goodwill ne generiše keš sam po sebi i ne može da se proda.",
    live: liveIntangibles,
  },
  {
    id: "leverage-context",
    question:
      "Kompanija A ima neto dug/EBITDA 3.5x, kompanija B 1.2x. Zašto A može biti bezbednija investicija?",
    tests: "Da li gledaš leverage u kontekstu ili kao apsolutni broj.",
    checkpoints: [
      { label: "Stabilnost i predvidivost keš flow-a", keywords: ["stabiln", "predvidiv", "ciklic", "cyclical", "ugovor", "pretplat", "recurring", "contracted"] },
      { label: "Capex intenzitet i konverzija u keš", keywords: ["capex", "konverzij", "fcf", "slobodan tok", "free cash", "asset-light", "asset light"] },
      { label: "Struktura duga — dospeća, kamata, kovenanti", keywords: ["dospec", "maturity", "rocnost", "kovenant", "covenant", "fiksn kamat", "kamatn", "refinans", "pokric"] },
      { label: "Operativni leverage / struktura troškova", keywords: ["operativn leverage", "fiksn trosk", "varijabiln", "break-even", "prelomn"] },
    ],
    model: [
      "3.5x na ugovorenom, pretplatničkom, necikličnom keš flow-u je bezbednije od 1.2x na cikličnoj industriji gde EBITDA može da prepolovi u jednoj godini — jer se leverage meri protiv budućeg keša, ne prošlog.",
      "Konverzija u keš: A sa 90% EBITDA→FCF konverzije servisira dug lakše nego B koje ceo EBITDA vraća u capex.",
      "Struktura duga: dospeća raspoređena kroz 7 godina, fiksna kamata, širok headroom na kovenantima — vs. ceo dug koji dospeva sledeće godine uz varijabilnu kamatu.",
      "Pokrivenost kamate (EBITDA/kamata i EBIT/kamata) često govori više od neto dug/EBITDA — leverage bez cene duga je pola informacije.",
      "Operativni leverage: visoki fiksni troškovi znače da pad prihoda od 10% obara EBITDA za 30% — i 1.2x brzo postane 3x.",
    ],
    trap: "Rangirati kompanije po jednom raciu bez pitanja koliko je taj imenitelj (EBITDA) stabilan.",
    live: liveLeverage,
  },
  {
    id: "maintenance-capex",
    question:
      "Kako iz tri izveštaja proceniš koliko je capex-a maintenance, a koliko growth, kada ti to kompanija ne kaže?",
    tests: "Praktična veština — bez ove procene nema upotrebljivog FCF-a ni DCF-a.",
    checkpoints: [
      { label: "D&A kao donja granica maintenance-a", keywords: ["d&a", "amortiz", "depreciation", "proxy", "aproks", "donja granic"] },
      { label: "Capex / prihod kroz vreme", keywords: ["capex", "prihod", "% prihoda", "kroz vreme", "istorij", "prosek", "trend"] },
      { label: "Poređenje sa konkurencijom", keywords: ["konkurenc", "peer", "uporedn", "benchmark", "industrij"] },
      { label: "Rast kapaciteta vs. rast prihoda", keywords: ["kapacitet", "capacity", "ppe", "nekretnin", "osnovn sredstv", "nova fabrik", "lokacij", "otvaran"] },
    ],
    model: [
      "Polazna tačka: D&A je gruba donja granica maintenance capex-a — meri trošenje postojeće imovine, ali po istorijskim, ne sadašnjim cenama (u inflaciji potcenjuje).",
      "Gledaj capex/prihod kroz 5 godina: nivo u „mirnim“ godinama bez ekspanzije je maintenance; svaki šiljak iznad toga je growth.",
      "Uporedi rast bruto PPE sa rastom kapaciteta i prihoda. Ako PPE raste 40% a prihod 5% — plaća se kapacitet koji još ne radi.",
      "Fizički signali iz napomena i izveštaja menadžmenta: nove lokacije, nova fabrika, ulazak na tržište, IT transformacija — sve to je growth capex.",
      "Peer benchmark: ako industrija troši 4% prihoda na capex a ova firma 2%, ili je asset-light ili podinvestira. Podinvestiranje je odloženi trošak koji kupac nasleđuje.",
      "Zašto je važno: FCF = EBITDA − maintenance capex − porez − Δ WC. Ako sav capex tretiraš kao maintenance, potcenjuješ vrednost rastuće firme; ako ništa — precenjuješ je.",
    ],
    trap: "Uzeti ceo capex kao maintenance jer je „konzervativno“ — konzervativno nije isto što i tačno.",
    live: liveCapex,
  },
  {
    id: "roic-decline",
    question:
      "Prihodi rastu, marže su stabilne, ali ROIC pada tri godine zaredom. Šta se dešava?",
    tests: "Da li razumeš da rast nije isto što i stvaranje vrednosti.",
    checkpoints: [
      { label: "Kapital raste brže od profita", keywords: ["kapital", "capital", "imenitelj", "invested", "ulozen", "brze od"] },
      { label: "Skupe akvizicije / goodwill", keywords: ["akvizic", "acquisit", "goodwill", "preplac", "previsok cen", "multipl"] },
      { label: "Obrtni kapital i capex koji gutaju keš", keywords: ["obrtn", "working capital", "zalih", "potrazivan", "capex", "ppe"] },
      { label: "ROIC vs. WACC — uništavanje vrednosti", keywords: ["wacc", "trosak kapitala", "cost of capital", "vrednost", "value", "unistava", "prinos ispod"] },
    ],
    model: [
      "Marže su stabilne, dakle problem nije u P&L-u — imenitelj raste. Uloženi kapital raste brže od operativne dobiti.",
      "Najčešći uzroci: akvizicije po multiplikatoru iznad prinosa koji donose (goodwill nabuja, EBIT ne prati), rast obrtnog kapitala uz rast prihoda, i capex koji još nije počeo da nosi prihod.",
      "Ključni test: ROIC vs. WACC. Rast uz ROIC ispod WACC-a *uništava* vrednost — što više rasteš, to gore. To je razlog zbog kog PE fond može da odbije kompaniju koja raste 20%.",
      "Razloži: da li pad dolazi od NOPAT-a ili od kapitala? I da li je kapital u radu ili u izgradnji (assets under construction se ne isključe iz imenitelja, a još ne zarađuju).",
      "Kod investicija u toku daj menadžmentu fer tretman — izračunaj ROIC i bez njih, pa uporedi. Ako i tada pada, priča o „investicionom ciklusu“ ne stoji.",
    ],
    trap: "Zaključiti da je sve u redu jer rast i marže izgledaju dobro — ROIC je jedini od ta tri koji meri da li se rast isplati.",
    live: liveReturns,
  },
  {
    id: "first-five",
    question:
      "Imaš dve godine finansijskih izveštaja i 15 minuta. Kojih pet brojeva gledaš prvo i zašto baš tih pet?",
    tests:
      "Prioritizacija i mentalni okvir. Nema jednog tačnog odgovora — ali odgovor bez obrazloženja je loš odgovor.",
    checkpoints: [
      { label: "Rast prihoda", keywords: ["prihod", "revenue", "rast", "growth", "cagr"] },
      { label: "EBITDA / marža i njen trend", keywords: ["ebitda", "marza", "margin", "profitabiln"] },
      { label: "Konverzija u keš (OCF / FCF)", keywords: ["cash", "keš", "kes", "ocf", "fcf", "konverzij", "tok gotovin", "operativn tok"] },
      { label: "Leverage / neto dug", keywords: ["neto dug", "net debt", "leverage", "zaduzen", "dug/ebitda"] },
      { label: "Obrtni kapital / dani", keywords: ["obrtn", "working capital", "dso", "dio", "dpo", "ciklus", "dana"] },
      { label: "Obrazloženje izbora", keywords: ["zato", "jer", "razlog", "prvo", "brzo", "trijaz", "screening"] },
    ],
    model: [
      "Odbranjiv set: (1) rast prihoda, (2) EBITDA marža i njen smer, (3) operativni cash flow prema EBITDA (konverzija), (4) neto dug / EBITDA, (5) obrtni kapital u danima.",
      "Logika: prva dva kažu da li posao raste i da li raste profitabilno; treći kaže da li je taj profit stvaran; četvrti kaže ko zapravo drži vrednost — vlasnik ili banka; peti kaže gde keš nestaje.",
      "Iz ta tri izveštaja pokriveni su svi — P&L (1,2), cash flow (3,5), bilans stanja (4,5). Ako tvojih pet brojeva dolazi samo iz P&L-a, čitaš jednu trećinu kompanije.",
      "U 15 minuta ovo je trijaža, ne analiza: cilj je da odlučiš da li vredi trošiti sledeća tri sata, i da formulišeš tri pitanja za menadžment.",
    ],
    trap:
      "Nabrojati pet brojeva iz istog izveštaja, ili navesti neto dobit kao glavnu metriku — ona je najlakša za podešavanje.",
  },
  {
    id: "what-you-dont-see",
    question: "Šta u ovim izveštajima ne vidiš, a moglo bi da obori tezu?",
    tests:
      "Najvažnija veština — svest o granicama podataka. Ovo pitanje razdvaja analitičara od kalkulatora.",
    checkpoints: [
      { label: "Koncentracija kupaca / dobavljača", keywords: ["koncentrac", "kupac", "kupci", "customer", "dobavljac", "supplier", "zavisnost"] },
      { label: "Vanbilansne obaveze i garancije", keywords: ["vanbilans", "off-balance", "off balance", "garancij", "jemstv", "lizing", "obavez po ugovor"] },
      { label: "Sporovi, regulativa, poreski rizici", keywords: ["spor", "tuzb", "sudsk", "litigation", "regulat", "porez", "inspekcij"] },
      { label: "Ugovori koji ističu / cenovna moć", keywords: ["ugovor", "istic", "obnov", "renewal", "cenovn moc", "pricing power", "churn", "zadrzavan"] },
      { label: "Sezonalnost skrivena godišnjim podacima", keywords: ["sezonal", "seasonal", "mesecn", "kvartaln", "intra-year", "unutar godin", "peak"] },
      { label: "Ljudi i povezana lica", keywords: ["kljucn ljud", "key man", "menadzment", "povezan lic", "related party", "vlasnik"] },
    ],
    model: [
      "Koncentracija: 3 kupca = 60% prihoda ne vidi se nigde u brojevima, a gubitak jednog obara tezu. Isto za dobavljače i za jedno tržište.",
      "Vanbilansno: operativne garancije, jemstva povezanim licima, ugovorene obaveze nabavke, lizinzi izvan IFRS 16 obuhvata.",
      "Pravno i poresko: sporovi u toku, poreske kontrole, regulatorne promene koje menjaju ekonomiju posla (naročito u regulisanim delatnostima).",
      "Ugovori i cenovna moć: kada ističu ključni ugovori, po kojim uslovima se obnavljaju, kakav je churn. Godišnji izveštaj pokazuje rezultat, ne trajnost.",
      "Sezonalnost i intra-year likvidnost: godišnji podaci kriju da je firma tri meseca godišnje na ivici obrtnih sredstava. Zato se gleda mesečni obrtni kapital, ne samo 31.12.",
      "Ljudi: da li posao zavisi od vlasnika koji izlazi transakcijom. Transakcije sa povezanim licima koje nestaju posle zatvaranja.",
      "Kako se rešava: management Q&A, data room, komercijalni DD, obilazak lokacije. Finansijski izveštaji su početak liste pitanja, ne odgovor.",
    ],
    trap:
      "Odgovoriti da su izveštaji revidirani pa je sve pokriveno — revizija potvrđuje da su brojevi u skladu sa standardima, ne da je posao održiv.",
    live: liveConcentration,
  },
];

/* ------------------------------ Grading --------------------------------- */

export interface DrillGrade {
  hit: string[];
  missed: string[];
  coverage: number; // 0–100
  status: "strong" | "partial" | "thin" | "empty";
  message: string;
}

/** Mala slova + skinuti dijakritici, da „marža“ i „marza“ oboje prolaze. */
export function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[šś]/g, "s")
    .replace(/[čćĉ]/g, "c")
    .replace(/ž/g, "z")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function gradeDrill(q: DrillQuestion, answerRaw: string): DrillGrade {
  const answer = normalize(answerRaw).trim();
  if (answer.length < 15)
    return {
      hit: [],
      missed: q.checkpoints.map((c) => c.label),
      coverage: 0,
      status: "empty",
      message: "Napiši odgovor (bar nekoliko rečenica) pa ga onda proveri.",
    };

  const hit: string[] = [];
  const missed: string[] = [];
  for (const cp of q.checkpoints) {
    (cp.keywords.some((k) => answer.includes(normalize(k))) ? hit : missed).push(cp.label);
  }
  const coverage = Math.round((hit.length / q.checkpoints.length) * 100);
  const status = coverage >= 70 ? "strong" : coverage >= 40 ? "partial" : "thin";
  const message =
    status === "strong"
      ? "Pokrio si većinu onoga što se traži — uporedi nijanse sa model odgovorom."
      : status === "partial"
      ? "Solidna osnova, ali ti nedostaje deo uglova ispod."
      : "Odgovor je preuzak — pogledaj šta si preskočio, pa pokušaj ponovo bez gledanja u model.";
  return { hit, missed, coverage, status, message };
}

/** Ukupno pokrivanje kroz svih deset pitanja (samo odgovorena se broje). */
export function drillSummary(answers: Record<string, string>) {
  const graded = DIAGNOSTIC_DRILL.map((q) => ({
    q,
    g: gradeDrill(q, answers[drillKey(q.id)] || ""),
  })).filter((x) => x.g.status !== "empty");
  const answered = graded.length;
  const avg = answered
    ? Math.round(graded.reduce((s, x) => s + x.g.coverage, 0) / answered)
    : 0;
  return { answered, total: DIAGNOSTIC_DRILL.length, avg };
}

/** Odgovori se čuvaju u istom `answers` mapu kao i EY kviz, uz prefiks. */
export function drillKey(id: string): string {
  return `drill:${id}`;
}

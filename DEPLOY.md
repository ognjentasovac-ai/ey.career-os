# Kako da postaviš Career OS online (besplatno, neograničeno)

Cilj: aplikacija dostupna sa **bilo kog uređaja** (laptop, telefon, drugi kompjuter),
sa **sinhronizovanim podacima** i **neograničenim pristupom**. Sve na besplatnim planovima.

Koristimo **Vercel** (hosting za Next.js) + **Vercel KV / Upstash Redis** (baza za sync).
Vercel Hobby plan i Upstash free tier su besplatni i sasvim dovoljni za ličnu upotrebu.

---

## Korak 0 — Napravi naloge (jednom)

1. **GitHub** nalog: https://github.com/signup (besplatno).
2. **Vercel** nalog: https://vercel.com/signup → klikni **„Continue with GitHub"**.

---

## Korak 1 — Postavi kod na GitHub

Otvori terminal (PowerShell) u folderu `career-os` i pokreni:

```powershell
git init
git add .
git commit -m "Career OS"
```

Zatim na GitHub-u napravi novi prazan repozitorijum (dugme **New repository**, npr. ime `career-os`,
ostavi ga **Private**). GitHub će ti pokazati komande — iskopiraj „push an existing repository":

```powershell
git remote add origin https://github.com/TVOJ-USERNAME/career-os.git
git branch -M main
git push -u origin main
```

> Ako te traži lozinku pri `push`, koristi GitHub **Personal Access Token** umesto lozinke
> (Settings → Developer settings → Personal access tokens → Generate).

---

## Korak 2 — Deploy na Vercel

1. Idi na https://vercel.com/new
2. Izaberi svoj `career-os` repozitorijum → **Import**.
3. Ne diraj podešavanja (Vercel sam prepozna Next.js) → klikni **Deploy**.
4. Za ~1 minut dobićeš link tipa `https://career-os-xxxx.vercel.app`. Aplikacija već radi
   (za sada bez sinhronizacije između uređaja — to dodajemo u sledećem koraku).

---

## Korak 3 — Dodaj bazu za sinhronizaciju (KV / Redis)

1. U Vercel-u otvori svoj projekat → tab **Storage** → **Create Database**.
2. Izaberi **Upstash for Redis** (ili **KV**) → **Continue** → izaberi region blizu (Frankfurt) → **Create**.
3. Klikni **Connect to Project** → izaberi `career-os` → **Connect**.
   - Ovo automatski dodaje `KV_REST_API_URL` i `KV_REST_API_TOKEN` u tvoj projekat.
4. Idi na tab **Deployments** → kod poslednjeg deploya klikni **⋯ → Redeploy** (da pokupi nove varijable).

Gotovo — sada se podaci čuvaju u oblaku. Otvoriš isti link na telefonu i laptopu i **vidiš/edituješ
iste podatke**. U gornjem desnom uglu vidiš indikator **„Synced"**.

---

## Korak 4 (opciono) — Zaštita lozinkom

Pošto su podaci lični, preporučujem da staviš lozinku:

1. Vercel projekat → **Settings** → **Environment Variables**.
2. Dodaj: ime `ACCESS_PASSWORD`, vrednost = lozinka po izboru → **Save**.
3. **Redeploy** (kao u koraku 3.4).

Sada te aplikacija pri otvaranju traži tu lozinku jednom po uređaju. Ostaješ ulogovan neograničeno.
Ako ikad zaboraviš, samo promeni/obriši varijablu na Vercel-u.

---

## Ažuriranje aplikacije kasnije

Kad god promeniš kod lokalno:

```powershell
git add .
git commit -m "izmena"
git push
```

Vercel automatski napravi novi deploy. Tvoji podaci u bazi ostaju netaknuti.

---

## Često pitanje

**Da li mogu bez baze?** Da — aplikacija radi i bez Koraka 3, ali tada se podaci čuvaju samo
lokalno u tom pretraživaču (nema sinhronizacije između uređaja). Za pristup sa više uređaja
ti treba Korak 3. Uvek možeš i ručno da napraviš backup preko dugmeta **Export** u aplikaciji.

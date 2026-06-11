# Career OS — Ognjen Tasovac · 2026–2041

A personal **Career Operating System**: an internal-tool-style dashboard for managing the path
from **EY Transaction & Corporate Finance Junior** (Sep 2026) to **Partner in a CEE Private Equity fund**.

Built with **Next.js 14 · React · TypeScript · Tailwind CSS · shadcn-style UI · Recharts**.
Data persists in the browser (**Local Storage**) and, when deployed with a database, **syncs across
all your devices** via a cloud API. Dark, minimalist, terminal-grade aesthetic with a Space Grotesk
display font.

## Modules

1. **Executive Dashboard** — KPI cards, capability radar, Partner Readiness / Probability rings, next-milestone tracker.
2. **Career Timeline** — horizontal 2026→2041 rail; fully editable positions (add / edit / delete, durations, requirements, comp).
3. **3-Statement Reading Lab** — daily drill: enter a business's P&L, balance sheet and seasonality; the lab computes margins, the EBITDA bridge, working-capital days and a forward projection, then runs an **EY-style quiz** (buy or not, revenue sources, EBITDA quality, valuation) and asks you to guess the sector.
4. **Modeling Academy** — curated, mostly-free training (ASimpleModel, Damodaran, CFI, Wall Street Prep, BIWS…) with progress tracking.
5. **Skill Tree** — 19 finance skills across 5 categories, 0–100 levels with targets, notes and live sliders.
6. **Deal Experience Tracker** — M&A, LBO, DD, memos, models, research; filters and aggregate statistics.
7. **Network CRM** — contacts by category, relationship strength, follow-up tracking, Network Strength score.
8. **Education & Certifications** — CFA L1–L3, Wall Street Prep, LBO masterclass, MBA; progress and deadlines.
9. **Compensation Roadmap** — base / bonus / carry / co-investment build, **calibrated to the Serbian / CEE market** (EY junior starts at ~€750/month), editable assumptions, stacked chart.
10. **Partner Probability Engine** — weighted logistic model with per-factor contribution analysis.
11. **Scenario Analysis** — Conservative / Base / Aggressive / Exceptional; one click re-prices the whole app.
12. **Annual Career Review** — auto-generated achievements, gaps, wins, weaknesses and next-year recommendations.

Plus: data **export / import / reset** (JSON backup) from the sidebar, and a **cloud sync indicator** in the header.

## Put it online (cross-device, unlimited)

See **[DEPLOY.md](DEPLOY.md)** for a step-by-step guide (in Serbian): GitHub → Vercel → Vercel KV,
all on free tiers, with optional password protection.

## Run locally

```bash
cd career-os
npm install
npm run dev
```

Then open **http://localhost:3000**.

## Build for production

```bash
npm run build
npm start
```

## Notes

- All data lives in `localStorage` under the key `career-os:v1`. Use the sidebar **Export** button to back it up.
- The initial dataset is a realistic CEE PE roadmap calibrated for Ognjen. Edit anything — it persists automatically.
- Compensation figures are EUR, scaled live by the active scenario multiplier.

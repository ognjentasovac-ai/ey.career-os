import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Latest price from Yahoo Finance chart API (free, no key). */
export async function GET(req: Request) {
  const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json({ ok: false, error: "Missing ?ticker" }, { status: 400 });
  }
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 (Career-OS)" } }
    );
    if (!res.ok) throw new Error(`Quote source ${res.status}`);
    const json = (await res.json()) as any;
    const meta = json?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (!isFinite(price) || price <= 0) {
      return NextResponse.json({ ok: false, error: "No price available" }, { status: 404 });
    }
    const date = meta?.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10)
      : "";
    return NextResponse.json({
      ok: true,
      ticker,
      price,
      currency: meta?.currency || "USD",
      date,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Quote failed" },
      { status: 502 }
    );
  }
}

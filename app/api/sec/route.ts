import { NextResponse } from "next/server";
import { fetchSecStatements } from "@/lib/sec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing ?q (ticker or CIK)" }, { status: 400 });
  }
  try {
    const result = await fetchSecStatements(q);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "SEC fetch failed" },
      { status: 502 }
    );
  }
}

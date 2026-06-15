import { NextResponse } from "next/server";
import { readState, writeState, remoteConfigured } from "@/lib/server-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Optional shared password. If ACCESS_PASSWORD is unset, the API is open. */
function authOk(req: Request): boolean {
  const required = process.env.ACCESS_PASSWORD;
  if (!required) return true;
  const provided =
    req.headers.get("x-access-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";
  return provided === required;
}

export async function GET(req: Request) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const data = await readState();
    return NextResponse.json({ data, remote: remoteConfigured() });
  } catch (e) {
    return NextResponse.json(
      { error: "read_failed", message: String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  if (!authOk(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    await writeState(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "write_failed", message: String(e) },
      { status: 500 }
    );
  }
}

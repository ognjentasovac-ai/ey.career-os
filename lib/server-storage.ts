import { promises as fs } from "fs";
import path from "path";

const STATE_KEY = "career-os:state";
const LOCAL_FILE = path.join(process.cwd(), ".data", "state.json");

interface KvConfig {
  url: string;
  token: string;
}

/** Vercel KV / Upstash Redis REST config from env, if present. */
function kvConfig(): KvConfig | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  if (url && token) return { url: url.replace(/\/$/, ""), token };
  return null;
}

export function remoteConfigured(): boolean {
  return kvConfig() !== null;
}

export async function readState(): Promise<unknown | null> {
  const cfg = kvConfig();
  if (cfg) {
    const res = await fetch(`${cfg.url}/get/${STATE_KEY}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    if (!json.result) return null;
    try {
      return JSON.parse(json.result);
    } catch {
      return null;
    }
  }

  // Local file fallback (works in `next dev` and on a persistent Node host).
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeState(state: unknown): Promise<void> {
  const cfg = kvConfig();
  const payload = JSON.stringify(state);

  if (cfg) {
    const res = await fetch(`${cfg.url}/set/${STATE_KEY}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "text/plain",
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`KV write failed: ${res.status}`);
    }
    return;
  }

  // Local file fallback.
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, payload, "utf-8");
}

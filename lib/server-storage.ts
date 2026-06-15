const STATE_KEY = "career-os:state";
const LOCAL_FILE = ".data/state.json";

/**
 * Local filesystem fallback — only used in `next dev` / a persistent Node host.
 * Imported dynamically so the Node `fs` module is never bundled into the
 * Cloudflare/edge build (where KV is configured and this code never runs).
 */
async function localFs() {
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const file = path.join(process.cwd(), LOCAL_FILE);
  return { fs, path, file };
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

/**
 * Cloudflare Workers KV binding (when running on Cloudflare via OpenNext).
 * Dynamically resolved so `next dev` and the SEC route keep working locally,
 * where the OpenNext context is absent and we fall back to file / Upstash.
 */
async function cfKv(): Promise<KVNamespace | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const ns = (ctx?.env as Record<string, unknown> | undefined)?.CAREER_OS_KV;
    return (ns as KVNamespace) ?? null;
  } catch {
    return null;
  }
}

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
  const kv = await cfKv();
  if (kv) {
    const raw = await kv.get(STATE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

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
    const { fs, file } = await localFs();
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeState(state: unknown): Promise<void> {
  const payload = JSON.stringify(state);

  const kv = await cfKv();
  if (kv) {
    await kv.put(STATE_KEY, payload);
    return;
  }

  const cfg = kvConfig();
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
  const { fs, path, file } = await localFs();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, payload, "utf-8");
}

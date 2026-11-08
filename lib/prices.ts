import "server-only";
import { db } from "./supabase/admin";
import { itemKey } from "./week";

/**
 * Live store prices. Today: Kroger's public Products API (free developer account, US stores by ZIP).
 * The provider list is the place to plug future store partners in.
 */
export type LivePrice = { price_cents: number | null; size: string | null; product: string | null };
export type LiveProvider = { id: string; store: string; configured: () => boolean; prices: (names: string[], zip: string) => Promise<Record<string, LivePrice>> };

const DAY = 24 * 3600_000;

async function fromCache(provider: string, location: string, keys: string[]) {
  if (!keys.length) return new Map<string, LivePrice>();
  const { data } = await db()
    .from("price_cache")
    .select("item_key,price_cents,size,product,fetched_at")
    .eq("provider", provider)
    .eq("location", location)
    .in("item_key", keys);
  const m = new Map<string, LivePrice>();
  for (const r of (data ?? []) as { item_key: string; price_cents: number | null; size: string | null; product: string | null; fetched_at: string }[]) {
    if (Date.now() - new Date(r.fetched_at).getTime() < DAY) m.set(r.item_key, { price_cents: r.price_cents, size: r.size, product: r.product });
  }
  return m;
}

async function toCache(provider: string, location: string, key: string, v: LivePrice) {
  await db().from("price_cache").upsert({ provider, location, item_key: key, ...v, fetched_at: new Date().toISOString() } as never);
}

// ---------------- Kroger ----------------
let krogerToken: { value: string; exp: number } | null = null;

async function krogerAuth() {
  if (krogerToken && krogerToken.exp > Date.now() + 60_000) return krogerToken.value;
  const id = process.env.KROGER_CLIENT_ID!;
  const secret = process.env.KROGER_CLIENT_SECRET!;
  const res = await fetch("https://api.kroger.com/v1/connect/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
    body: "grant_type=client_credentials&scope=product.compact",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kroger auth ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  krogerToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return krogerToken.value;
}

async function krogerGet(path: string) {
  const token = await krogerAuth();
  const res = await fetch("https://api.kroger.com/v1" + path, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`Kroger ${path.split("?")[0]} ${res.status}`);
  return res.json();
}

async function krogerLocation(zip: string): Promise<string | null> {
  const hit = await fromCache("kroger", "zip:" + zip, ["__location__"]);
  const cached = hit.get("__location__");
  if (cached?.product) return cached.product;
  const j = (await krogerGet(`/locations?filter.zipCode.near=${zip}&filter.limit=1`)) as { data?: { locationId: string; name?: string }[] };
  const loc = j.data?.[0]?.locationId ?? null;
  if (loc) await toCache("kroger", "zip:" + zip, "__location__", { price_cents: null, size: j.data?.[0]?.name ?? null, product: loc });
  return loc;
}

const kroger: LiveProvider = {
  id: "kroger",
  store: "Kroger",
  configured: () => Boolean(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET),
  async prices(names, zip) {
    const loc = await krogerLocation(zip);
    if (!loc) return {};
    const keys = names.map(itemKey);
    const cached = await fromCache("kroger", loc, keys);
    const out: Record<string, LivePrice> = {};
    const todo: { name: string; key: string }[] = [];
    names.forEach((name, i) => {
      const c = cached.get(keys[i]);
      if (c) out[keys[i]] = c;
      else todo.push({ name, key: keys[i] });
    });
    // A few at a time, to stay polite with the API.
    for (let i = 0; i < todo.length; i += 5) {
      await Promise.all(
        todo.slice(i, i + 5).map(async ({ name, key }) => {
          try {
            const j = (await krogerGet(`/products?filter.term=${encodeURIComponent(name)}&filter.locationId=${loc}&filter.limit=5`)) as {
              data?: { description?: string; items?: { size?: string; price?: { regular?: number; promo?: number } }[] }[];
            };
            const best = (j.data ?? [])
              .flatMap((p) => (p.items ?? []).map((it) => ({ p, it, price: it.price?.promo || it.price?.regular || 0 })))
              .filter((x) => x.price > 0)
              .sort((a, b) => a.price - b.price)[0];
            const v: LivePrice = best
              ? { price_cents: Math.round(best.price * 100), size: best.it.size ?? null, product: best.p.description ?? null }
              : { price_cents: null, size: null, product: null };
            out[key] = v;
            await toCache("kroger", loc, key, v);
          } catch (e) {
            console.error("[prices] kroger", name, (e as Error).message);
          }
        })
      );
    }
    return out;
  },
};

export const LIVE_PROVIDERS: LiveProvider[] = [kroger];
export const liveProvider = () => LIVE_PROVIDERS.find((p) => p.configured()) ?? null;

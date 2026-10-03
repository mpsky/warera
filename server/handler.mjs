// Serverio pusės tarpininkas: API raktas niekada nepatenka į naršyklę.
// GET /api/<namespace.procedure>?input=<json>  ->  https://api2.warera.io/trpc/...
const BASE = "https://api2.warera.io/trpc";
const ALLOWED = new Set([
  "user.getUserLite", "user.getUserById", "inventory.fetchCurrentEquipment",
  "search.searchAnything", "gameConfig.getGameConfig", "itemTrading.getPrices",
  "country.getCountryById", "mu.getById", "transaction.getPaginatedTransactions",
]);
const GEAR = ["knife","gun","rifle","sniper","tank","jet",
  ...["helmet","chest","gloves","pants","boots"].flatMap((t) => [1,2,3,4,5,6].map((i) => t + i))];
const cache = new Map(); // key -> { exp, status, body }
const TTL = { "gameConfig.getGameConfig": 3600_000, "itemTrading.getPrices": 60_000 };

export function createApiMiddleware(apiKey) {
  return async (req, res) => {
    const url = new URL(req.url, "http://x");
    const proc = url.pathname.replace(/^\/+/, "");
    if (req.method === "GET" && proc === "_gearPrices") return gearPrices(res, apiKey);
    if (req.method !== "GET" || !ALLOWED.has(proc)) {
      res.statusCode = 404; return res.end(JSON.stringify({ error: "not allowed" }));
    }
    const input = url.searchParams.get("input") ?? "{}";
    if (input.length > 2000) { res.statusCode = 400; return res.end("{}"); }
    const key = proc + input;
    const hit = cache.get(key);
    if (hit && hit.exp > Date.now()) return send(res, hit.status, hit.body);
    try {
      const r = await fetch(`${BASE}/${proc}?input=${encodeURIComponent(input)}`, {
        headers: { Accept: "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) },
      });
      const body = await r.text();
      if (r.ok) cache.set(key, { exp: Date.now() + (TTL[proc] ?? 30_000), status: r.status, body });
      send(res, r.status, body);
    } catch (e) {
      send(res, 502, JSON.stringify({ error: "upstream unreachable" }));
    }
  };
}
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}

// Įrangos kainos = paskutinių itemMarket sandorių mediana pagal item kodą (viešas API neturi rinkos sąrašo).
async function gearPrices(res, apiKey) {
  const hit = cache.get("_gear");
  if (hit && hit.exp > Date.now()) return send(res, 200, hit.body);
  const out = {};
  const get = async (code) => {
    const input = JSON.stringify({ transactionType: "itemMarket", itemCode: code, limit: 20 });
    try {
      const r = await fetch(`${BASE}/transaction.getPaginatedTransactions?input=${encodeURIComponent(input)}`, {
        headers: { Accept: "application/json", ...(apiKey ? { "X-API-Key": apiKey } : {}) },
      });
      const j = await r.json();
      const p = (j?.result?.data?.items ?? []).filter((t) => t.money > 0).map((t) => t.money / (t.quantity || 1)).sort((a, b) => a - b);
      out[code] = p.length ? { price: p[Math.floor(p.length / 2)], n: p.length } : null;
    } catch { out[code] = null; }
  };
  const q = [...GEAR];
  await Promise.all(Array.from({ length: 8 }, async () => { for (let c; (c = q.shift()); ) await get(c); }));
  const body = JSON.stringify(out);
  cache.set("_gear", { exp: Date.now() + 600_000, body });
  send(res, 200, body);
}

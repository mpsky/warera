// Serverio pusės tarpininkas: API raktas niekada nepatenka į naršyklę.
// GET /api/<namespace.procedure>?input=<json>  ->  https://api2.warera.io/trpc/...
const BASE = "https://api2.warera.io/trpc";
const ALLOWED = new Set([
  "user.getUserLite", "user.getUserById", "inventory.fetchCurrentEquipment",
  "search.searchAnything", "gameConfig.getGameConfig", "itemTrading.getPrices",
  "country.getCountryById", "mu.getById",
]);
const cache = new Map(); // key -> { exp, status, body }
const TTL = { "gameConfig.getGameConfig": 3600_000, "itemTrading.getPrices": 60_000 };

export function createApiMiddleware(apiKey) {
  return async (req, res) => {
    const url = new URL(req.url, "http://x");
    const proc = url.pathname.replace(/^\/+/, "");
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

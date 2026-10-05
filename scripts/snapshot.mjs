// Surenka top žaidėjų buildus ir įrašo public/data/builds-*.json.  Paleidimas: NODE_USE_ENV_PROXY=1 npm run snapshot
import fs from "node:fs";

try { for (const l of fs.readFileSync(".env", "utf8").split("\n")) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch {}
const KEY = process.env.WARERA_API_KEY;
const BASE = "https://api2.warera.io/trpc";
const TOP = Number(process.env.TOP ?? 100);
const SKILLS = ["attack","criticalChance","criticalDamages","precision","armor","dodge","health","energy","hunger","production","entrepreneurship","companies","management","lootChance"];
const SLOTS = ["weapon","helmet","chest","gloves","pants","boots"];
// kategorija -> reitingas (grobis = atidarytos dėžės, nes dėžės krenta iš grobio tikimybės)
const CATEGORIES = {
  attack:  { ranking: "weeklyUserDamages", label: "Savaitės žala" },
  loot:    { ranking: "userCasesOpened",   label: "Atidarytos dėžės" },
  economy: { ranking: "userWealth",        label: "Turtas" },
};

let resetAt = 0, remaining = 100;
async function call(proc, input, tries = 5) {
  for (let i = 0; i < tries; i++) {
    if (remaining < 15 && resetAt > Date.now()) await new Promise((r) => setTimeout(r, resetAt - Date.now() + 200));
    const r = await fetch(`${BASE}/${proc}?input=${encodeURIComponent(JSON.stringify(input))}`, { headers: { Accept: "application/json", ...(KEY ? { "X-API-Key": KEY } : {}) } });
    remaining = Number(r.headers.get("ratelimit-remaining") ?? remaining);
    resetAt = Date.now() + Number(r.headers.get("ratelimit-reset") ?? 60) * 1000;
    if (r.status === 429) { await new Promise((x) => setTimeout(x, 5000 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`${proc} ${r.status}`);
    const j = await r.json(); return j.result.data;
  }
  throw new Error(`${proc}: rate limited`);
}
async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { for (let k; (k = i++) < items.length; ) out[k] = await fn(items[k]).catch((e) => (console.warn("skip", e.message), null)); }));
  return out;
}

const cache = new Map();
async function build(userId) {
  if (cache.has(userId)) return cache.get(userId);
  const [u, eq] = await Promise.all([call("user.getUserLite", { userId }), call("inventory.fetchCurrentEquipment", { userId }).catch(() => ({}))]);
  const b = {
    id: u._id, username: u.username, avatarUrl: u.avatarUrl, level: u.leveling.level, totalSkillPoints: u.leveling.totalSkillPoints,
    levels: Object.fromEntries(SKILLS.map((k) => [k, u.skills?.[k]?.level ?? 0])),
    totals: Object.fromEntries(SKILLS.map((k) => [k, u.skills?.[k]?.total ?? 0])),
    attackMult: (1 + (u.skills?.attack?.militaryRankPercent ?? 0) / 100) * (1 + ((u.skills?.attack?.buffsPercent ?? 0) - (u.skills?.attack?.debuffsPercent ?? 0)) / 100),
    gear: Object.fromEntries(SLOTS.map((s) => [s, eq[s] ? { code: eq[s].code, stats: eq[s].skills ?? {} } : null])),
    ammo: eq.ammo ?? null, militaryRank: u.militaryRank,
  };
  cache.set(userId, b); return b;
}

for (const [cat, { ranking, label }] of Object.entries(CATEGORIES)) {
  const rk = await call("ranking.getRanking", { rankingType: ranking });
  const top = rk.items.slice(0, TOP);
  const players = (await pool(top, 8, async (it) => ({ ...(await build(it.user)), rank: it.rank, value: it.value }))).filter(Boolean);
  fs.writeFileSync(`public/data/builds-${cat}.json`, JSON.stringify({ updatedAt: new Date().toISOString(), category: cat, ranking, label, players }));
  console.log(cat, players.length, "players");
}

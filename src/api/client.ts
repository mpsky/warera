import type { Equipment, GameConfig, UserLite } from "../lib/types";

async function call<T>(proc: string, input: unknown = {}): Promise<T> {
  const r = await fetch(`/api/${proc}?input=${encodeURIComponent(JSON.stringify(input))}`);
  if (!r.ok) throw new Error(`${proc}: HTTP ${r.status}`);
  const j = await r.json();
  // tRPC: {result:{data:...}} arba {result:{data:{json:...}}} (superjson)
  const d = j?.result?.data ?? j;
  return (d && typeof d === "object" && "json" in d && Object.keys(d).length <= 2 ? d.json : d) as T;
}

let cfg: Promise<GameConfig> | null = null;
export const getConfig = () => (cfg ??= call<GameConfig>("gameConfig.getGameConfig").catch((e) => { cfg = null; throw e; }));

export const getUserLite = (userId: string) => call<UserLite>("user.getUserLite", { userId });
export const getEquipment = (userId: string) =>
  call<Equipment>("inventory.fetchCurrentEquipment", { userId }).catch(() => ({} as Equipment));

const isId = (s: string) => /^[a-f0-9]{24}$/i.test(s);

/** Nick (arba 24 simbolių ID) -> žaidėjas. */
export async function findUser(query: string): Promise<UserLite> {
  const q = query.trim();
  if (!q) throw new Error("Įveskite žaidėjo nicką");
  if (isId(q)) return getUserLite(q);
  const res = await call<{ userIds: string[] }>("search.searchAnything", { searchText: q });
  if (!res.userIds?.length) throw new Error(`Žaidėjas „${q}“ nerastas`);
  const users = await Promise.all(res.userIds.slice(0, 5).map((id) => getUserLite(id).catch(() => null)));
  const ok = users.filter((u): u is UserLite => !!u);
  return ok.find((u) => u.username.toLowerCase() === q.toLowerCase()) ?? ok[0];
}

export const getCountryName = (countryId: string) =>
  call<{ name: string }>("country.getCountryById", { countryId }).then((c) => c.name).catch(() => countryId);

/** Įrangos kainos (mediana iš paskutinių sandorių) + ammo kainos. */
export async function getPrices(): Promise<Record<string, number | null>> {
  const [gear, base] = await Promise.all([
    fetch("/api/_gearPrices").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    call<Record<string, number>>("itemTrading.getPrices").catch(() => ({} as Record<string, number>)),
  ]);
  const out: Record<string, number | null> = { ...base };
  for (const [k, v] of Object.entries(gear as Record<string, { price: number } | null>)) out[k] = v?.price ?? null;
  return out;
}

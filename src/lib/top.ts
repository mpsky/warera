import { SKILL_KEYS, type GameConfig, type SkillKey, type UserLite, type Equipment } from "./types";
import {
  SLOTS, combat, currentGear, levelValue, makeCtx, maxLevel, skillTotals, slotOptions,
  type Gear, type GearPick, type Levels, type Prices, type Slot, type Vals,
} from "./model";
import { AMMO, pointsToRefund } from "./optimizer";
import { PROFILES, type ProfileId } from "./model";

export type Category = "attack" | "loot" | "economy";
export interface TopPlayer {
  id: string; username: string; avatarUrl?: string; level: number; totalSkillPoints: number; rank: number; value: number;
  levels: Levels; totals: Vals; attackMult: number; militaryRank: number;
  gear: Record<Slot, { code: string; stats: Record<string, number> } | null>; ammo: string | null;
}
export interface TopFile { updatedAt: string; category: Category; ranking: string; label: string; players: TopPlayer[] }

export const CATEGORY_LABEL: Record<Category, string> = { attack: "Ataka", loot: "Grobis", economy: "Ekonomika" };
export async function loadTop(cat: Category): Promise<TopFile> {
  const r = await fetch(`/data/builds-${cat}.json`);
  if (!r.ok) throw new Error("Top buildų duomenų nėra – paleiskite `npm run snapshot`");
  return r.json();
}

/** „Meta“ build: vidutiniai lygiai ir dažniausia įranga iš visų top žaidėjų. */
export function metaBuild(players: TopPlayer[]): TopPlayer {
  const n = Math.max(1, players.length);
  const levels = Object.fromEntries(SKILL_KEYS.map((k) => [k, Math.round(players.reduce((s, p) => s + p.levels[k], 0) / n)])) as Levels;
  const mode = (xs: (string | null)[]) => { const m = new Map<string, number>(); xs.forEach((x) => x && m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; };
  const gear = {} as TopPlayer["gear"];
  for (const s of SLOTS) { const c = mode(players.map((p) => p.gear[s]?.code ?? null)); gear[s] = c ? { code: c, stats: {} } : null; }
  return {
    id: "meta", username: `Top ${players.length} vidurkis`, level: Math.round(players.reduce((s, p) => s + p.level, 0) / n),
    totalSkillPoints: Math.round(players.reduce((s, p) => s + p.totalSkillPoints, 0) / n), rank: 0, value: 0,
    levels, totals: {} as Vals, attackMult: 1, militaryRank: 0, gear, ammo: mode(players.map((p) => p.ammo)),
  };
}

/** Pritaiko svetimą build'ą mano taškų biudžetui: lygiai auga proporcingai, kol baigiasi taškai. */
export function adaptLevels(cfg: GameConfig["skills"], target: Levels, budget: number, playerLevel: number): Levels {
  const L = Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])) as Levels;
  const T = Object.fromEntries(SKILL_KEYS.map((k) => [k, Math.min(target[k], maxLevel(cfg, k))])) as Levels;
  let spent = 0;
  for (;;) {
    let best: SkillKey | null = null, bestR = Infinity;
    for (const k of SKILL_KEYS) {
      if (L[k] >= T[k]) continue;
      const to = L[k] + 1, c = cfg[k].levels[to].totalCost - cfg[k].levels[L[k]].totalCost;
      if (spent + c > budget || cfg[k].levels[to].unlockAtLevel > playerLevel) continue;
      const r = L[k] / T[k] - T[k] * 1e-6; // mažiausiai „pažengęs“ skill pirmas
      if (r < bestR) { bestR = r; best = k; }
    }
    if (!best) return L;
    spent += cfg[best].levels[L[best] + 1].totalCost - cfg[best].levels[L[best]].totalCost; L[best]++;
  }
}

export const costOfLevels = (cfg: GameConfig["skills"], l: Levels) => SKILL_KEYS.reduce((s, k) => s + (cfg[k].levels[l[k]]?.totalCost ?? 0), 0);

export interface Metric { key: string; label: string; unit?: string; digits?: number; get: (v: Vals) => number }
const C = (f: (c: ReturnType<typeof combat>) => number) => (v: Vals) => f(combat(v));
const V = (k: SkillKey) => (v: Vals) => v[k];
export const COMBAT_METRICS: Metric[] = [
  { key: "perHit", label: "Žala / smūgį", digits: 0, get: C((c) => c.perHit) },
  { key: "perBar", label: "Žala / sveikatos juostą", digits: 0, get: C((c) => c.perBar) },
  { key: "attack", label: "Ataka", digits: 0, get: V("attack") },
  { key: "hit", label: "Pataikymas", unit: "%", digits: 0, get: C((c) => c.hit * 100) },
  { key: "crit", label: "Krit. tikimybė", unit: "%", digits: 0, get: C((c) => c.crit * 100) },
  { key: "critDmg", label: "Krit. žala", unit: "%", digits: 0, get: V("criticalDamages") },
  { key: "armor", label: "Šarvai (po cap)", unit: "%", digits: 0, get: C((c) => c.armorEff * 100) },
  { key: "dodge", label: "Išsisukimas (po cap)", unit: "%", digits: 0, get: C((c) => c.dodgeEff * 100) },
  { key: "health", label: "Sveikata", digits: 0, get: V("health") },
];
export const ECO_METRICS: Metric[] = [
  { key: "production", label: "Gamyba", digits: 0, get: V("production") },
  { key: "energy", label: "Energija", digits: 0, get: V("energy") },
  { key: "entrepreneurship", label: "Verslumas", digits: 0, get: V("entrepreneurship") },
  { key: "companies", label: "Įmonių riba", digits: 0, get: V("companies") },
  { key: "management", label: "Vadyba", digits: 0, get: V("management") },
  { key: "lootChance", label: "Grobio tikimybė", unit: "%", digits: 0, get: V("lootChance") },
];
const M = (key: string) => [...COMBAT_METRICS, ...ECO_METRICS].find((m) => m.key === key)!;
export const metricsFor = (id: ProfileId): Metric[] => ({
  damage: COMBAT_METRICS,
  crit: ["perHit", "attack", "crit", "critDmg", "hit"].map(M),
  loot: ["lootChance", "health", "armor", "dodge", "perBar"].map(M),
  economy: ECO_METRICS,
}[id]);

/** Kiek tinka kiekvienas top build'as šiam žaidėjui: jų lygiai (pritaikyti jūsų taškams) su JŪSŲ įranga. */
export function rankByFit(players: TopPlayer[], user: UserLite, cfg: GameConfig, eq: Equipment, id: ProfileId) {
  const prof = PROFILES[id], gear = currentGear(eq);
  const pct = AMMO.find((a) => a.code === eq.ammo)?.pct ?? 0;
  const ctx = makeCtx(user, cfg, pct);
  const cur = Object.fromEntries(SKILL_KEYS.map((k) => [k, user.skills?.[k]?.level ?? 0])) as Levels;
  const base = prof.score(skillTotals(cur, gear, ctx));
  return players.map((p) => {
    const lv = adaptLevels(cfg.skills, p.levels, user.leveling.totalSkillPoints, user.leveling.level);
    return { p, gain: (Math.exp(prof.score(skillTotals(lv, gear, ctx)) - base) - 1) * 100 };
  });
}

export interface GearDiff { slot: Slot; now: GearPick; next: GearPick; change: boolean }
export interface Comparison {
  levelsNow: Levels; levelsNext: Levels; exact: boolean; spentNext: number; budget: number; refund: number; missing: number;
  valsNow: Vals; valsNext: Vals; valsNextGear: Vals; gear: GearDiff[]; gearCost: number; ammo: string | null;
}

export function compare(user: UserLite, cfg: GameConfig, eq: Equipment, b: TopPlayer, prices: Prices, applyGear: boolean): Comparison {
  const budget = user.leveling.totalSkillPoints;
  const levelsNow = Object.fromEntries(SKILL_KEYS.map((k) => [k, user.skills?.[k]?.level ?? 0])) as Levels;
  const levelsNext = adaptLevels(cfg.skills, b.levels, budget, user.leveling.level);
  const gearNow = currentGear(eq);
  const gear: GearDiff[] = [], next = { ...gearNow } as Gear;
  for (const s of SLOTS) {
    const want = b.gear[s]?.code;
    let pick = gearNow[s];
    if (applyGear && want && want !== gearNow[s].code) {
      pick = slotOptions(s, cfg, prices, gearNow[s]).find((o) => o.code === want) ?? gearNow[s];
    }
    next[s] = pick; gear.push({ slot: s, now: gearNow[s], next: pick, change: pick.code !== gearNow[s].code });
  }
  const ammo = applyGear ? b.ammo ?? eq.ammo ?? null : eq.ammo ?? null;
  const pct = (c: string | null) => AMMO.find((a) => a.code === c)?.pct ?? 0;
  const valsNow = skillTotals(levelsNow, gearNow, makeCtx(user, cfg, pct(eq.ammo ?? null)));
  const valsNext = skillTotals(levelsNext, gearNow, makeCtx(user, cfg, pct(eq.ammo ?? null))); // tik skill'ai, jūsų įranga
  const valsNextGear = skillTotals(levelsNext, next, makeCtx(user, cfg, pct(ammo)));
  const wantCost = costOfLevels(cfg.skills, b.levels);
  return {
    levelsNow, levelsNext, exact: wantCost <= budget, spentNext: costOfLevels(cfg.skills, levelsNext), budget,
    refund: pointsToRefund(cfg.skills, levelsNow, levelsNext), missing: Math.max(0, wantCost - budget),
    valsNow, valsNext, valsNextGear, gear, gearCost: gear.reduce((s, g) => s + (g.change && !g.next.owned ? g.next.price : 0), 0), ammo,
  };
}
void levelValue;

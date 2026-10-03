import { SKILL_KEYS, type Equipment, type GameConfig, type SkillKey, type SkillsConfig, type UserLite } from "./types";

export type Vals = Record<SkillKey, number>;
export type Levels = Record<SkillKey, number>;
export const SLOTS = ["weapon", "helmet", "chest", "gloves", "pants", "boots"] as const;
export type Slot = (typeof SLOTS)[number];
export const TIERS = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;

/** Kiekvienas slotas duoda fiksuotą statą (iš gameConfig.items.*.dynamicStats). */
export const SLOT_STATS: Record<Slot, SkillKey[]> = {
  weapon: ["attack", "criticalChance"], helmet: ["criticalDamages"], chest: ["armor"],
  gloves: ["precision"], pants: ["armor"], boots: ["dodge"],
};
export const WEAPONS = ["knife", "gun", "rifle", "sniper", "tank", "jet"];
export const ITEM_CODES: Record<Slot, string[]> = {
  weapon: WEAPONS,
  helmet: [1, 2, 3, 4, 5, 6].map((i) => "helmet" + i), chest: [1, 2, 3, 4, 5, 6].map((i) => "chest" + i),
  gloves: [1, 2, 3, 4, 5, 6].map((i) => "gloves" + i), pants: [1, 2, 3, 4, 5, 6].map((i) => "pants" + i),
  boots: [1, 2, 3, 4, 5, 6].map((i) => "boots" + i),
};
export const tierOf = (slot: Slot, code: string) => ITEM_CODES[slot].indexOf(code); // 0..5

export interface GearPick { code: string | null; stats: Partial<Record<SkillKey, number>>; price: number; owned: boolean }
export type Gear = Record<Slot, GearPick>;
export type Prices = Record<string, number | null>;

/** Armor/dodge soft-cap: x/(x+K). K≈39.4 – pritaikyta pagal API `totalAfterSoftCap` (24→38, 38→49). */
export const SOFT_K = 39.4;
export const soft = (x: number) => (x <= 0 ? 0 : x / (x + SOFT_K));
/** Nepataikęs smūgis padaro pusę žalos ir negali būti kritinis (žaidimo aprašymas). */
export const MISS_FACTOR = 0.5;

export interface Ctx {
  cfg: SkillsConfig; playerLevel: number; extra: Vals; rankMult: number; ammoPct: number;
}

export const levelValue = (cfg: SkillsConfig, k: SkillKey, l: number) => cfg[k].levels[l]?.value ?? 0;
export const maxLevel = (cfg: SkillsConfig, k: SkillKey) => Math.max(...Object.keys(cfg[k].levels).map(Number));
export const currentLevels = (u: UserLite): Levels =>
  Object.fromEntries(SKILL_KEYS.map((k) => [k, u.skills?.[k]?.level ?? 0])) as Levels;

const num = (x: unknown) => (typeof x === "number" ? x : 0);

export function makeCtx(user: UserLite, cfg: GameConfig, ammoPct: number): Ctx {
  const extra = {} as Vals;
  for (const k of SKILL_KEYS) {
    const s = user.skills?.[k];
    extra[k] = !s || k === "attack" ? 0 : Math.max(0, s.total - levelValue(cfg.skills, k, s.level) - num(s.equipment) - num(s.weapon));
  }
  const a = user.skills?.attack;
  const rankMult = (1 + num(a?.militaryRankPercent) / 100) * (1 + (num(a?.buffsPercent) - num(a?.debuffsPercent)) / 100);
  return { cfg: cfg.skills, playerLevel: user.leveling.level, extra, rankMult, ammoPct };
}

export function skillTotals(levels: Levels, gear: Gear, ctx: Ctx): Vals {
  const v = {} as Vals;
  for (const k of SKILL_KEYS) v[k] = levelValue(ctx.cfg, k, levels[k]) + ctx.extra[k];
  for (const s of SLOTS) for (const [k, x] of Object.entries(gear[s].stats)) v[k as SkillKey] += x ?? 0;
  v.attack *= (1 + ctx.ammoPct / 100) * ctx.rankMult;
  return v;
}

export interface Combat { attack: number; hit: number; crit: number; critDmg: number; perHit: number; armorEff: number; dodgeEff: number; hp: number; perBar: number }
export function combat(v: Vals): Combat {
  const hit = Math.min(1, v.precision / 100), crit = Math.min(1, v.criticalChance / 100), critDmg = v.criticalDamages / 100;
  const perHit = v.attack * (hit * (1 + crit * critDmg) + (1 - hit) * MISS_FACTOR);
  const armorEff = soft(v.armor), dodgeEff = soft(v.dodge);
  // žala per vieną pilną sveikatos juostą: kuo mažiau sveikatos prarandama per smūgį, tuo daugiau smūgių
  const perBar = (perHit * v.health) / ((1 - armorEff) * (1 - dodgeEff));
  return { attack: v.attack, hit, crit, critDmg, perHit, armorEff, dodgeEff, hp: v.health, perBar };
}

export type ProfileId = "damage" | "tank" | "economy";
export interface Profile { id: ProfileId; name: string; blurb: string; score: (v: Vals) => number }
const ln = (x: number) => Math.log(Math.max(1e-9, x));
export const PROFILES: Record<ProfileId, Profile> = {
  damage: {
    id: "damage", name: "Žala", blurb: "Daugiausia žalos per vieną sveikatos juostą",
    score: (v) => { const c = combat(v); return ln(c.perBar) + 0.15 * ln(v.hunger); },
  },
  tank: {
    id: "tank", name: "Tankas", blurb: "Išgyvenimas: sveikata, šarvai, išsisukimas + vidutinė žala",
    score: (v) => { const c = combat(v); return ln(v.health) - ln(1 - c.armorEff) - ln(1 - c.dodgeEff) + 0.35 * ln(c.perHit) + 0.15 * ln(v.hunger); },
  },
  economy: {
    id: "economy", name: "Ekonomika", blurb: "Gamyba, energija, verslumas, įmonės ir vadyba",
    score: (v) => ln(v.production) + 0.5 * ln(v.energy) + 0.4 * ln(v.entrepreneurship) + 0.35 * ln(v.companies) + 0.3 * ln(v.management) + 0.1 * ln(v.lootChance),
  },
};

// ---------- įranga ----------
export const emptyPick = (): GearPick => ({ code: null, stats: {}, price: 0, owned: true });

export function currentGear(eq: Equipment): Gear {
  const g = {} as Gear;
  for (const s of SLOTS) {
    const it = eq[s];
    g[s] = it ? { code: it.code, stats: { ...(it.skills as Gear[Slot]["stats"]) }, price: 0, owned: true } : emptyPick();
  }
  return g;
}

export function slotOptions(slot: Slot, cfg: GameConfig, prices: Prices, owned: GearPick): GearPick[] {
  const out: GearPick[] = [emptyPick()];
  if (owned.code) out.push(owned);
  for (const code of ITEM_CODES[slot]) {
    const p = prices[code];
    const ds = cfg.items?.[code]?.dynamicStats as Record<string, [number, number]> | undefined;
    if (p == null || !ds) continue;
    out.push({ code, price: p, owned: false, stats: Object.fromEntries(Object.entries(ds).map(([k, [lo, hi]]) => [k, (lo + hi) / 2])) });
  }
  return out;
}

export interface Plan {
  levels: Levels; gear: Gear; ammo: string | null; spent: number; budget: number; gearCost: number;
  score: number; vals: Vals;
}

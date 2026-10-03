import { SKILL_KEYS, type SkillKey, type SkillsConfig, type UserLite } from "./types";

export type Levels = Record<SkillKey, number>;
export type ProfileId = "damage" | "tank" | "economy";

/** Metrikų svoriai: score = Σ w · ln(1 + metric). Tai euristika, ne žaidimo formulė. */
export interface Profile { id: ProfileId; name: string; blurb: string; metrics: (v: Vals) => Record<string, [number, number]> }
type Vals = Record<SkillKey, number>;

const pct = (x: number) => Math.max(0, Math.min(1, x / 100));

export const PROFILES: Record<ProfileId, Profile> = {
  damage: {
    id: "damage", name: "Damage dealer", blurb: "Maksimalus tikėtinas žala per smūgį + energijos atsargos",
    metrics: (v) => {
      const expected = v.attack * Math.max(0.05, pct(v.precision)) * (1 + pct(v.criticalChance) * (v.criticalDamages / 100));
      return {
        expected: [expected, 1.0],
        health: [v.health, 0.25], energy: [v.energy, 0.35],
        defense: [v.armor + v.dodge, 0.15],
      };
    },
  },
  tank: {
    id: "tank", name: "Tankas / išgyvenimas", blurb: "Armor, dodge ir HP su pakankama žala",
    metrics: (v) => ({
      defense: [v.armor + v.dodge, 0.8], health: [v.health, 0.7], hunger: [v.hunger, 0.2],
      expected: [v.attack * Math.max(0.05, pct(v.precision)), 0.5], energy: [v.energy, 0.3],
    }),
  },
  economy: {
    id: "economy", name: "Ekonomika / darbas", blurb: "Gamyba, energija, įmonės ir valdymas",
    metrics: (v) => ({
      production: [v.production, 1.0], energy: [v.energy, 0.5], entrepreneurship: [v.entrepreneurship, 0.4],
      companies: [v.companies, 0.35], management: [v.management, 0.3], lootChance: [v.lootChance, 0.15],
    }),
  },
};

export function score(profile: Profile, v: Vals): number {
  let s = 0;
  for (const [x, w] of Object.values(profile.metrics(v))) s += w * Math.log1p(Math.max(0, x));
  return s;
}

const maxLevel = (cfg: SkillsConfig, k: SkillKey) =>
  Math.max(...Object.keys(cfg[k].levels).map(Number));
const stepCost = (cfg: SkillsConfig, k: SkillKey, to: number) =>
  cfg[k].levels[to].totalCost - cfg[k].levels[to - 1].totalCost;
const unlocked = (cfg: SkillsConfig, k: SkillKey, to: number, playerLevel: number) =>
  cfg[k].levels[to].unlockAtLevel <= playerLevel;

export const costOf = (cfg: SkillsConfig, l: Levels) =>
  SKILL_KEYS.reduce((s, k) => s + (cfg[k].levels[l[k]]?.totalCost ?? 0), 0);

/** Fiksuoti priedai, nepriklausantys nuo skill lygio (įranga, ginklas, buffai). */
export function flatBonuses(user: UserLite, cfg: SkillsConfig): Vals {
  const out = {} as Vals;
  for (const k of SKILL_KEYS) {
    const c = user.skills?.[k];
    const lvlVal = cfg[k].levels[c?.level ?? 0]?.value ?? 0;
    out[k] = c ? Math.max(0, c.total - lvlVal) : 0;
  }
  return out;
}

export function valuesAt(cfg: SkillsConfig, l: Levels, bonus: Vals): Vals {
  const v = {} as Vals;
  for (const k of SKILL_KEYS) v[k] = (cfg[k].levels[l[k]]?.value ?? 0) + bonus[k];
  return v;
}

export interface Plan { levels: Levels; spent: number; budget: number; score: number }

/** Godus + lookahead + keitimų lokali paieška. Biudžetas = visi skill taškai (po reset'o). */
export function optimize(cfg: SkillsConfig, user: UserLite, profile: Profile, budget = user.leveling.totalSkillPoints): Plan {
  const bonus = flatBonuses(user, cfg);
  const lvl = user.leveling.level;
  const L = Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])) as Levels;
  let spent = 0;
  const sc = (l: Levels) => score(profile, valuesAt(cfg, l, bonus));
  let cur = sc(L);

  for (;;) {
    let best: { k: SkillKey; to: number; ratio: number } | null = null;
    for (const k of SKILL_KEYS) {
      for (let to = L[k] + 1; to <= Math.min(L[k] + 3, maxLevel(cfg, k)); to++) {
        if (!unlocked(cfg, k, to, lvl)) break;
        const cost = cfg[k].levels[to].totalCost - cfg[k].levels[L[k]].totalCost;
        if (spent + cost > budget) break;
        const gain = sc({ ...L, [k]: to }) - cur;
        const ratio = gain / Math.max(1, cost);
        if (gain > 1e-12 && (!best || ratio > best.ratio)) best = { k, to, ratio };
      }
    }
    if (!best) break;
    spent += cfg[best.k].levels[best.to].totalCost - cfg[best.k].levels[L[best.k]].totalCost;
    L[best.k] = best.to;
    cur = sc(L);
  }

  // lokali paieška: perkelti taškus iš vieno skill į kitą, kol gerėja
  for (let improved = true, guard = 0; improved && guard < 200; guard++) {
    improved = false;
    for (const a of SKILL_KEYS) for (const b of SKILL_KEYS) {
      if (a === b || L[a] === 0) continue;
      const T: Levels = { ...L, [a]: L[a] - 1 };
      let s2 = spent - stepCost(cfg, a, L[a]);
      while (L[b] < maxLevel(cfg, b)) {
        const nx = T[b] + 1;
        if (nx > maxLevel(cfg, b) || !unlocked(cfg, b, nx, lvl)) break;
        const c = stepCost(cfg, b, nx);
        if (s2 + c > budget) break;
        T[b] = nx; s2 += c;
        const sv = sc(T);
        if (sv > cur + 1e-9) { Object.assign(L, T); spent = s2; cur = sv; improved = true; break; }
      }
    }
  }
  return { levels: L, spent, budget, score: cur };
}

export const currentLevels = (user: UserLite): Levels =>
  Object.fromEntries(SKILL_KEYS.map((k) => [k, user.skills?.[k]?.level ?? 0])) as Levels;

/** Kiek taškų reikėtų perskirstyti (skill'ų, kuriuose lygis mažėja). */
export function pointsToRefund(cfg: SkillsConfig, from: Levels, to: Levels) {
  return SKILL_KEYS.reduce((s, k) => s + Math.max(0, (cfg[k].levels[from[k]]?.totalCost ?? 0) - (cfg[k].levels[to[k]]?.totalCost ?? 0)), 0);
}

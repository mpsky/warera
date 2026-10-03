import { SKILL_KEYS, type GameConfig, type SkillKey, type SkillsConfig, type UserLite } from "./types";
import { SKILL } from "./labels";
import {
  SLOTS, currentGear, currentLevels, makeCtx, maxLevel, skillTotals, slotOptions,
  type Ctx, type Gear, type Levels, type Plan, type Prices, type Profile, type Slot,
} from "./model";

export const costOf = (cfg: SkillsConfig, l: Levels) => SKILL_KEYS.reduce((s, k) => s + (cfg[k].levels[l[k]]?.totalCost ?? 0), 0);
const stepCost = (cfg: SkillsConfig, k: SkillKey, to: number) => cfg[k].levels[to].totalCost - cfg[k].levels[to - 1].totalCost;
const unlocked = (cfg: SkillsConfig, k: SkillKey, to: number, lvl: number) => cfg[k].levels[to].unlockAtLevel <= lvl;

/** Skill taškų paskirstymas: godus (gain/cost, 3 lygių lookahead) + taškų perkėlimo paieška. */
export function optimizeSkills(profile: Profile, ctx: Ctx, gear: Gear, budget: number, lock: Partial<Levels> = {}): { levels: Levels; spent: number; score: number } {
  const cfg = ctx.cfg;
  const L = Object.fromEntries(SKILL_KEYS.map((k) => [k, lock[k] ?? 0])) as Levels;
  const free = SKILL_KEYS.filter((k) => lock[k] === undefined);
  const sc = (l: Levels) => profile.score(skillTotals(l, gear, ctx));
  let spent = costOf(cfg, L), cur = sc(L);
  for (;;) {
    let best: { k: SkillKey; to: number; ratio: number } | null = null;
    for (const k of free) for (let to = L[k] + 1; to <= Math.min(L[k] + 3, maxLevel(cfg, k)); to++) {
      if (!unlocked(cfg, k, to, ctx.playerLevel)) break;
      const cost = cfg[k].levels[to].totalCost - cfg[k].levels[L[k]].totalCost;
      if (spent + cost > budget) break;
      const gain = sc({ ...L, [k]: to }) - cur;
      if (gain > 1e-12 && (!best || gain / Math.max(1, cost) > best.ratio)) best = { k, to, ratio: gain / Math.max(1, cost) };
    }
    if (!best) break;
    spent += cfg[best.k].levels[best.to].totalCost - cfg[best.k].levels[L[best.k]].totalCost;
    L[best.k] = best.to; cur = sc(L);
  }
  for (let improved = true, guard = 0; improved && guard < 200; guard++) {
    improved = false;
    for (const a of free) for (const b of free) {
      if (a === b || L[a] === 0) continue;
      const T: Levels = { ...L, [a]: L[a] - 1 };
      let s2 = spent - stepCost(cfg, a, L[a]);
      for (;;) {
        const nx = T[b] + 1;
        if (nx > maxLevel(cfg, b) || !unlocked(cfg, b, nx, ctx.playerLevel)) break;
        const c = stepCost(cfg, b, nx);
        if (s2 + c > budget) break;
        T[b] = nx; s2 += c;
        const sv = sc(T);
        if (sv > cur + 1e-9) { Object.assign(L, T); spent = s2; cur = sv; improved = true; break; }
      }
    }
  }
  return { levels: L, spent, score: cur };
}

/** Įrangos pasirinkimas pagal biudžetą: godus (Δscore / kaina), pradedant nuo to, ką žaidėjas jau turi. */
export function optimizeGear(profile: Profile, ctx: Ctx, levels: Levels, start: Gear, opts: Record<Slot, Gear[Slot][]>, budget: number): Gear {
  const G = { ...start };
  let spent = 0;
  const sc = (g: Gear) => profile.score(skillTotals(levels, g, ctx));
  let cur = sc(G);
  for (let guard = 0; guard < 40; guard++) {
    let best: { s: Slot; o: Gear[Slot]; ratio: number; cost: number } | null = null;
    for (const s of SLOTS) for (const o of opts[s]) {
      if (o === G[s] || o.code === G[s].code) continue;
      const cost = (o.owned ? 0 : o.price) - (G[s].owned ? 0 : 0);
      if (spent + cost > budget) continue;
      const gain = sc({ ...G, [s]: o }) - cur;
      if (gain <= 1e-9) continue;
      const ratio = gain / Math.max(0.01, cost);
      if (!best || ratio > best.ratio) best = { s, o, ratio, cost };
    }
    if (!best) break;
    G[best.s] = best.o; spent += best.cost; cur = sc(G);
  }
  return G;
}

export const AMMO = [{ code: "lightAmmo", pct: 10 }, { code: "ammo", pct: 20 }, { code: "heavyAmmo", pct: 40 }];

export function planFor(user: UserLite, cfg: GameConfig, eq: Parameters<typeof currentGear>[0], profile: Profile, prices: Prices, gearBudget: number, useGear: boolean, lockEco = false): Plan {
  const budget = user.leveling.totalSkillPoints;
  const startGear = currentGear(eq);
  const best = useGear ? AMMO[AMMO.length - 1] : AMMO.find((a) => a.code === eq.ammo) ?? AMMO[0];
  const ammoPct = useGear ? best.pct : (AMMO.find((a) => a.code === eq.ammo)?.pct ?? 0);
  const ctx = makeCtx(user, cfg, ammoPct);
  const opts = Object.fromEntries(SLOTS.map((s) => [s, slotOptions(s, cfg, prices, startGear[s])])) as Record<Slot, Gear[Slot][]>;
  let gear = startGear;
  const cur = currentLevels(user);
  const lock: Partial<Levels> = lockEco ? Object.fromEntries(SKILL_KEYS.filter((k) => SKILL[k].group === "eco").map((k) => [k, cur[k]])) : {};
  let sk = optimizeSkills(profile, ctx, gear, budget, lock);
  if (useGear) for (let i = 0; i < 2; i++) {
    gear = optimizeGear(profile, ctx, sk.levels, startGear, opts, gearBudget);
    sk = optimizeSkills(profile, ctx, gear, budget, lock);
  }
  const gearCost = SLOTS.reduce((s, k) => s + (gear[k].owned ? 0 : gear[k].price), 0);
  return { levels: sk.levels, gear, ammo: useGear ? best.code : eq.ammo ?? null, spent: sk.spent, budget, gearCost, score: sk.score, vals: skillTotals(sk.levels, gear, ctx) };
}

export function currentState(user: UserLite, cfg: GameConfig, eq: Parameters<typeof currentGear>[0], profile: Profile) {
  const ammoPct = AMMO.find((a) => a.code === eq.ammo)?.pct ?? 0;
  const ctx = makeCtx(user, cfg, ammoPct);
  const gear = currentGear(eq), levels = currentLevels(user);
  const vals = skillTotals(levels, gear, ctx);
  return { ctx, gear, levels, vals, score: profile.score(vals) };
}

export function pointsToRefund(cfg: SkillsConfig, from: Levels, to: Levels) {
  return SKILL_KEYS.reduce((s, k) => s + Math.max(0, (cfg[k].levels[from[k]]?.totalCost ?? 0) - (cfg[k].levels[to[k]]?.totalCost ?? 0)), 0);
}

import { describe, expect, it } from "vitest";
import { SKILL_KEYS, type GameConfig, type UserLite } from "./types";
import { PROFILES, combat, currentGear, makeCtx, skillTotals, soft } from "./model";
import { costOf, planFor } from "./optimizer";

const track = { levels: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, { cost: i, totalCost: (i * (i + 1)) / 2, unlockAtLevel: 1, value: 10 + 5 * i }])) };
const cfg = { skills: Object.fromEntries(SKILL_KEYS.map((k) => [k, track])), user: { resetSkillsCostPerPoint: 0.5 }, items: {} } as unknown as GameConfig;
const user = {
  leveling: { level: 30, totalSkillPoints: 60 },
  skills: Object.fromEntries(SKILL_KEYS.map((k) => [k, { level: 0, total: 10 }])),
} as unknown as UserLite;

describe("model", () => {
  it("attack formula matches live sample (level 300 + weapon 53, ammo 10%, rank 20% = 466)", () => {
    const u = { ...user, skills: { ...user.skills, attack: { level: 8, total: 466, militaryRankPercent: 20, buffsPercent: 0, debuffsPercent: 0 } } } as unknown as UserLite;
    const c = { ...cfg, skills: { ...cfg.skills, attack: { levels: { ...track.levels, 8: { ...track.levels[8], value: 300 } } } } } as GameConfig;
    const ctx = makeCtx(u, c, 10);
    const gear = currentGear({ weapon: { code: "gun", state: 1, maxState: 1, skills: { attack: 53 } } });
    const v = skillTotals({ ...Object.fromEntries(SKILL_KEYS.map((k) => [k, 0])), attack: 8 } as never, gear, ctx);
    expect(v.attack).toBeCloseTo(465.96, 1);
  });
  it("soft cap fits API samples", () => {
    expect(Math.round(soft(24) * 100)).toBe(38);
    expect(Math.round(soft(38) * 100)).toBe(49);
  });
  it("more armor never reduces damage per bar", () => {
    const base = Object.fromEntries(SKILL_KEYS.map((k) => [k, 50])) as never;
    expect(combat({ ...(base as object), armor: 80 } as never).perBar).toBeGreaterThan(combat(base).perBar);
  });
});

describe("planner", () => {
  it("stays within budget and unlock rules for every profile", () => {
    for (const p of Object.values(PROFILES)) {
      const plan = planFor(user, cfg, {}, p, {}, 0, true);
      expect(costOf(cfg.skills, plan.levels)).toBe(plan.spent);
      expect(plan.spent).toBeLessThanOrEqual(60);
    }
  });
  it("economy profile favours production over attack", () => {
    const plan = planFor(user, cfg, {}, PROFILES.economy, {}, 0, true);
    expect(plan.levels.production).toBeGreaterThan(plan.levels.attack);
  });
  it("keeps eco skills when locked", () => {
    const plan = planFor(user, cfg, {}, PROFILES.damage, {}, 0, true, true);
    for (const k of ["energy", "production", "entrepreneurship"] as const) expect(plan.levels[k]).toBe(0);
  });
  it("never buys gear above the budget", () => {
    const c = { ...cfg, items: { helmet3: { dynamicStats: { criticalDamages: [30, 40] } } } } as unknown as GameConfig;
    expect(planFor(user, c, {}, PROFILES.damage, { helmet3: 50 }, 10, true).gearCost).toBe(0);
    expect(planFor(user, c, {}, PROFILES.damage, { helmet3: 50 }, 100, true).gear.helmet.code).toBe("helmet3");
  });
});

import { adaptLevels, costOfLevels } from "./top";
describe("adaptLevels", () => {
  const target = Object.fromEntries(SKILL_KEYS.map((k) => [k, k === "attack" ? 10 : k === "health" ? 6 : 0])) as never;
  it("matches exactly when the budget allows", () => {
    expect(adaptLevels(cfg.skills, target, 1000, 30)).toEqual(target);
  });
  it("scales proportionally and never exceeds the budget", () => {
    const l = adaptLevels(cfg.skills, target, 20, 30);
    expect(costOfLevels(cfg.skills, l)).toBeLessThanOrEqual(20);
    expect(l.attack).toBeGreaterThan(0); expect(l.health).toBeGreaterThan(0);
    expect(l.attack).toBeGreaterThanOrEqual(l.health);
  });
});

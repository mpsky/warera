import { describe, expect, it } from "vitest";
import { SKILL_KEYS, type SkillsConfig, type SkillTrackCfg, type UserLite } from "./types";
import { PROFILES, optimize, costOf } from "./optimizer";

const mk = (base: number, step: number): SkillTrackCfg => ({
  levels: Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i, {
    cost: i, totalCost: (i * (i + 1)) / 2, unlockAtLevel: i * 3, value: base + step * i,
  }])),
});
const cfg = Object.fromEntries(SKILL_KEYS.map((k) => [k, mk(10, 5)])) as SkillsConfig;
const user = {
  leveling: { level: 30, totalSkillPoints: 40, availableSkillPoints: 0, spentSkillPoints: 40 },
  skills: Object.fromEntries(SKILL_KEYS.map((k) => [k, { level: 0, total: 10 }])),
} as unknown as UserLite;

describe("optimizer", () => {
  it("never exceeds budget and respects unlocks", () => {
    for (const p of Object.values(PROFILES)) {
      const plan = optimize(cfg, user, p);
      expect(costOf(cfg, plan.levels)).toBe(plan.spent);
      expect(plan.spent).toBeLessThanOrEqual(40);
      for (const k of SKILL_KEYS) expect(plan.levels[k] * 3).toBeLessThanOrEqual(30);
    }
  });
  it("economy profile favours production over attack", () => {
    const plan = optimize(cfg, user, PROFILES.economy);
    expect(plan.levels.production).toBeGreaterThan(plan.levels.attack);
  });
});

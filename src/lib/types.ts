// Tipai paimti iš WarEraProjects/TRPC (Responses.d.ts); palikti tik naudojami laukai.
export const SKILL_KEYS = [
  "attack", "criticalChance", "criticalDamages", "precision", "armor", "dodge",
  "health", "energy", "hunger", "production", "entrepreneurship", "companies",
  "management", "lootChance",
] as const;
export type SkillKey = (typeof SKILL_KEYS)[number];

export interface SkillLevelCfg { cost?: number; totalCost: number; unlockAtLevel: number; value: number }
export interface SkillTrackCfg { levels: Record<string, SkillLevelCfg> }
export type SkillsConfig = Record<SkillKey, SkillTrackCfg>;

export interface GameConfig {
  skills: SkillsConfig;
  user: { resetSkillsCostPerPoint: number; resetSkillDaysCooldown: number; maxEnergy: number; maxHunger: number };
  items: Record<string, any>;
}

export interface ComputedSkill {
  level: number; total: number; value?: number; equipment?: unknown; weapon?: unknown;
  ammoPercent?: number; buffsPercent?: number; debuffsPercent?: number; militaryRankPercent?: number;
  currentBarValue?: number; hourlyBarRegen?: number;
}
export interface Ranking { rank: number; tier: string; value: number }
export interface UserLite {
  _id: string; username: string; avatarUrl?: string; country: string; mu?: string;
  createdAt: string; isActive: boolean; militaryRank: number;
  dates: Record<string, any>;
  infos: { isPremium: boolean; premiumMonthsCount: number; description?: string };
  leveling: { level: number; totalXp: number; availableSkillPoints: number; spentSkillPoints: number; totalSkillPoints: number; freeReset: number; dailyXpLeft: number };
  rankings: Record<string, Ranking>;
  skills: Record<SkillKey, ComputedSkill>;
  stats: { damagesCount: number };
}
export interface EquipItem {
  code: string; state: number; maxState: number; skills: Record<string, number>; type?: string;
}
export interface Equipment {
  ammo?: string; weapon?: EquipItem; helmet?: EquipItem; chest?: EquipItem;
  pants?: EquipItem; gloves?: EquipItem; boots?: EquipItem;
}

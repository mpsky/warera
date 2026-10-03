import type { SkillKey } from "./types";
export const SKILL_LABEL: Record<SkillKey, [string, string]> = {
  attack: ["⚔️", "Attack"], criticalChance: ["🎯", "Crit chance"], criticalDamages: ["💥", "Crit damage"],
  precision: ["🔭", "Precision"], armor: ["🛡️", "Armor"], dodge: ["💨", "Dodge"], health: ["❤️", "Health"],
  energy: ["⚡", "Energy"], hunger: ["🍞", "Hunger"], production: ["🏭", "Production"],
  entrepreneurship: ["💼", "Entrepreneurship"], companies: ["🏢", "Companies"], management: ["📋", "Management"],
  lootChance: ["🎁", "Loot chance"],
};
export const SLOTS = [["weapon", "🔫", "Ginklas"], ["helmet", "🪖", "Šalmas"], ["chest", "🦺", "Šarvai"],
  ["pants", "👖", "Kelnės"], ["gloves", "🧤", "Pirštinės"], ["boots", "🥾", "Batai"]] as const;
export const RANK_LABEL: Record<string, string> = {
  userDamages: "Žala", weeklyUserDamages: "Savaitės žala", userLevel: "Lygis", userWealth: "Turtas",
  userTerrain: "Teritorija", userBounty: "Bounty", userCasesOpened: "Atidaryta dėžių", userReferrals: "Referalai",
  userSkinsOwned: "Skin'ai", userMilestoneTiers: "Milestone'ai", userMissionsClaimed: "Misijos", userSubscribers: "Sekėjai", userPremiumMonths: "Premium mėn.", userPremiumGifts: "Premium dovanos", userGemsPurchased: "Gems",
};
export const fmt = (n: unknown, d = 1) =>
  typeof n === "number" ? n.toLocaleString("lt-LT", { maximumFractionDigits: d }) : "—";

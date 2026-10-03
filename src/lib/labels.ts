import type { SkillKey } from "./types";
import type { Slot } from "./model";
// Pavadinimai ir spalvos paimti iš žaidimo ekrano (lietuviška sąsaja).
export const SKILL: Record<SkillKey, { name: string; color: string; bg: string; desc: string; group: "combat" | "eco" }> = {
  attack: { name: "Ataka", color: "#f0a47a", bg: "#8a4a2c", desc: "Bazinis žalos dydis", group: "combat" },
  precision: { name: "Tikslumas", color: "#f0a0b8", bg: "#8a3a52", desc: "Tikimybė pataikyti", group: "combat" },
  criticalChance: { name: "Krit. tikimybė", color: "#f08ab0", bg: "#8a2f5a", desc: "Tikimybė kritiniam smūgiui", group: "combat" },
  criticalDamages: { name: "Krit. žala", color: "#f08ab0", bg: "#7a2a60", desc: "Kritinių smūgių žalos priedas", group: "combat" },
  armor: { name: "Šarvai", color: "#b8d0dc", bg: "#4a6672", desc: "Mažina prarandamą sveikatą", group: "combat" },
  dodge: { name: "Išsisukimas", color: "#9ec8d0", bg: "#3f6670", desc: "Tikimybė išvengti žalos", group: "combat" },
  health: { name: "Sveikata", color: "#6fe0a0", bg: "#1f6a3c", desc: "Sunaudojama kovojant", group: "combat" },
  hunger: { name: "Alkis", color: "#f08a7a", bg: "#8a2f26", desc: "Maisto suvartojimo limitas", group: "combat" },
  energy: { name: "Energija", color: "#7f9cff", bg: "#2a3fa0", desc: "Naudojama darbui", group: "eco" },
  production: { name: "Gamyba", color: "#f0c050", bg: "#8a6a1a", desc: "Gamybos taškai per darbą", group: "eco" },
  entrepreneurship: { name: "Verslumas", color: "#e07ad8", bg: "#7a2a72", desc: "Savarankiškas darbas", group: "eco" },
  companies: { name: "Įmonių riba", color: "#f0c050", bg: "#7a5a16", desc: "Kiek įmonių gali turėti", group: "eco" },
  management: { name: "Vadyba", color: "#b49cf0", bg: "#4a3a8a", desc: "Valdomi darbuotojai", group: "eco" },
  lootChance: { name: "Grobio tikimybė", color: "#6fe0a0", bg: "#1f6a3c", desc: "Grobis per smūgį", group: "eco" },
};
export const SLOT_LABEL: Record<Slot, string> = { weapon: "Ginklas", helmet: "Šalmas", chest: "Šarvai", gloves: "Pirštinės", pants: "Kelnės", boots: "Batai" };
export const TIER_LABEL = ["Paprastas", "Neįprastas", "Retas", "Epinis", "Legendinis", "Mitinis"];
export const AMMO_LABEL: Record<string, string> = { lightAmmo: "Lengvi šoviniai", ammo: "Šoviniai", heavyAmmo: "Sunkūs šoviniai" };
export const fmt = (n: unknown, d = 1) => (typeof n === "number" && isFinite(n) ? n.toLocaleString("lt-LT", { maximumFractionDigits: d }) : "—");
export const money = (n: number) => fmt(n, n < 10 ? 2 : n < 100 ? 1 : 0);

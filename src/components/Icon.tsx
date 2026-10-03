import { useState } from "react";
import {
  mdiAccount, mdiAccountTie, mdiBullseyeArrow, mdiCircleMultiple, mdiCrosshairs, mdiFactory, mdiHeart, mdiLightbulb,
  mdiLightningBolt, mdiMagnify, mdiPickaxe, mdiRunFast, mdiShield, mdiSilverwareForkKnife, mdiStar, mdiStarFourPoints,
  mdiSword, mdiTreasureChest,
} from "@mdi/js";

// Skill ikonos – tos pačios Material Design Icons, kurias naudoja žaidimas (mdi-icon).
const P: Record<string, string> = {
  attack: mdiSword, precision: mdiCrosshairs, criticalChance: mdiStarFourPoints, criticalDamages: mdiBullseyeArrow,
  armor: mdiShield, dodge: mdiRunFast, health: mdiHeart, energy: mdiLightningBolt, hunger: mdiSilverwareForkKnife,
  production: mdiPickaxe, entrepreneurship: mdiLightbulb, companies: mdiFactory, management: mdiAccountTie,
  lootChance: mdiTreasureChest, coin: mdiCircleMultiple, user: mdiAccount, search: mdiMagnify, star: mdiStar,
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={P[name] ?? P.star} />
    </svg>
  );
}

const MEDIA = "https://media.warera.io/images";
/** Žaidimo paveikslėliai iš media.warera.io (leista kūrėjų). Jei nepavyksta – rodoma savo ikona. */
export function GameImg({ path, size = 32, fallback = "star", alt = "" }: { path: string; size?: number; fallback?: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  if (bad) return <Icon name={fallback} size={size * 0.8} />;
  return <img src={`${MEDIA}/${path}`} alt={alt} width={size} height={size} loading="lazy" className="gimg" onError={() => setBad(true)} />;
}
/** Item ikona: ginklai/ammo – pagal kodą, šarvai – pagal slotą (kaip žaidime). */
export const itemPath = (slot: string, code?: string | null) =>
  `itemsv2/${slot === "weapon" || slot === "ammo" ? code ?? (slot === "weapon" ? "gun" : "lightAmmo") : slot}.png`;

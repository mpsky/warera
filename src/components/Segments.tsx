import type { CSSProperties } from "react";
import { Icon } from "./Icon";
import { SKILL } from "../lib/labels";
import type { SkillKey } from "../lib/types";

/** 10 langelių kaip žaidime: current = užpildyta, plan = siūlomas lygis (pridėti šviečia, nuimti – kontūras). */
export function Segments({ k, level, plan, max = 10 }: { k: SkillKey; level: number; plan?: number; max?: number }) {
  const s = SKILL[k];
  const target = plan ?? level;
  return (
    <div className="segs" style={{ "--c": s.color, "--seg": s.bg } as CSSProperties}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const cls = n <= Math.min(level, target) ? "on" : n <= target ? "add" : n <= level ? "rm" : "";
        return <i key={i} className={cls}>{cls && cls !== "rm" ? <Icon name={k} size={14} /> : null}</i>;
      })}
    </div>
  );
}

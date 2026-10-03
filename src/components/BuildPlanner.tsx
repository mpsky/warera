import { useMemo, useState } from "react";
import { Card } from "./Card";
import { PROFILES, currentLevels, optimize, pointsToRefund, flatBonuses, score, valuesAt, type ProfileId } from "../lib/optimizer";
import { SKILL_KEYS, type GameConfig, type UserLite } from "../lib/types";
import { SKILL_LABEL, fmt } from "../lib/labels";

export function BuildPlanner({ user, cfg }: { user: UserLite; cfg: GameConfig }) {
  const [pid, setPid] = useState<ProfileId>("damage");
  const profile = PROFILES[pid];
  const cur = useMemo(() => currentLevels(user), [user]);
  const plan = useMemo(() => optimize(cfg.skills, user, profile), [cfg, user, profile]);
  const curScore = useMemo(() => score(profile, valuesAt(cfg.skills, cur, flatBonuses(user, cfg.skills))), [cfg, user, profile, cur]);
  const refund = pointsToRefund(cfg.skills, cur, plan.levels);
  const resetCost = refund * (cfg.user?.resetSkillsCostPerPoint ?? 0);
  const gain = curScore ? ((Math.exp(plan.score - curScore) - 1) * 100) : 0;

  return (
    <Card title="Siūlomas build’as" icon="🧠" wide>
      <div className="tabs" role="tablist">
        {Object.values(PROFILES).map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === pid} className={p.id === pid ? "on" : ""} onClick={() => setPid(p.id)}>{p.name}</button>
        ))}
      </div>
      <p className="desc">{profile.blurb}. Naudojama {plan.budget} taškų, lygis {user.leveling.level}.</p>
      <div className="plan">
        {SKILL_KEYS.map((k) => {
          const d = plan.levels[k] - cur[k];
          return (
            <div key={k} className={"plan-row" + (d ? (d > 0 ? " up" : " down") : "")}>
              <span>{SKILL_LABEL[k][0]} {SKILL_LABEL[k][1]}</span>
              <span>{cur[k]} → <b>{plan.levels[k]}</b></span>
              <span className="delta">{d > 0 ? `+${d}` : d < 0 ? d : "="}</span>
            </div>
          );
        })}
      </div>
      <div className="summary">
        <span>Išleista: <b>{plan.spent}/{plan.budget}</b></span>
        <span>Perskirstyti: <b>{refund}</b> tšk.</span>
        {resetCost > 0 && <span>Reset kaina: <b>{fmt(resetCost, 0)}</b></span>}
        <span>Modelio balas: <b>{gain >= 0 ? "+" : ""}{fmt(gain, 0)}%</b></span>
      </div>
      <small className="note">Įvertinimas – supaprastintas modelis (žr. docs/PLAN.md). Prieš reset’ą palyginkite su savo žaidimo stiliumi.</small>
    </Card>
  );
}

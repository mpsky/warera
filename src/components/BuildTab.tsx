import { useMemo, useState } from "react";
import { GameImg, Icon, itemPath } from "./Icon";
import { Segments } from "./Segments";
import { CombatChips } from "./StatsTab";
import { AMMO_LABEL, SKILL, SLOT_LABEL, TIER_LABEL, fmt, money } from "../lib/labels";
import { PROFILES, SLOTS, tierOf, type Prices, type ProfileId } from "../lib/model";
import { AMMO, currentState, planFor, pointsToRefund } from "../lib/optimizer";
import { SKILL_KEYS, type Equipment, type GameConfig, type UserLite } from "../lib/types";

const BUDGETS = [0, 25, 100, 500, 2000, Infinity];

export function BuildTab({ user, cfg, eq, prices }: { user: UserLite; cfg: GameConfig; eq: Equipment; prices: Prices }) {
  const [pid, setPid] = useState<ProfileId>("damage");
  const [budget, setBudget] = useState(100);
  const [keepEco, setKeepEco] = useState(true);
  const lockEco = keepEco && pid !== "economy";
  const profile = PROFILES[pid];
  const now = useMemo(() => currentState(user, cfg, eq, profile), [user, cfg, eq, profile]);
  const plan = useMemo(() => planFor(user, cfg, eq, profile, prices, budget, true, lockEco), [user, cfg, eq, profile, prices, budget, lockEco]);
  const refund = pointsToRefund(cfg.skills, now.levels, plan.levels);
  const resetCost = refund * (cfg.user?.resetSkillsCostPerPoint ?? 0);
  const gain = (Math.exp(plan.score - now.score) - 1) * 100;
  const changed = SLOTS.filter((s) => plan.gear[s].code !== now.gear[s].code);
  const noPrices = Object.keys(prices).filter((k) => /\d$|^(knife|gun|rifle|sniper|tank|jet)$/.test(k) && prices[k] != null).length === 0;

  return (
    <div className="cols">
      <div className="col">
      <div className="tabs sub" role="tablist">
        {Object.values(PROFILES).map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === pid} className={p.id === pid ? "on" : ""} onClick={() => setPid(p.id)}>{p.name}</button>
        ))}
      </div>
      <p className="blurb">{profile.blurb}. Lygis {user.leveling.level}, {plan.budget} taškų.</p>
      {pid !== "economy" && <div className="pills" style={{ marginTop: 8 }}><button className={keepEco ? "on" : ""} onClick={() => setKeepEco(!keepEco)}>{keepEco ? "✓ " : ""}Palikti ekonomikos skill’us</button></div>}

      <div className="sect">Įrangos biudžetas <GameImg path="itemsv2/gold.png" size={16} fallback="coin" /></div>
      <div className="pills">
        {BUDGETS.map((b) => <button key={b} className={b === budget ? "on" : ""} onClick={() => setBudget(b)}>{b === Infinity ? "Be ribos" : b === 0 ? "Nieko" : b}</button>)}
      </div>
      {noPrices && <p className="warn">Nepavyko gauti rinkos kainų – įranga nesiūloma.</p>}

      <div className="result">
        <div><small>Efektyvumas</small><b className="pos">{gain >= 0 ? "+" : ""}{fmt(gain, 0)}%</b></div>
        <div><small>Įranga kainuos</small><b>{money(plan.gearCost)}</b></div>
        <div><small>Reset</small><b>{refund} tšk. · {money(resetCost)}</b></div>
      </div>
      <CombatChips vals={plan.vals} />

      <div className="sect">Įranga <small>pirkimo sąrašas</small></div>
      <div className="shop">
        {changed.length === 0 && <p className="blurb">Su šiuo biudžetu geresnių pirkinių nėra.</p>}
        {changed.map((s) => {
          const g = plan.gear[s]; const t = g.code ? tierOf(s, g.code) : -1;
          return (
            <div key={s} className={"row t" + t}>
              <GameImg path={itemPath(s, g.code)} size={38} />
              <div><b>{SLOT_LABEL[s]}: {g.code ? TIER_LABEL[t] : "nenaudoti"}</b>
                <small>{g.code ?? ""} · {Object.entries(g.stats).map(([k, v]) => `${SKILL[k as keyof typeof SKILL].name} ~${fmt(v, 0)}`).join(", ")}</small></div>
              <span className="price">{g.owned ? "turi" : money(g.price)}</span>
            </div>
          );
        })}
        <div className="row">
          <GameImg path={itemPath("ammo", plan.ammo)} size={38} />
          <div><b>Šoviniai: {plan.ammo ? AMMO_LABEL[plan.ammo] : "—"}</b>
            <small>+{AMMO.find((a) => a.code === plan.ammo)?.pct ?? 0}% atakos · {plan.ammo && prices[plan.ammo] != null ? `${money(prices[plan.ammo]!)} / vnt.` : ""}</small></div>
        </div>
      </div>
      <p className="note">Statai pirktoms prekėms – vidutinis rolas. Kainos – paskutinių rinkos sandorių mediana. Formulės ir „soft cap“ iš dalies išvestos pagal API duomenis, todėl rezultatas orientacinis.</p>
      </div>
      <div className="col">
      <div className="sect">Skill taškai <small>dabar → siūloma</small></div>
      <div className="skills">
        {SKILL_KEYS.filter((k) => plan.levels[k] || now.levels[k]).map((k) => {
          const d = plan.levels[k] - now.levels[k];
          return (
            <div key={k} className="skill">
              <div className="skill-h" style={{ color: SKILL[k].color }}>
                <Icon name={k} size={16} /><span>{SKILL[k].name}</span>
                <small>{now.levels[k]} → <b>{plan.levels[k]}</b></small>
                <em className={d > 0 ? "pos" : d < 0 ? "neg" : ""}>{d > 0 ? `+${d}` : d < 0 ? d : ""}</em>
              </div>
              <Segments k={k} level={now.levels[k]} plan={plan.levels[k]} />
            </div>
          );
        })}
      </div>

      </div>
    </div>
  );
}

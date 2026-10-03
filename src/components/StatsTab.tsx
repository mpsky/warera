import { Icon } from "./Icon";
import { Segments } from "./Segments";
import { SKILL, SLOT_LABEL, TIER_LABEL, AMMO_LABEL, fmt } from "../lib/labels";
import { SLOTS, combat, tierOf } from "../lib/model";
import { SKILL_KEYS, type Equipment, type GameConfig, type UserLite } from "../lib/types";
import type { Vals } from "../lib/model";

export const Chip = ({ k, v }: { k: string; v: string }) => <div className="chip"><small>{k}</small><b>{v}</b></div>;

export function CombatChips({ vals }: { vals: Vals }) {
  const c = combat(vals);
  return (
    <div className="chips">
      <Chip k="Žala / smūgį" v={fmt(c.perHit, 0)} />
      <Chip k="Žala / sveikatos juostą" v={fmt(c.perBar, 0)} />
      <Chip k="Pataikymas" v={`${fmt(c.hit * 100, 0)}%`} />
      <Chip k="Kritas" v={`${fmt(c.crit * 100, 0)}% · ×${fmt(1 + c.critDmg, 2)}`} />
      <Chip k="Šarvai (po cap)" v={`${fmt(c.armorEff * 100, 0)}%`} />
      <Chip k="Išsisukimas (po cap)" v={`${fmt(c.dodgeEff * 100, 0)}%`} />
    </div>
  );
}

export function StatsTab({ user, cfg, eq, vals }: { user: UserLite; cfg: GameConfig; eq: Equipment; vals: Vals }) {
  const lv = user.leveling;
  return (
    <>
      <div className="sect">Kovos rodikliai</div>
      <CombatChips vals={vals} />
      <div className="sect">Įgūdžiai <small>{lv.spentSkillPoints}/{lv.totalSkillPoints} tšk.{lv.availableSkillPoints ? ` · laisva ${lv.availableSkillPoints}` : ""}</small></div>
      {(["combat", "eco"] as const).map((g) => (
        <div key={g} className="skills">
          {SKILL_KEYS.filter((k) => SKILL[k].group === g).map((k) => {
            const s = user.skills[k]; const max = Math.max(...Object.keys(cfg.skills[k].levels).map(Number));
            return (
              <div key={k} className="skill">
                <div className="skill-h" style={{ color: SKILL[k].color }}>
                  <Icon name={k} size={16} /><b>{fmt(s?.total, 0)}</b><span>{SKILL[k].name}</span><small>{s?.level ?? 0}/{max}</small>
                </div>
                <Segments k={k} level={s?.level ?? 0} max={max} />
              </div>
            );
          })}
        </div>
      ))}
      <div className="sect">Įranga</div>
      <div className="gear">
        {SLOTS.map((slot) => {
          const it = eq[slot]; const t = it ? Math.max(0, tierOf(slot, it.code)) : -1;
          return (
            <div key={slot} className={"cell t" + t} title={SLOT_LABEL[slot]}>
              <Icon name={slot} size={30} />
              <b>{it ? Object.entries(it.skills ?? {}).map(([k, v]) => `+${fmt(v, 0)}`).join(" ") : "—"}</b>
              <small>{it ? TIER_LABEL[t] : SLOT_LABEL[slot]}</small>
              {it && <div className="dur"><i style={{ width: `${(it.state / it.maxState) * 100}%` }} /></div>}
            </div>
          );
        })}
        <div className="cell t2" title="Šoviniai"><Icon name="ammo" size={30} /><b>{eq.ammo ? AMMO_LABEL[eq.ammo] ?? eq.ammo : "—"}</b><small>Šoviniai</small></div>
      </div>
    </>
  );
}

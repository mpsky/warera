import { useEffect, useMemo, useState } from "react";
import { GameImg, Icon, itemPath } from "./Icon";
import { Segments } from "./Segments";
import { AMMO_LABEL, SKILL, SLOT_LABEL, TIER_LABEL, fmt, money } from "../lib/labels";
import { PROFILES, PROFILE_TOP, tierOf, type Levels, type Prices, type ProfileId, type Vals } from "../lib/model";
import { currentState, planFor, pointsToRefund } from "../lib/optimizer";
import { SKILL_KEYS, type Equipment, type GameConfig, type UserLite } from "../lib/types";
import { compare, loadTop, metricsFor, rankByFit, type Metric, type TopFile, type TopPlayer } from "../lib/top";

const sign = (n: number) => (n > 0 ? "+" : "");
const hasGear = (p: TopPlayer) => Object.values(p.gear).some(Boolean);

function Metrics({ metrics, a, b }: { metrics: Metric[]; a: Vals; b: Vals }) {
  return (
    <table className="cmp"><thead><tr><th></th><th>Dabar</th><th>Po</th><th>Skirt.</th><th>%</th></tr></thead><tbody>
      {metrics.map((m) => {
        const x = m.get(a), y = m.get(b), d = y - x, pc = x ? (d / x) * 100 : 0, cls = Math.abs(pc) < 0.5 ? "" : d > 0 ? "pos" : "neg";
        return (
          <tr key={m.key}><td>{m.label}</td><td>{fmt(x, m.digits)}{m.unit}</td><td>{fmt(y, m.digits)}{m.unit}</td>
            <td className={cls}>{sign(d)}{fmt(d, m.digits)}{m.unit}</td><td className={cls}>{x ? `${sign(pc)}${fmt(pc, 0)}%` : "—"}</td></tr>
        );
      })}
    </tbody></table>
  );
}

/** Tik pasikeitę skill'ai: dabar → siūloma. */
function Changes({ now, next, theirs }: { now: Levels; next: Levels; theirs?: Levels }) {
  const ks = SKILL_KEYS.filter((k) => now[k] !== next[k]);
  if (!ks.length) return <p className="blurb">Skill’ų keisti nereikia.</p>;
  return (
    <div className="skills">
      {ks.map((k) => {
        const d = next[k] - now[k];
        return (
          <div key={k} className="skill">
            <div className="skill-h" style={{ color: SKILL[k].color }}>
              <Icon name={k} size={16} /><span>{SKILL[k].name}</span>
              <small>{now[k]} → <b>{next[k]}</b>{theirs && theirs[k] !== next[k] ? ` (jų ${theirs[k]})` : ""}</small>
              <em className={d > 0 ? "pos" : "neg"}>{sign(d)}{d}</em>
            </div>
            <Segments k={k} level={now[k]} plan={next[k]} />
          </div>
        );
      })}
    </div>
  );
}

export function BuildTab({ user, cfg, eq, prices }: { user: UserLite; cfg: GameConfig; eq: Equipment; prices: Prices }) {
  const [pid, setPid] = useState<ProfileId>("damage");
  const [file, setFile] = useState<TopFile | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const profile = PROFILES[pid];
  const metrics = metricsFor(pid);
  const resetPer = cfg.user?.resetSkillsCostPerPoint ?? 0;

  useEffect(() => { setFile(null); setErr(""); setSel(null); loadTop(PROFILE_TOP[pid]).then(setFile).catch((e) => setErr(e.message)); }, [pid]);

  // 1) tinkamiausias build'as pagal jūsų statistiką (modelis, jūsų dabartinė įranga)
  const now = useMemo(() => currentState(user, cfg, eq, profile), [user, cfg, eq, profile]);
  const model = useMemo(() => planFor(user, cfg, eq, profile, {}, 0, false, false), [user, cfg, eq, profile]);
  const modelGain = (Math.exp(model.score - now.score) - 1) * 100;
  const modelRefund = pointsToRefund(cfg.skills, now.levels, model.levels);

  // 2) tinkamiausias iš top 100 + top 10 sąrašas
  const fits = useMemo(() => (file ? rankByFit(file.players, user, cfg, eq, pid) : []), [file, user, cfg, eq, pid]);
  const best = useMemo(() => fits.reduce<(typeof fits)[number] | null>((b, f) => (!b || f.gain > b.gain ? f : b), null), [fits]);
  const top10 = fits.slice(0, 10);
  const bestInTop10 = !!best && top10.some((f) => f.p.id === best.p.id);
  const chosen = (sel && fits.find((f) => f.p.id === sel)?.p) || best?.p || null;
  const cmp = useMemo(() => (chosen ? compare(user, cfg, eq, chosen, prices, true) : null), [chosen, user, cfg, eq, prices]);
  const chosenGain = chosen ? fits.find((f) => f.p.id === chosen.id)?.gain ?? 0 : 0;
  const m0 = metrics[0];

  const Row = ({ f, star }: { f: (typeof fits)[number]; star?: boolean }) => (
    <button className={"toprow" + (chosen?.id === f.p.id ? " on" : "")} onClick={() => setSel(f.p.id)}>
      <span className="badge">#{f.p.rank}</span>
      {f.p.avatarUrl ? <img className="gimg av-s" src={f.p.avatarUrl} alt="" width={28} height={28} loading="lazy" /> : <Icon name="user" size={22} />}
      <span className="nm"><b>{star && "★ "}{f.p.username}</b><small>L{f.p.level}{!hasGear(f.p) ? " · be įrangos" : ""}</small></span>
      <span className={"fit " + (f.gain >= 0 ? "pos" : "neg")}>{sign(f.gain)}{fmt(f.gain, 0)}%</span>
      {best?.p.id === f.p.id && <span className="best">Tinkamiausias</span>}
    </button>
  );

  return (
    <>
      <div className="tabs sub" role="tablist">
        {(Object.values(PROFILES)).map((p) => (
          <button key={p.id} role="tab" aria-selected={p.id === pid} className={p.id === pid ? "on" : ""} onClick={() => setPid(p.id)}>{p.name}</button>
        ))}
      </div>
      <p className="blurb">{profile.blurb}. Lygis {user.leveling.level}, {user.leveling.totalSkillPoints} skill taškų.</p>

      <div className="cols">
        <div className="col">
          <div className="sect"><Icon name="star" size={14} /> Tinkamiausias pagal jūsų statistiką</div>
          <div className="result">
            <div><small>Efektyvumas</small><b className={modelGain >= 0 ? "pos" : "neg"}>{sign(modelGain)}{fmt(modelGain, 0)}%</b></div>
            <div><small>Perskirstyti</small><b>{modelRefund} tšk.</b></div>
            <div><small>Reset kaina</small><b>{money(modelRefund * resetPer)}</b></div>
          </div>
          <Metrics metrics={metrics} a={now.vals} b={model.vals} />
          <div className="sect">Ką pakeisti</div>
          <Changes now={now.levels} next={model.levels} />
          <p className="note">Skaičiuota pagal jūsų skill’us, dabartinę įrangą ir API duomenis. Modelis orientacinis.</p>
        </div>

        <div className="col">
          <div className="sect"><Icon name="attack" size={14} /> Tinkamiausias iš TOP <small>{file ? `top ${file.players.length} · ${file.label}` : ""}</small></div>
          {err && <p className="warn">{err}</p>}
          {!file && !err && <p className="blurb">Kraunama…</p>}
          {file && best && chosen && cmp && (
            <>
              {PROFILE_TOP[pid] === "loot" && <p className="note" style={{ marginTop: 0 }}>Grobiui API neturi reitingo – naudojamos atidarytos dėžės.</p>}
              <div className="top10">
                {!bestInTop10 && <Row f={best} star />}
                {top10.map((f) => <Row key={f.p.id} f={f} />)}
              </div>
              <div className="sect">Palyginimas su {chosen.username}{best.p.id === chosen.id ? " ★" : ""}</div>
              <div className="result">
                <div><small>Efektyvumas</small><b className={chosenGain >= 0 ? "pos" : "neg"}>{sign(chosenGain)}{fmt(chosenGain, 0)}%</b></div>
                <div><small>Jų lygis / taškai</small><b>{chosen.level} / {chosen.totalSkillPoints}</b></div>
                <div><small>Reset</small><b>{cmp.refund} tšk. · {money(cmp.refund * resetPer)}</b></div>
              </div>
              {!cmp.exact && <p className="warn">Jų build’ui trūksta {cmp.missing} tšk. – lygiai sumažinti proporcingai.</p>}
              <Metrics metrics={metrics} a={cmp.valsNow} b={cmp.valsNext} />
              <div className="sect">Ką pakeisti</div>
              <Changes now={cmp.levelsNow} next={cmp.levelsNext} theirs={chosen.levels} />
              <div className="sect">Jų įranga {hasGear(chosen) && m0 && <small>papildomai {sign(m0.get(cmp.valsNextGear) / (m0.get(cmp.valsNext) || 1) * 100 - 100)}{fmt(m0.get(cmp.valsNextGear) / (m0.get(cmp.valsNext) || 1) * 100 - 100, 0)}% ({m0.label.toLowerCase()})</small>}</div>
              {!hasGear(chosen) ? <p className="blurb">Šis žaidėjas šiuo metu nenaudoja įrangos.</p> : (
                <div className="shop">
                  {cmp.gear.filter((g) => g.change).map((g) => {
                    const t = g.next.code ? tierOf(g.slot, g.next.code) : -1, t0 = g.now.code ? tierOf(g.slot, g.now.code) : -1;
                    return (
                      <div key={g.slot} className={"row t" + t}>
                        <GameImg path={itemPath(g.slot, g.next.code)} size={34} />
                        <div><b>{SLOT_LABEL[g.slot]}: {g.now.code ? TIER_LABEL[t0] : "—"} → {g.next.code ? TIER_LABEL[t] : "—"}</b></div>
                        <span className="price">{g.next.owned ? "turite" : money(g.next.price)}</span>
                      </div>
                    );
                  })}
                  {cmp.gear.every((g) => !g.change) && <p className="blurb">Įranga jau tokia pati.</p>}
                  {cmp.ammo && cmp.ammo !== eq.ammo && <div className="row"><GameImg path={itemPath("ammo", cmp.ammo)} size={34} /><div><b>Šoviniai: {AMMO_LABEL[cmp.ammo] ?? cmp.ammo}</b></div></div>}
                  {cmp.gearCost > 0 && <p className="note">Įrangos kaina: {money(cmp.gearCost)} (rinkos sandorių mediana, vidutinis rolas).</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

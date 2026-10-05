import { useEffect, useMemo, useState } from "react";
import { GameImg, Icon, itemPath } from "./Icon";
import { Segments } from "./Segments";
import { AMMO_LABEL, SKILL, SLOT_LABEL, TIER_LABEL, fmt, money } from "../lib/labels";
import { SKILL_KEYS, type Equipment, type GameConfig, type UserLite } from "../lib/types";
import { tierOf, type Prices } from "../lib/model";
import { CATEGORY_LABEL, compare, loadTop, metaBuild, metricsFor, type Category, type TopFile, type TopPlayer } from "../lib/top";

const CATS: Category[] = ["attack", "loot", "economy"];
const sign = (n: number) => (n > 0 ? "+" : "");

export function TopTab({ user, cfg, eq, prices }: { user: UserLite; cfg: GameConfig; eq: Equipment; prices: Prices }) {
  const [cat, setCat] = useState<Category>("attack");
  const [file, setFile] = useState<TopFile | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string>("meta");
  const [applyGear, setApplyGear] = useState(true);

  useEffect(() => { setFile(null); setErr(""); setSel("meta"); loadTop(cat).then(setFile).catch((e) => setErr(e.message)); }, [cat]);
  const meta = useMemo(() => (file ? metaBuild(file.players) : null), [file]);
  const top10 = file?.players.slice(0, 10) ?? [];
  const chosen: TopPlayer | null = !file ? null : sel === "meta" ? meta : file.players.find((p) => p.id === sel) ?? meta;
  const cmp = useMemo(() => (chosen ? compare(user, cfg, eq, chosen, prices, applyGear) : null), [chosen, user, cfg, eq, prices, applyGear]);
  const metrics = metricsFor(cat);

  return (
    <>
      <div className="tabs sub" role="tablist">
        {CATS.map((c) => <button key={c} role="tab" aria-selected={c === cat} className={c === cat ? "on" : ""} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
      </div>
      {err && <p className="warn">{err}</p>}
      {!file && !err && <p className="blurb">Kraunama…</p>}
      {file && meta && chosen && cmp && (
        <>
          <p className="blurb">Top 100 pagal „{file.label}“. Atnaujinta {new Date(file.updatedAt).toLocaleDateString("lt-LT")}.
            {cat === "loot" && " Grobiui API neturi atskiro reitingo – naudojamos atidarytos dėžės."}</p>

          <div className="cols">
          <div className="col col-sticky">
          <div className="sect">Top 10 buildų <small>pasirinkite lyginimui</small></div>
          <div className="top10">
            <Row p={meta} active={sel === "meta"} onClick={() => setSel("meta")} badge="Ø" />
            {top10.map((p) => <Row key={p.id} p={p} active={sel === p.id} onClick={() => setSel(p.id)} badge={`#${p.rank}`} value={`${fmt(p.value, 0)}`} />)}
          </div>

          </div>
          <div className="col">
          <div className="sect">Palyginimas su {chosen.username}</div>
          <div className="result">
            <div><small>Jų lygis / taškai</small><b>{chosen.level} / {chosen.totalSkillPoints}</b></div>
            <div><small>Jūsų taškai</small><b>{cmp.budget}</b></div>
            <div><small>Reset</small><b>{cmp.refund} tšk. · {money(cmp.refund * (cfg.user?.resetSkillsCostPerPoint ?? 0))}</b></div>
          </div>
          {!cmp.exact && <p className="warn">Jų build’ui trūksta {cmp.missing} tšk., todėl lygiai sumažinti proporcingai jūsų biudžetui.</p>}

          <div className="sect">Rodikliai <small>dabar → po keitimų</small></div>
          <table className="cmp"><tbody>
            {metrics.map((m) => {
              const a = m.get(cmp.valsNow), b = m.get(cmp.valsNext), d = b - a, pc = a ? (d / a) * 100 : 0;
              return (
                <tr key={m.key}>
                  <td>{m.label}</td><td>{fmt(a, m.digits)}{m.unit}</td><td>{fmt(b, m.digits)}{m.unit}</td>
                  <td className={Math.abs(pc) < 0.5 ? "" : d > 0 ? "pos" : "neg"}>{sign(d)}{fmt(d, m.digits)}{m.unit}</td>
                  <td className={Math.abs(pc) < 0.5 ? "" : d > 0 ? "pos" : "neg"}>{a ? `${sign(pc)}${fmt(pc, 0)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody></table>

          <div className="sect">Ką pakeisti skill’uose</div>
          <div className="skills">
            {SKILL_KEYS.filter((k) => cmp.levelsNow[k] || cmp.levelsNext[k] || chosen.levels[k]).map((k) => {
              const d = cmp.levelsNext[k] - cmp.levelsNow[k];
              return (
                <div key={k} className="skill">
                  <div className="skill-h" style={{ color: SKILL[k].color }}>
                    <Icon name={k} size={16} /><span>{SKILL[k].name}</span>
                    <small>{cmp.levelsNow[k]} → <b>{cmp.levelsNext[k]}</b>{chosen.levels[k] !== cmp.levelsNext[k] ? ` (jų ${chosen.levels[k]})` : ""}</small>
                    <em className={d > 0 ? "pos" : d < 0 ? "neg" : ""}>{d ? `${sign(d)}${d}` : ""}</em>
                  </div>
                  <Segments k={k} level={cmp.levelsNow[k]} plan={cmp.levelsNext[k]} />
                </div>
              );
            })}
          </div>

          <div className="sect">Įranga <small>jų vs jūsų</small>
            <button className={"mini-btn" + (applyGear ? " on" : "")} onClick={() => setApplyGear(!applyGear)}>{applyGear ? "✓ lyginti su jų įranga" : "tik skill’ai"}</button></div>
          {!hasGear(chosen) && <p className="blurb">Šis žaidėjas šiuo metu nenaudoja įrangos (API ją rodo tuščią), todėl įranga nelyginama.</p>}
          <div className="shop">
            {cmp.gear.map((g) => {
              const t = g.next.code ? tierOf(g.slot, g.next.code) : -1, t0 = g.now.code ? tierOf(g.slot, g.now.code) : -1;
              return (
                <div key={g.slot} className={"row" + (g.change ? " t" + t : "")}>
                  <GameImg path={itemPath(g.slot, g.next.code)} size={34} />
                  <div><b>{SLOT_LABEL[g.slot]}: {g.now.code ? TIER_LABEL[t0] : "—"} → {g.next.code ? TIER_LABEL[t] : "—"}</b>
                    <small>{g.change ? (g.next.owned ? "turite" : "reikia pirkti") : "nekeisti"}</small></div>
                  <span className="price">{g.change && !g.next.owned ? money(g.next.price) : ""}</span>
                </div>
              );
            })}
            <div className="row"><GameImg path={itemPath("ammo", cmp.ammo)} size={34} />
              <div><b>Šoviniai: {cmp.ammo ? AMMO_LABEL[cmp.ammo] ?? cmp.ammo : "—"}</b></div></div>
          </div>
          <p className="note">Įranga skaičiuojama su vidutiniu rolu; „po cap“ rodikliai pritaikyti žaidimo soft cap taisyklei. Kainos – rinkos sandorių mediana, bendra suma: {money(cmp.gearCost)}.</p>
          </div>
          </div>
        </>
      )}
    </>
  );
}

const hasGear = (p: TopPlayer) => Object.values(p.gear).some(Boolean);

function Row({ p, active, onClick, badge, value }: { p: TopPlayer; active: boolean; onClick: () => void; badge: string; value?: string }) {
  return (
    <button className={"toprow" + (active ? " on" : "")} onClick={onClick}>
      <span className="badge">{badge}</span>
      {p.avatarUrl ? <img className="gimg av-s" src={p.avatarUrl} alt="" width={28} height={28} loading="lazy" /> : <Icon name="user" size={22} />}
      <span className="nm"><b>{p.username}</b><small>L{p.level}{value ? ` · ${value}` : ""}{p.id !== "meta" && !hasGear(p) ? " · be įrangos" : ""}</small></span>
      <span className="dots">{(["attack", "criticalChance", "armor", "health", "production", "companies"] as const).map((k) => <i key={k} style={{ height: 4 + p.levels[k] * 2.4, background: SKILL[k].color }} title={SKILL[k].name} />)}</span>
    </button>
  );
}

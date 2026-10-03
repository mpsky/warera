import { useState } from "react";
import { findUser, getConfig, getEquipment } from "./api/client";
import type { Equipment, GameConfig, UserLite } from "./lib/types";
import { SKILL_KEYS } from "./lib/types";
import { Card, Stat, Bar } from "./components/Card";
import { BuildPlanner } from "./components/BuildPlanner";
import { RANK_LABEL, SKILL_LABEL, SLOTS, fmt } from "./lib/labels";

interface Data { user: UserLite; eq: Equipment; cfg: GameConfig }

export default function App() {
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get("u") ?? "");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr("");
    try {
      const [cfg, user] = await Promise.all([getConfig(), findUser(q)]);
      const eq = await getEquipment(user._id);
      setData({ user, eq, cfg });
      history.replaceState(null, "", `?u=${encodeURIComponent(user.username)}`);
    } catch (x) { setErr((x as Error).message); setData(null); }
    setBusy(false);
  }

  return (
    <main className="app">
      <header className="hero">
        <h1>⚔ WarEra <em>Build Planner</em></h1>
        <p>Įveskite žaidėjo nicką – gausite profilį ir optimalų skill build’ą.</p>
        <form onSubmit={go} className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Žaidėjo nickas arba ID" autoCapitalize="off" autoCorrect="off" enterKeyHint="search" />
          <button disabled={busy}>{busy ? "…" : "Ieškoti"}</button>
        </form>
        {err && <div className="err" role="alert">{err}</div>}
      </header>
      {data && <Profile {...data} />}
    </main>
  );
}

function Profile({ user, eq, cfg }: Data) {
  const lv = user.leveling;
  const att = user.skills.attack;
  const lastReset = user.dates?.lastSkillsResetAt;
  return (
    <div className="grid">
      <Card title={user.username} icon="🎖️">
        <div className="who">
          {user.avatarUrl && <img src={user.avatarUrl} alt="" width={72} height={72} />}
          <div>
            <Stat k="Lygis" v={lv.level} /><Stat k="Šalis" v={user.country} />
            <Stat k="Karinis rangas" v={user.militaryRank} />
            <Stat k="Premium" v={user.infos?.isPremium ? "taip" : "ne"} />
            <Stat k="Aktyvus" v={user.isActive ? "taip" : "ne"} />
          </div>
        </div>
        {user.infos?.description && <p className="desc">{user.infos.description}</p>}
      </Card>

      <Card title="Lygis ir taškai" icon="⭐">
        <Stat k="XP" v={fmt(lv.totalXp, 0)} />
        <Stat k="Skill taškai (viso)" v={lv.totalSkillPoints} />
        <Stat k="Išleista / laisva" v={`${lv.spentSkillPoints} / ${lv.availableSkillPoints}`} />
        <Stat k="Nemokami reset’ai" v={lv.freeReset} />
        <Stat k="Paskutinis reset" v={lastReset ? new Date(lastReset).toLocaleDateString("lt-LT") : "—"} />
        <Stat k="Padaryta žala" v={fmt(user.stats?.damagesCount, 0)} />
      </Card>

      <Card title="Skills" icon="📈" wide>
        <div className="skills">
          {SKILL_KEYS.map((k) => {
            const s = user.skills[k]; const max = Math.max(...Object.keys(cfg.skills[k].levels).map(Number));
            return (
              <div key={k} className="skill">
                <div className="skill-h"><span>{SKILL_LABEL[k][0]} {SKILL_LABEL[k][1]}</span><b>{s?.level ?? 0}/{max}</b></div>
                <Bar value={s?.level ?? 0} max={max} />
                <small>Iš viso: {fmt(s?.total)}{typeof s?.value === "number" ? ` (lygis: ${fmt(s.value)})` : ""}</small>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Įranga" icon="🎒">
        <div className="slots">
          {SLOTS.map(([slot, ico, name]) => {
            const it = eq[slot];
            return (
              <div key={slot} className={"slot" + (it ? "" : " empty")}>
                <span className="ico">{ico}</span>
                <div><b>{name}</b>
                  {it ? <><small>{it.code} · {Math.round(it.state)}/{it.maxState}</small>
                    <Bar value={it.state} max={it.maxState} tone="green" />
                    <small>{Object.entries(it.skills ?? {}).map(([k, v]) => `${k} +${fmt(v)}`).join(", ")}</small></>
                    : <small>tuščia</small>}
                </div>
              </div>
            );
          })}
          <div className="slot"><span className="ico">🧨</span><div><b>Amunicija</b><small>{eq.ammo ?? "nėra"}</small></div></div>
        </div>
      </Card>

      <Card title="Bonusai" icon="✨">
        <Stat k="Ammo bonusas" v={`${fmt(att?.ammoPercent)}%`} />
        <Stat k="Buffai" v={`${fmt(att?.buffsPercent)}%`} />
        <Stat k="Debuffai" v={`${fmt(att?.debuffsPercent)}%`} />
        <Stat k="Karinio ranko bonusas" v={`${fmt(att?.militaryRankPercent)}%`} />
        <Stat k="Ginklo attack" v={fmt(att?.weapon as number)} />
      </Card>

      <Card title="Reitingai" icon="🏆" wide>
        <div className="ranks">
          {Object.entries(user.rankings ?? {}).map(([k, r]) => (
            <div key={k} className="rank"><small>{RANK_LABEL[k] ?? k}</small><b>#{r.rank}</b><span className="tier">{r.tier}</span><small>{fmt(r.value, 0)}</small></div>
          ))}
        </div>
      </Card>

      <BuildPlanner user={user} cfg={cfg} />
    </div>
  );
}

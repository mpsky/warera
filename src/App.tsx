import { useMemo, useState } from "react";
import { findUser, getConfig, getCountry, getEquipment, getPrices } from "./api/client";
import type { Equipment, GameConfig, UserLite } from "./lib/types";
import { Icon } from "./components/Icon";
import { PlayerStrip } from "./components/PlayerStrip";
import { StatsTab } from "./components/StatsTab";
import { BuildTab } from "./components/BuildTab";
import { PROFILES, type Prices } from "./lib/model";
import { currentState } from "./lib/optimizer";

interface Data { user: UserLite; eq: Equipment; cfg: GameConfig; country: { name: string; code: string }; prices: Prices }

export default function App() {
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get("u") ?? "");
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"stats" | "build">("build");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr("");
    try {
      const [cfg, user, prices] = await Promise.all([getConfig(), findUser(q), getPrices()]);
      const [eq, country] = await Promise.all([getEquipment(user._id), getCountry(user.country)]);
      setData({ user, eq, cfg, country, prices });
      history.replaceState(null, "", `?u=${encodeURIComponent(user.username)}`);
    } catch (x) { setErr((x as Error).message); setData(null); }
    setBusy(false);
  }

  return (
    <main className="app">
      <header className="top">
        <h1>War Era <em>Build</em></h1>
        <form onSubmit={go} className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Žaidėjo nickas arba ID" autoCapitalize="off" autoCorrect="off" enterKeyHint="search" />
          <button disabled={busy} aria-label="Ieškoti">{busy ? "…" : <Icon name="search" size={20} />}</button>
        </form>
      </header>
      {err && <div className="err" role="alert">{err}</div>}
      {data && <Profile {...data} tab={tab} setTab={setTab} />}
      {!data && !err && <p className="empty">Įveskite nicką – gausite status ir optimalų build’ą su įranga.</p>}
    </main>
  );
}

function Profile({ user, eq, cfg, country, prices, tab, setTab }: Data & { tab: "stats" | "build"; setTab: (t: "stats" | "build") => void }) {
  const vals = useMemo(() => currentState(user, cfg, eq, PROFILES.damage).vals, [user, cfg, eq]);
  return (
    <>
      <PlayerStrip user={user} country={country} />
      <nav className="tabs main" role="tablist">
        <button role="tab" aria-selected={tab === "stats"} className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}><Icon name="user" size={18} />Statai</button>
        <button role="tab" aria-selected={tab === "build"} className={tab === "build" ? "on" : ""} onClick={() => setTab("build")}><Icon name="star" size={18} />Build’as</button>
      </nav>
      <section className="panel">
        {tab === "stats" ? <StatsTab user={user} cfg={cfg} eq={eq} vals={vals} /> : <BuildTab user={user} cfg={cfg} eq={eq} prices={prices} />}
      </section>
    </>
  );
}

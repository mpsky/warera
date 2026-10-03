import type { CSSProperties } from "react";
import { GameImg, Icon } from "./Icon";
import type { UserLite } from "../lib/types";
import { fmt } from "../lib/labels";

const Bar = ({ k, cur, max, c }: { k: string; cur?: number; max: number; c: string }) => (
  <div className="mini" style={{ "--c": c } as CSSProperties} title={k}>
    <Icon name={k} size={13} /><div><i style={{ width: `${Math.min(100, ((cur ?? max) / Math.max(1, max)) * 100)}%` }} /></div>
    <b>{fmt(cur ?? max, 0)}/{fmt(max, 0)}</b>
  </div>
);

/** Siaura žaidėjo juosta (kaip žaidimo viršutinė juosta). */
export function PlayerStrip({ user, country }: { user: UserLite; country: { name: string; code: string } }) {
  const s = user.skills;
  return (
    <div className="strip">
      <div className="av">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <Icon name="user" size={26} />}
        <span className="lv">{user.leveling.level}</span>
      </div>
      <div className="who">
        <b className="nick">{user.username}{user.infos?.isPremium && <em title="Premium"> ★</em>}</b>
        <small className="sub">
          {country.code && <GameImg path={`flags/${country.code}.svg`} size={16} fallback="user" />}{country.name}
          · rangas {user.militaryRank} · žala {fmt(user.stats?.damagesCount, 0)}
        </small>
      </div>
      <div className="bars">
        <Bar k="health" cur={s.health?.currentBarValue} max={s.health?.total ?? 0} c="#6fe0a0" />
        <Bar k="energy" cur={s.energy?.currentBarValue} max={s.energy?.total ?? 0} c="#7f9cff" />
        <Bar k="hunger" cur={s.hunger?.currentBarValue} max={s.hunger?.total ?? 0} c="#f08a7a" />
      </div>
    </div>
  );
}

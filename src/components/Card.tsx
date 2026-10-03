import type { ReactNode } from "react";
export function Card({ title, icon, children, wide }: { title: string; icon?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={"card" + (wide ? " wide" : "")}>
      <header className="card-h"><span className="ico" aria-hidden>{icon}</span><h2>{title}</h2></header>
      <div className="card-b">{children}</div>
    </section>
  );
}
export const Stat = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="stat"><span>{k}</span><b>{v}</b></div>
);
export const Bar = ({ value, max, tone = "gold" }: { value: number; max: number; tone?: string }) => (
  <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
    <i className={tone} style={{ width: `${Math.min(100, (value / Math.max(1, max)) * 100)}%` }} />
  </div>
);

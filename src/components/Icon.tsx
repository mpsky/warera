// Savos piešimo ikonos (žaidimo meno failų neturime) – kontūrinės, 24x24.
const P: Record<string, string> = {
  attack: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
  precision: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 2v6M12 16v6M2 12h6M16 12h6",
  criticalChance: "M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19",
  criticalDamages: "M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12 21 3M17 3h4v4",
  armor: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  dodge: "M14 3.5a1.8 1.8 0 1 0 0 .01M11 21l2-6-3-3 2-5 4 3 3 1M10 12l-4 1M13 15l4 5",
  health: "M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z",
  energy: "M13 2 4 14h7l-1 8 9-12h-7z",
  hunger: "M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2.5 2-2.5 7 0 9v9",
  production: "M4 20 14 10M13 5c4-1 7 1 8 5-3-2-5-2-8-1zM12 8l4 4",
  entrepreneurship: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c1 1 1 2 1 3h6c0-1 0-2 1-3A6 6 0 0 0 12 3z",
  companies: "M3 21V9l6 4V9l6 4V5h6v16zM7 17h2M12 17h2M17 17h2",
  management: "M12 4.5a3.5 3.5 0 1 0 0 .01M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5",
  lootChance: "M4 10h16v10H4zM4 10V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M12 13v3",
  weapon: "M3 10h14l3 2v3h-6v-2H9l-1 5H5l1-5H3z",
  helmet: "M4 16a8 8 0 0 1 16 0v2H4zM4 18h16M12 8v3",
  chest: "M8 3 4 7v14h16V7l-4-4-2 2h-4zM12 5v16",
  gloves: "M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 11a1.5 1.5 0 0 1 3 0v4c0 4-3 6-6 6h-1c-3 0-5-2-6-5l-1-3a1.5 1.5 0 0 1 3-1l1 2",
  pants: "M7 3h10l1 18h-5l-1-12-1 12H6z",
  boots: "M8 3h6v9l6 3v5H5v-4l3-1z",
  ammo: "M9 21V9a3 3 0 0 1 6 0v12zM9 17h6",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 10H14a2 2 0 0 1 0 4H9.5",
  user: "M12 4.5a3.5 3.5 0 1 0 0 .01M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  reset: "M4 12a8 8 0 1 0 3-6.2M4 4v5h5",
  check: "M5 12l5 5 9-10",
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? P.star} />
    </svg>
  );
}

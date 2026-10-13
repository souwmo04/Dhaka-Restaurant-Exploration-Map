import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Eyebrow, Glow, Grain, Grid, Words } from "../components/kit";
import { C, pop, prog, sans } from "../theme";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke={C.tomato} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const TILES = [
  {
    title: "Open data",
    sub: "OpenStreetMap + Overture Maps. Nothing scraped.",
    icon: <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  },
  {
    title: "Private by default",
    sub: "Row-level security on every visit and note.",
    icon: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
  {
    title: "No sign-up needed",
    sub: "Guest progress moves into your account later.",
    icon: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 11l2 2 4-4" />
      </>
    ),
  },
  {
    title: "Accessible",
    sub: "Keyboard, screen readers, reduced motion.",
    icon: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </>
    ),
  },
  {
    title: "Fast everywhere",
    sub: "Cached at the edge. Maps that never leave the area.",
    icon: <path d="M13 2L3 14h9l-1 8 10-12h-9z" />,
  },
  {
    title: "Tested",
    sub: "80 end-to-end checks + database security tests.",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </>
    ),
  },
];

const STACK = ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "MapLibre GL", "Supabase", "PostGIS", "Remotion", "Netlify"];

/** Under the hood: six tiles pop in, the stack scrolls by. */
export function Tech() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marquee = prog(frame, 70, 20);
  const shift = -(frame * 2.6) % 1700;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden", fontFamily: sans }}>
      <Grid opacity={0.07} />
      <Glow x={260} y={180} size={800} opacity={0.2} />
      <div style={{ position: "absolute", left: 150, top: 96 }}>
        <Eyebrow text="Under the hood" start={2} />
        <div style={{ height: 20 }} />
        <Words text="Built properly." start={6} stagger={5} size={100} color={C.surface} accent={["properly."]} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 380, width: 1620, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 28 }}>
        {TILES.map((t, i) => {
          const s = pop(frame, fps, 20 + i * 6, { damping: 13, stiffness: 150 });
          return (
            <div
              key={t.title}
              style={{
                height: 220,
                padding: "34px 36px",
                boxSizing: "border-box",
                borderRadius: 30,
                background: "rgba(255,253,249,0.06)",
                border: "1px solid rgba(255,253,249,0.12)",
                transform: `translateY(${(1 - s) * 80}px) scale(${0.85 + s * 0.15}) rotate(${(1 - s) * (i % 2 ? 3 : -3)}deg)`,
                opacity: Math.min(1, s * 1.3),
              }}
            >
              <Icon>{t.icon}</Icon>
              <div style={{ fontSize: 36, fontWeight: 700, color: C.surface, marginTop: 18 }}>{t.title}</div>
              <div style={{ fontSize: 24, lineHeight: 1.4, color: "rgba(255,253,249,0.65)", marginTop: 8 }}>{t.sub}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 920, height: 90, overflow: "hidden", opacity: marquee, borderTop: "1px solid rgba(255,253,249,0.12)" }}>
        <div style={{ display: "flex", gap: 70, whiteSpace: "nowrap", transform: `translateX(${shift}px)`, paddingTop: 28 }}>
          {[...STACK, ...STACK, ...STACK].map((s, i) => (
            <span key={i} style={{ fontSize: 34, fontWeight: 600, color: i % 2 ? "rgba(255,253,249,0.55)" : C.surface, display: "flex", alignItems: "center", gap: 70 }}>
              {s}
              <span style={{ color: C.tomato }}>✦</span>
            </span>
          ))}
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
}

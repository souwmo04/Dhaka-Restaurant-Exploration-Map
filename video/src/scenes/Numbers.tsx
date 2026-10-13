import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Count, Eyebrow, Grain, Grid, Words } from "../components/kit";
import { C, display, ease, pop, prog, sans } from "../theme";

const STATS = [
  { to: 3350, label: "restaurants tracked" },
  { to: 10, label: "explorable maps" },
  { to: 7, label: "neighbourhoods" },
];

/** Kinetic stats: three counters slam in, then the hook line. */
export function Numbers() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <Grid color={C.ink} opacity={0.05} />
      <div style={{ position: "absolute", left: 150, top: 150 }}>
        <Eyebrow text="Dhaka, mapped" start={4} />
      </div>
      <div style={{ position: "absolute", left: 150, right: 150, top: 290, display: "flex", justifyContent: "space-between" }}>
        {STATS.map((s, i) => {
          const d = 10 + i * 12;
          const t = pop(frame, fps, d, { damping: 13, stiffness: 140 });
          const rule = prog(frame, d + 14, 26, ease.inOut);
          return (
            <div key={s.label} style={{ transform: `translateY(${(1 - t) * 120}px)`, opacity: Math.min(1, t * 1.4) }}>
              <div style={{ fontFamily: display, fontSize: 230, fontWeight: 600, lineHeight: 0.9, letterSpacing: "-0.04em", color: i === 0 ? C.tomatoDeep : C.ink }}>
                <Count to={s.to} start={d} duration={i === 0 ? 50 : 30} />
              </div>
              <div style={{ height: 6, width: 300 * rule, background: C.tomato, borderRadius: 3, marginTop: 22 }} />
              <div style={{ fontFamily: sans, fontSize: 36, fontWeight: 500, color: C.inkSoft, marginTop: 20 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 150, top: 800 }}>
        <Words text="…and one question you can't stop answering." start={80} stagger={3} size={64} color={C.ink} accent={["question"]} accentColor={C.tomatoDeep} />
      </div>
      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
}

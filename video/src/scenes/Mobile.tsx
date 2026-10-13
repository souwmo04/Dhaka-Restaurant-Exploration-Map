import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Eyebrow, Glow, Grain, Grid, Phone, Words } from "../components/kit";
import { C, pop, sans } from "../theme";

const PHONES = [
  { src: "phone-map.png", x: 930, y: 230, w: 300, rot: -8, delay: 14, depth: 0.7 },
  { src: "phone-detail.png", x: 1270, y: 150, w: 340, rot: 0, delay: 6, depth: 1 },
  { src: "phone-dashboard.png", x: 1630, y: 230, w: 300, rot: 8, delay: 22, depth: 0.7 },
];

/** Three phones rise and float: map, detail sheet, dashboard. */
export function Mobile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <Grid color={C.ink} opacity={0.05} />
      <Glow x={1300} y={700} size={1100} opacity={0.2} />
      <div style={{ position: "absolute", left: 120, top: 300, width: 620 }}>
        <Eyebrow text="Mobile" start={4} />
        <div style={{ height: 24 }} />
        <Words text="Made for your pocket." start={10} stagger={4} size={96} accent={["pocket."]} accentColor={C.tomatoDeep} />
        <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 18, fontFamily: sans, fontSize: 30, color: C.inkSoft }}>
          {["Swipe-up bottom sheet", "Map ⇄ list in one tap", "Works for guests — sign in to sync"].map((t, i) => {
            const s = pop(frame, fps, 50 + i * 8, { damping: 16 });
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, opacity: s, transform: `translateX(${(1 - s) * -40}px)` }}>
                <span style={{ width: 14, height: 14, borderRadius: 7, background: C.tomato }} />
                {t}
              </div>
            );
          })}
        </div>
      </div>
      {PHONES.map((p) => {
        const rise = pop(frame, fps, p.delay, { damping: 15, stiffness: 90 });
        const float = Math.sin((frame + p.delay * 7) / 22) * 12 * p.depth;
        return (
          <div
            key={p.src}
            style={{
              position: "absolute",
              left: p.x - p.w / 2,
              top: p.y,
              zIndex: p.depth === 1 ? 2 : 1,
              transform: `perspective(1800px) translateY(${(1 - rise) * 900 + float}px) rotate(${p.rot * rise}deg) rotateY(${p.rot * -1.5}deg)`,
            }}
          >
            <Phone src={p.src} width={p.w} />
          </div>
        );
      })}
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
}

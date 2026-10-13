import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame, Eyebrow, Glow, Grain, Grid, Words } from "../components/kit";
import { C, ease, pop, prog, sans } from "../theme";

const FW = 1240;
const VIEW_H = FW * 0.625;
const FULL_H = (FW * 4028) / 3200;

const CHIPS = [
  { big: "92", text: "restaurants visited", color: C.tomato },
  { big: "8 / 10", text: "areas explored", color: C.gold },
  { big: "15", text: "favorites saved", color: C.surface },
  { big: "2.7%", text: "of Dhaka tasted", color: C.tomato },
];

/** The dashboard scrolls by in a tilted window while the headline stats land. */
export function Dashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, 6, { damping: 18, stiffness: 80 });
  const scroll = prog(frame, 96, 110, ease.inOut);
  const tilt = interpolate(frame, [0, 240], [-14, -6]);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Grid opacity={0.07} />
      <Glow x={1300} y={300} size={1000} opacity={0.22} />

      <div style={{ position: "absolute", left: 110, top: 120, width: 640 }}>
        <Eyebrow text="Dashboard" start={4} />
        <div style={{ height: 24 }} />
        <Words text="Your whole city, at a glance." start={10} stagger={4} size={88} color={C.surface} accent={["glance."]} />
        <div style={{ marginTop: 50, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {CHIPS.map((c, i) => {
            const t = pop(frame, fps, 54 + i * 9, { damping: 14 });
            return (
              <div
                key={c.text}
                style={{
                  padding: "24px 26px",
                  borderRadius: 26,
                  background: "rgba(255,253,249,0.07)",
                  border: "1px solid rgba(255,253,249,0.12)",
                  transform: `translateY(${(1 - t) * 60}px) scale(${0.9 + t * 0.1})`,
                  opacity: Math.min(1, t * 1.3),
                  fontFamily: sans,
                }}
              >
                <div style={{ fontSize: 54, fontWeight: 700, color: c.color, letterSpacing: "-0.02em" }}>{c.big}</div>
                <div style={{ fontSize: 22, color: "rgba(255,253,249,0.7)", marginTop: 4 }}>{c.text}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 800,
          top: 150,
          transform: `perspective(2200px) translateX(${(1 - enter) * 500}px) rotateY(${tilt + (1 - enter) * -20}deg) rotateX(4deg)`,
          transformOrigin: "0% 50%",
          opacity: Math.min(1, enter * 1.5),
        }}
      >
        <BrowserFrame
          src="dashboard-full.png"
          width={FW}
          url="dhakarestuexplore.netlify.app/dashboard"
          imgStyle={{ height: "auto", transform: `translateY(${-scroll * (FULL_H - VIEW_H)}px)` }}
        />
      </div>
      <Grain />
    </AbsoluteFill>
  );
}

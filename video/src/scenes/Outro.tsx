import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark, Grain, Grid, Words } from "../components/kit";
import { C, display, ease, pop, prog, sans } from "../theme";

/** A tomato circle blooms from the logo; the question, the address, done. */
export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bloom = prog(frame, 0, 40, ease.inOut);
  const logo = pop(frame, fps, 14, { damping: 11, stiffness: 140 });
  const url = pop(frame, fps, 78, { damping: 14 });
  const shine = prog(frame, 100, 40, ease.inOut);
  const end = prog(frame, 172, 18, ease.in);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 2600, height: 2600, flexShrink: 0, borderRadius: "50%", background: C.tomato, transform: `scale(${bloom})` }} />
      </AbsoluteFill>
      <Grid opacity={0.12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - end }}>
        <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * 90}deg)` }}>
          <BrandMark size={170} />
        </div>
        <div style={{ height: 50 }} />
        <div style={{ width: 1820 }}>
          <Words text="How much of Dhaka have you tasted?" start={30} stagger={4} size={92} color={C.surface} accent={["tasted"]} accentColor={C.ink} align="center" />
        </div>
        <div style={{ height: 60 }} />
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "28px 52px",
            borderRadius: 999,
            background: C.ink,
            color: C.surface,
            fontFamily: sans,
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            transform: `scale(${url})`,
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          dhakarestuexplore.netlify.app
          <span style={{ color: C.tomato, transform: `translateX(${interpolate(frame % 30, [0, 15, 30], [0, 8, 0])}px)` }}>→</span>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 160,
              left: `${-20 + shine * 140}%`,
              background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent)",
            }}
          />
        </div>
        <div style={{ marginTop: 44, fontFamily: display, fontSize: 40, fontWeight: 600, color: C.ink, opacity: prog(frame, 110, 20) }}>BiteAtlas</div>
        <div style={{ marginTop: 10, fontFamily: sans, fontSize: 22, color: "rgba(31,27,22,0.75)", opacity: prog(frame, 118, 20) }}>
          Restaurant data © OpenStreetMap contributors · Overture Maps Foundation
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.ink, opacity: end }} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
}

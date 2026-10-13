import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandMark, Eyebrow, Glow, Grain, Grid, Words } from "../components/kit";
import { C, display, ease, pop, prog } from "../theme";

/** Logo build + the question the whole product is about. */
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = pop(frame, fps, 10, { damping: 11, stiffness: 120 });
  const drift = interpolate(frame, [0, 170], [1, 1.06]);
  const lift = prog(frame, 62, 30, ease.inOut); // logo + wordmark move up to make room
  const name = "BiteAtlas";

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Grid draw={prog(frame, 0, 45, ease.out)} opacity={0.09} />
      <Glow x={1560} y={260} size={900} opacity={0.32 * prog(frame, 5, 50)} />
      <Glow x={300} y={960} size={700} color={C.gold} opacity={0.1 * prog(frame, 20, 50)} />

      <AbsoluteFill style={{ transform: `scale(${drift})`, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `translateY(${-150 * lift}px) scale(${1 - 0.25 * lift})`, display: "flex", alignItems: "center", gap: 34 }}>
          <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -120}deg)` }}>
            <BrandMark size={150} />
          </div>
          <div style={{ display: "flex", fontFamily: display, fontSize: 150, fontWeight: 600, letterSpacing: "-0.03em", color: C.surface }}>
            {name.split("").map((ch, i) => {
              const t = prog(frame, 22 + i * 2.2, 22);
              return (
                <span key={i} style={{ display: "inline-block", overflow: "hidden" }}>
                  <span style={{ display: "inline-block", transform: `translateY(${(1 - t) * 110}%)`, color: i >= 4 ? C.tomato : undefined }}>{ch}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ position: "absolute", top: 560, width: 1820 }}>
          <Words text="How much of Dhaka have you tasted?" start={78} stagger={4} size={96} color={C.surface} accent={["tasted"]} align="center" />
        </div>
        <div style={{ position: "absolute", top: 720 }}>
          <Eyebrow text="A restaurant exploration map" start={118} color={C.tomato} />
        </div>
      </AbsoluteFill>
      <Grain />
    </AbsoluteFill>
  );
}

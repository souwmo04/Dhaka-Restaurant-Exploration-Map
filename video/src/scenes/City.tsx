import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CityMap, cityStats } from "../components/CityMap";
import { Count, Eyebrow, Glow, Grain, Grid, Words } from "../components/kit";
import { C, ease, prog, sans } from "../theme";

/** The real outlines draw in, every restaurant rains onto the city, then some light up as "visited". */
export function City() {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 260], [0.94, 1.05], { easing: ease.soft });
  const para = prog(frame, 70, 24);
  const legend = prog(frame, 165, 24);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Grid opacity={0.07} />
      <Glow x={1400} y={520} size={1100} opacity={0.18 * prog(frame, 0, 60)} />

      <div style={{ position: "absolute", left: 130, top: 230, width: 760 }}>
        <Eyebrow text="10 hand-traced maps" start={6} />
        <div style={{ height: 34 }} />
        <Words text="Every area, traced from real streets." start={14} stagger={4} size={88} color={C.surface} accent={["real"]} />
        <p style={{ fontFamily: sans, fontSize: 32, lineHeight: 1.45, color: "rgba(255,253,249,0.72)", marginTop: 40, opacity: para, transform: `translateY(${(1 - para) * 20}px)` }}>
          Outlines follow rivers, rail lines and main roads. Every pin comes from open map data — no scraping, nothing invented.
        </p>
        <div style={{ marginTop: 50, display: "flex", gap: 40, opacity: legend, transform: `translateY(${(1 - legend) * 20}px)`, fontFamily: sans, color: C.surface }}>
          <div>
            <div style={{ fontSize: 64, fontWeight: 700, color: C.tomato }}>
              <Count to={cityStats.total} start={165} duration={40} />
            </div>
            <div style={{ fontSize: 24, opacity: 0.7 }}>restaurants on the map</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 12, fontSize: 24 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i style={{ width: 14, height: 14, borderRadius: 9, background: "rgba(246,241,232,0.8)" }} /> not yet tasted
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <i style={{ width: 14, height: 14, borderRadius: 9, background: C.tomato, boxShadow: `0 0 12px ${C.tomato}` }} /> visited
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 1000, top: 40, transform: `scale(${zoom})`, transformOrigin: "50% 50%" }}>
        <CityMap width={800} start={8} dotsStart={60} labelsStart={150} litStart={190} />
      </div>
      <Grain />
    </AbsoluteFill>
  );
}

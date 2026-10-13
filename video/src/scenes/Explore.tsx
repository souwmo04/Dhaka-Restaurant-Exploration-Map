import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame, Callout, Cursor, Eyebrow, Grain, Grid, Words } from "../components/kit";
import { C, ease, pop, prog } from "../theme";

const FW = 1480; // frame width
const FX = 380;
const FY = 300;
const BAR = Math.round(FW * 0.034);
const K = FW / 800; // screenshot thumbnails were measured at 800px wide
/** A point measured on an 800px-wide screenshot → screen position. */
const at = (x: number, y: number) => ({ x: FX + x * K, y: FY + BAR + y * K });

/** The explore map: overview, callouts, then a zoom down to street level. */
export function Explore() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, 4, { damping: 18, stiffness: 90 });
  const zoomT = prog(frame, 128, 34, ease.inOut);
  const swap = prog(frame, 146, 16, ease.out);
  const drift = interpolate(frame, [0, 300], [0, -18]);

  // Zoom target on the overview shot (the dense south-east of Uttara).
  const target = { x: 560 / 800, y: 300 / 500 };

  const clusterRed = at(511, 92);
  const cluster109 = at(627, 275);
  const visited = at(322, 197);
  const pin = at(490, 190);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <Grid color={C.ink} opacity={0.05} />
      <div style={{ position: "absolute", left: 110, top: 80 }}>
        <Eyebrow text="Explore" start={2} />
        <div style={{ height: 24 }} />
        <Words text="Every restaurant, on a real map." start={8} stagger={3} size={78} accent={["real"]} accentColor={C.tomatoDeep} style={{ width: 820 }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: FX,
          top: FY,
          transform: `perspective(2400px) translateY(${(1 - enter) * 260 + drift}px) rotateX(${(1 - enter) * 24}deg) scale(${0.9 + enter * 0.1})`,
          transformOrigin: "50% 0%",
          opacity: Math.min(1, enter * 1.5),
        }}
      >
        <BrowserFrame
          src="explore.png"
          width={FW}
          url="dhakarestuexplore.netlify.app/explore/uttara"
          imgStyle={{ transform: `scale(${1 + zoomT * 1.6})`, transformOrigin: `${target.x * 100}% ${target.y * 100}%`, filter: `blur(${zoomT * (1 - swap) * 3}px)` }}
        >
          <Img
            src={staticFile("shots/explore-zoom.png")}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: swap, transform: `scale(${1.35 - swap * 0.35})`, transformOrigin: "60% 50%" }}
          />
        </BrowserFrame>
      </div>

      {frame < 130 && (
        <>
          <Callout x={clusterRed.x} y={clusterRed.y} dx={150} dy={-90} text="Clusters turn red as you explore" start={50} />
          <Callout x={cluster109.x} y={cluster109.y} dx={-330} dy={150} text="Group nearby places · tap to zoom" start={78} />
        </>
      )}
      {frame >= 160 && (
        <>
          <Callout x={visited.x} y={visited.y} dx={-240} dy={-130} text="Visited ✓" start={176} />
          <Callout x={pin.x} y={pin.y} dx={170} dy={-150} text="Tap any pin for details" start={200} />
        </>
      )}
      <Cursor
        path={[
          { f: 165, x: 1500, y: 1000 },
          { f: 196, x: pin.x + 4, y: pin.y - 18 },
          { f: 260, x: pin.x + 4, y: pin.y - 18 },
        ]}
        clicks={[226]}
      />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
}

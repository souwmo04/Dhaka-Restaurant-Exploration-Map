import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BrowserFrame, Callout, Cursor, Eyebrow, Grain, Words } from "../components/kit";
import { C, ease, pop, prog, sans } from "../theme";

const FW = 1560;
const FX = 300;
const FY = 70;
const BAR = Math.round(FW * 0.034);
const K = FW / 800;
const at = (x: number, y: number) => ({ x: FX + x * K, y: FY + BAR + y * K });

/** Food courts and towers: one marker, a list of everything inside. */
export function Buildings() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pull = prog(frame, 18, 60, ease.inOut);
  const card = pop(frame, fps, 66, { damping: 16 });
  const marker = { x: 502 / 800, y: 267 / 500 };
  const visited = at(745, 111);
  const item = at(690, 172);
  const drift = interpolate(frame, [0, 180], [0, -14]);

  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: FX, top: FY + drift }}>
        <BrowserFrame
          src="building.png"
          width={FW}
          url="dhakarestuexplore.netlify.app/explore/uttara"
          imgStyle={{ transform: `scale(${interpolate(pull, [0, 1], [2.8, 1])})`, transformOrigin: `${marker.x * 100}% ${marker.y * 100}%` }}
        />
      </div>

      {/* Pulse on the building marker while zoomed in */}
      {pull < 0.4 && (
        <div
          style={{
            position: "absolute",
            left: 960 - 90,
            top: 540 - 90,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: `5px solid ${C.tomato}`,
            opacity: (1 - prog(frame % 22, 0, 22)) * (1 - pull * 2.5),
            transform: `scale(${0.5 + prog(frame % 22, 0, 22)})`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 70,
          width: 760,
          padding: "44px 52px",
          borderRadius: 36,
          background: C.surface,
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.55)",
          transform: `translateY(${(1 - card) * 140}px)`,
          opacity: Math.min(1, card * 1.4),
        }}
      >
        <Eyebrow text="Shared buildings" start={72} />
        <div style={{ height: 22 }} />
        <Words text="7 restaurants. One tower." start={78} stagger={3} size={76} accent={["One", "tower."]} accentColor={C.tomatoDeep} />
        <p style={{ fontFamily: sans, fontSize: 28, lineHeight: 1.45, color: C.inkSoft, marginTop: 22, opacity: prog(frame, 96, 20) }}>
          Food courts and malls get a single marker. Tap it, pick a floor, see what you&apos;ve already tried.
        </p>
      </div>

      {frame > 100 && <Callout x={visited.x} y={visited.y} dx={-200} dy={-40} text="2 / 7 visited" start={108} dark />}
      <Cursor
        path={[
          { f: 120, x: 1500, y: 900 },
          { f: 145, x: item.x, y: item.y },
          { f: 180, x: item.x, y: item.y },
        ]}
        clicks={[156]}
      />
      <Grain />
    </AbsoluteFill>
  );
}

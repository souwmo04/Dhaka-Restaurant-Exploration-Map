import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timeline from "../data/timeline.json";
import { sans } from "../theme";

type Cue = { from: number; to: number; text: string };

/** Same cue timing as scripts/subtitles.py: sentences share the line's duration by length. */
function buildCues(): Cue[] {
  const cues: Cue[] = [];
  for (const sc of timeline.scenes) {
    const pieces = sc.line.split(/(?<=[.?!])\s+/);
    const total = pieces.reduce((s, p) => s + p.length, 0);
    let t = sc.start / timeline.fps + sc.voAt;
    for (const p of pieces) {
      const d = (sc.voDur * p.length) / total;
      cues.push({ from: Math.round(t * timeline.fps), to: Math.round((t + d) * timeline.fps), text: p });
      t += d;
    }
  }
  return cues;
}

/** Burned-in narration captions: a dark pill at the bottom centre. */
export function Captions() {
  const frame = useCurrentFrame();
  const cues = useMemo(buildCues, []);
  const cue = cues.find((c) => frame >= c.from && frame < c.to + 6);
  if (!cue) return null;
  const opacity = interpolate(frame, [cue.from, cue.from + 4, cue.to, cue.to + 6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56, pointerEvents: "none", zIndex: 200 }}>
      <div
        style={{
          maxWidth: 1300,
          padding: "16px 30px",
          borderRadius: 18,
          background: "rgba(20,17,14,0.82)",
          color: "#fffdf9",
          fontFamily: sans,
          fontSize: 40,
          fontWeight: 600,
          lineHeight: 1.3,
          textAlign: "center",
          opacity,
          transform: `translateY(${(1 - opacity) * 10}px)`,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
}

import type { ReactNode } from "react";
import { AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Captions } from "./components/Captions";
import { CoverWipe } from "./components/kit";
import { Buildings } from "./scenes/Buildings";
import { City } from "./scenes/City";
import { Dashboard } from "./scenes/Dashboard";
import { Explore } from "./scenes/Explore";
import { Intro } from "./scenes/Intro";
import { Mobile } from "./scenes/Mobile";
import { Numbers } from "./scenes/Numbers";
import { Outro } from "./scenes/Outro";
import { Search } from "./scenes/Search";
import { Tech } from "./scenes/Tech";
import { Visit } from "./scenes/Visit";
import timeline from "./data/timeline.json";
import { C } from "./theme";

/**
 * Scene order, the designed length in frames (30 fps), and wipe colours.
 * The narration can stretch a scene: real lengths come from
 * data/timeline.json, written by scripts/voiceover.py.
 */
const DESIGN = [
  { id: "intro", len: 170, Comp: Intro, wipe: [C.tomato, C.paper] },
  { id: "numbers", len: 150, Comp: Numbers, wipe: [C.tomato, C.ink] },
  { id: "city", len: 260, Comp: City, wipe: [C.ink, C.paper] },
  { id: "explore", len: 300, Comp: Explore, wipe: [C.tomato, C.paper] },
  { id: "buildings", len: 180, Comp: Buildings, wipe: [C.ink, C.paper] },
  { id: "visit", len: 210, Comp: Visit, wipe: [C.tomato, C.paper] },
  { id: "search", len: 200, Comp: Search, wipe: [C.tomato, C.ink] },
  { id: "dashboard", len: 240, Comp: Dashboard, wipe: [C.tomato, C.paper] },
  { id: "mobile", len: 200, Comp: Mobile, wipe: [C.tomato, C.ink] },
  { id: "tech", len: 220, Comp: Tech, wipe: [C.ink, C.tomato] },
  { id: "outro", len: 190, Comp: Outro, wipe: [] as string[] },
] as const;

const voiced = new Map(timeline.scenes.map((s) => [s.id, s.len]));
export const SCENES = DESIGN.map((s) => ({ ...s, len: Math.max(s.len, voiced.get(s.id) ?? 0) }));
export const TOTAL = SCENES.reduce((s, x) => s + x.len, 0);

/** A slow push-in across the whole scene, so held moments never sit still. */
function Camera({ len, children }: { len: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, len], [1, 1.035]);
  return <AbsoluteFill style={{ transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
}

export function Promo({ captions = false }: { captions?: boolean }) {
  let from = 0;
  const parts = SCENES.map((s) => {
    const start = from;
    from += s.len;
    return { ...s, start };
  });
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Narration, original music and effects, mixed by scripts/soundtrack.py on this same timeline. */}
      <Html5Audio src={staticFile("audio/soundtrack.wav")} />
      {parts.map(({ id, start, len, Comp }) => (
        // Cuts happen while a CoverWipe fully covers the frame.
        <Sequence key={id} from={start} durationInFrames={len} name={id}>
          <Camera len={len}>
            <Comp />
          </Camera>
        </Sequence>
      ))}
      {parts.slice(0, -1).map(({ id, start, len, wipe }) => (
        <CoverWipe key={`w-${id}`} at={start + len} colors={[...wipe]} />
      ))}
      {captions && <Captions />}
    </AbsoluteFill>
  );
}

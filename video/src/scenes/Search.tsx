import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Eyebrow, Grain, Grid, Words } from "../components/kit";
import { C, display, ease, lerp, pop, prog, sans } from "../theme";

// Real results for "pizza" in Gulshan (from the live app).
const RESULTS = [
  { name: "Pizza & More", sub: "House 9/A (NW), Road 53, Gulshan-2" },
  { name: "Pizza Hut", sub: "Gulshan Avenue" },
  { name: "Pizza Hut", sub: "RM Center" },
  { name: "Pizza Inn", sub: "House 76, Gulshan" },
  { name: "Pizza Italiana", sub: "House 76, Gulshan Avenue" },
];
const QUERY = "pizza";
const CHIPS = ["All", "Visited", "Not visited", "Favorites"];
// Which chip is active over time, and the list count it shows (Gulshan, seeded progress).
const STEPS = [
  { f: 0, chip: 0, count: 425, label: "restaurants" },
  { f: 112, chip: 1, count: 14, label: "visited" },
  { f: 140, chip: 3, count: 3, label: "favorites" },
  { f: 168, chip: 2, count: 411, label: "still to try" },
];

function SearchIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

/** Instant search on the left, one-tap filters on the right. */
export function Search() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bar = pop(frame, fps, 6, { damping: 16 });
  const typed = QUERY.slice(0, Math.max(0, Math.min(QUERY.length, Math.floor((frame - 22) / 4) + 1)));
  const caret = Math.floor(frame / 8) % 2 === 0;
  const highlight = prog(frame, 74, 14, ease.inOut);
  const panel = pop(frame, fps, 70, { damping: 17 });

  const step = [...STEPS].reverse().find((s) => frame >= s.f)!;
  const prev = STEPS[Math.max(0, STEPS.indexOf(step) - 1)];
  const k = prog(frame, step.f, 16, ease.soft);
  const count = Math.round(lerp(prev.count, step.count, k));
  const chipW = [96, 126, 168, 148];
  const chipX = (i: number) => chipW.slice(0, i).reduce((s, w) => s + w + 10, 0);
  const pillX = lerp(chipX(prev.chip), chipX(step.chip), k);
  const pillW = lerp(chipW[prev.chip], chipW[step.chip], k);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden", fontFamily: sans }}>
      <Grid color={C.ink} opacity={0.05} />
      <div style={{ position: "absolute", left: 130, top: 100 }}>
        <Eyebrow text="Search & filter" start={2} />
        <div style={{ height: 20 }} />
        <Words text="Find it in a keystroke." start={6} stagger={4} size={96} accent={["keystroke."]} accentColor={C.tomatoDeep} />
      </div>

      {/* Search */}
      <div style={{ position: "absolute", left: 130, top: 340, width: 860, transform: `translateY(${(1 - bar) * 80}px)`, opacity: Math.min(1, bar * 1.4) }}>
        <div
          style={{
            height: 112,
            borderRadius: 56,
            background: C.surface,
            border: `3px solid ${frame > 18 ? C.tomato : C.line}`,
            boxShadow: frame > 18 ? `0 0 0 8px rgba(228,87,46,0.14), 0 30px 60px -24px rgba(31,27,22,0.3)` : "0 30px 60px -24px rgba(31,27,22,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 40px",
            fontSize: 42,
          }}
        >
          <SearchIcon size={42} color={C.inkMuted} />
          <span style={{ color: typed ? C.ink : C.inkMuted, fontWeight: 500 }}>{typed || "Search Gulshan restaurants…"}</span>
          {frame > 18 && caret && <span style={{ width: 3, height: 48, background: C.tomato, marginLeft: -16 }} />}
        </div>

        <div
          style={{
            marginTop: 18,
            borderRadius: 34,
            background: C.surface,
            border: `1px solid ${C.line}`,
            boxShadow: "0 40px 90px -30px rgba(31,27,22,0.35)",
            padding: 14,
            position: "relative",
            opacity: prog(frame, 40, 10),
            transform: `translateY(${(1 - prog(frame, 40, 16)) * -20}px)`,
          }}
        >
          <div style={{ position: "absolute", left: 14, right: 14, top: 14, height: 92, borderRadius: 22, background: C.paperDeep, opacity: highlight }} />
          {RESULTS.map((r, i) => {
            const t = prog(frame, 44 + i * 4, 18);
            return (
              <div key={i} style={{ position: "relative", height: 92, display: "flex", alignItems: "center", gap: 22, padding: "0 22px", opacity: t, transform: `translateX(${(1 - t) * -30}px)` }}>
                <span style={{ width: 58, height: 58, borderRadius: 16, background: C.paper, display: "grid", placeItems: "center", fontSize: 32 }}>🍕</span>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>{r.name}</div>
                  <div style={{ fontSize: 22, color: C.inkMuted }}>{r.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          position: "absolute",
          left: 1110,
          top: 340,
          width: 680,
          padding: 52,
          boxSizing: "border-box",
          borderRadius: 40,
          background: C.surface,
          border: `1px solid ${C.line}`,
          boxShadow: "0 40px 90px -30px rgba(31,27,22,0.3)",
          transform: `translateX(${(1 - panel) * 160}px)`,
          opacity: Math.min(1, panel * 1.4),
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", color: C.tomatoDeep }}>GULSHAN</div>
        <div style={{ position: "relative", marginTop: 30, height: 64 }}>
          <div style={{ position: "absolute", left: pillX, width: pillW, top: 0, height: 64, borderRadius: 32, background: C.ink }} />
          {CHIPS.map((c, i) => (
            <div
              key={c}
              style={{
                position: "absolute",
                left: chipX(i),
                width: chipW[i],
                height: 64,
                borderRadius: 32,
                border: `2px solid ${C.line}`,
                boxSizing: "border-box",
                display: "grid",
                placeItems: "center",
                fontSize: 23,
                fontWeight: 600,
                whiteSpace: "nowrap",
                color: i === step.chip && k > 0.5 ? C.surface : C.inkSoft,
                transition: "none",
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 56, display: "flex", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontFamily: display, fontSize: 170, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.04em", color: C.ink, fontVariantNumeric: "tabular-nums" }}>{count}</span>
          <span style={{ fontSize: 34, color: C.inkSoft }}>{step.label}</span>
        </div>
        <div style={{ marginTop: 34, display: "flex", gap: 10, opacity: interpolate(frame, [100, 114], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          {["🍕 Pizza", "☕ Café", "🍔 Burger", "🍛 Bangladeshi"].map((c) => (
            <span key={c} style={{ padding: "12px 18px", borderRadius: 999, background: C.paper, fontSize: 22, color: C.inkSoft, whiteSpace: "nowrap" }}>
              {c}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 18, fontSize: 22, color: C.inkMuted }}>23 cuisines · the map follows every filter</div>
      </div>
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
}

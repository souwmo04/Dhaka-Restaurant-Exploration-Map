import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Burst, Cursor, Eyebrow, Glow, Grain, Grid, Words } from "../components/kit";
import { C, display, ease, lerp, pop, prog, sans } from "../theme";

const CLICK = 80;
const STAR = 132;

// Card geometry (screen coordinates).
const CARD = { x: 130, y: 330, w: 860, h: 560 };
const BTN = { x: CARD.x + 56, y: CARD.y + 300, w: 620, h: 108 };
const STARB = { x: BTN.x + BTN.w + 22, y: BTN.y, s: 108 };

function Check({ size, color, stroke = 4 }: { size: number; color: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Star({ size, fill, stroke }: { size: number; fill: string; stroke: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round">
      <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" />
    </svg>
  );
}

/** The core loop, rebuilt in vector: mark visited → confetti → progress ticks up. */
export function Visit() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = pop(frame, fps, 8, { damping: 17 });
  const side = pop(frame, fps, 18, { damping: 17 });
  const visited = frame >= CLICK;
  const flip = pop(frame, fps, CLICK, { damping: 12, stiffness: 220 });
  const press = interpolate(frame, [CLICK - 4, CLICK, CLICK + 6], [1, 0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const starOn = frame >= STAR;
  const starPop = pop(frame, fps, STAR, { damping: 9, stiffness: 260 });
  const dateRow = prog(frame, CLICK + 8, 22);
  const progress = prog(frame, CLICK + 6, 40, ease.soft);
  const visitedCount = Math.round(lerp(38, 39, progress));
  const pct = lerp(38 / 596, 39 / 596, progress) * 100;
  const toast = interpolate(frame, [CLICK + 6, CLICK + 22, 190, 205], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <Grid color={C.ink} opacity={0.05} />
      <Glow x={1500} y={620} size={900} opacity={0.18 + 0.12 * progress} />

      <div style={{ position: "absolute", left: 130, top: 100 }}>
        <Eyebrow text="One tap" start={2} />
        <div style={{ height: 20 }} />
        <Words text="Tap. Tasted. Counted." start={6} stagger={5} size={100} accent={["Counted."]} accentColor={C.tomatoDeep} />
      </div>

      {/* Restaurant card */}
      <div
        style={{
          position: "absolute",
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 40,
          background: C.surface,
          border: `1px solid ${C.line}`,
          boxShadow: "0 50px 120px -30px rgba(31,27,22,0.35)",
          transform: `translateY(${(1 - card) * 160}px) scale(${0.94 + card * 0.06})`,
          opacity: Math.min(1, card * 1.4),
          fontFamily: sans,
        }}
      >
        <div style={{ position: "absolute", left: 56, top: 52, fontSize: 26, color: C.inkSoft }}>🏢 Grand Zam Zam Tower · Food Court</div>
        <div style={{ position: "absolute", left: 56, top: 100, fontFamily: display, fontSize: 84, fontWeight: 600, letterSpacing: "-0.03em", color: C.ink }}>Mexican Spicy</div>
        <div style={{ position: "absolute", left: 56, top: 214, fontSize: 28, color: C.inkSoft, display: "flex", gap: 34 }}>
          <span>🍽️ Restaurant</span>
          <span>📍 Uttara</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            top: 432,
            height: 76,
            borderRadius: 22,
            background: C.paper,
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            fontSize: 27,
            color: C.inkSoft,
            opacity: dateRow,
            transform: `translateY(${(1 - dateRow) * -20}px)`,
          }}
        >
          📅&nbsp; Visited&nbsp;<b style={{ color: C.ink }}>October 13, 2026</b>
          <span style={{ marginLeft: "auto", color: C.tomatoDeep, fontWeight: 600 }}>Change date</span>
        </div>
      </div>

      {/* Mark-as-visited button */}
      <div
        style={{
          position: "absolute",
          left: BTN.x,
          top: BTN.y,
          width: BTN.w,
          height: BTN.h,
          borderRadius: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: sans,
          fontSize: 36,
          fontWeight: 700,
          transform: `translateY(${(1 - card) * 160}px) scale(${press})`,
          opacity: Math.min(1, card * 1.4),
          background: visited ? C.tomatoSoft : C.tomatoDeep,
          color: visited ? C.tomatoDeep : "#fff",
          border: visited ? `4px solid ${C.tomato}` : "4px solid transparent",
          boxSizing: "border-box",
        }}
      >
        <span style={{ display: "grid", transform: visited ? `scale(${flip}) rotate(${(1 - flip) * -30}deg)` : undefined }}>
          <Check size={40} color={visited ? C.tomatoDeep : "#fff"} />
        </span>
        {visited ? "Visited" : "Mark as visited"}
      </div>

      {/* Favourite star */}
      <div
        style={{
          position: "absolute",
          left: STARB.x,
          top: STARB.y,
          width: STARB.s,
          height: STARB.s,
          borderRadius: 30,
          boxSizing: "border-box",
          display: "grid",
          placeItems: "center",
          background: starOn ? C.goldSoft : C.surface,
          border: `4px solid ${starOn ? C.gold : C.line}`,
          transform: `translateY(${(1 - card) * 160}px)`,
          opacity: Math.min(1, card * 1.4),
        }}
      >
        <span style={{ display: "grid", transform: starOn ? `scale(${starPop})` : undefined }}>
          <Star size={46} fill={starOn ? C.gold : "none"} stroke={starOn ? "#b08300" : C.inkSoft} />
        </span>
      </div>

      <Burst start={CLICK} x={BTN.x + BTN.w / 2} y={BTN.y + BTN.h / 2} scale={1.3} />
      <Burst start={STAR} x={STARB.x + STARB.s / 2} y={STARB.y + STARB.s / 2} scale={0.7} emoji={["⭐"]} />

      {/* Progress card */}
      <div
        style={{
          position: "absolute",
          left: 1110,
          top: CARD.y,
          width: 680,
          height: CARD.h,
          borderRadius: 40,
          background: C.ink,
          color: C.surface,
          padding: 56,
          boxSizing: "border-box",
          fontFamily: sans,
          transform: `translateX(${(1 - side) * 200}px)`,
          opacity: Math.min(1, side * 1.4),
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -120, top: -120, width: 420, height: 420, borderRadius: "50%", background: C.tomato, opacity: 0.35, filter: "blur(90px)" }} />
        <div style={{ position: "relative", fontSize: 22, fontWeight: 600, letterSpacing: "0.18em", color: C.tomato }}>UTTARA</div>
        <div style={{ position: "relative", fontFamily: display, fontSize: 210, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.04em", marginTop: 26, fontVariantNumeric: "tabular-nums" }}>
          {pct.toFixed(1)}%
        </div>
        <div style={{ position: "relative", fontSize: 34, marginTop: 20, color: "rgba(255,253,249,0.75)" }}>
          <b style={{ color: C.surface, display: "inline-block", transform: `scale(${1 + 0.25 * interpolate(frame, [CLICK + 6, CLICK + 14, CLICK + 28], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })})` }}>{visitedCount}</b> / 596 restaurants visited
        </div>
        <div style={{ position: "relative", height: 18, borderRadius: 9, background: "rgba(255,253,249,0.15)", marginTop: 48, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 9, background: C.tomato, boxShadow: `0 0 24px ${C.tomato}` }} />
        </div>
        <div style={{ position: "relative", fontSize: 24, marginTop: 18, color: "rgba(255,253,249,0.55)" }}>Every visit moves the needle — per area and across Dhaka.</div>
      </div>

      {/* Toast */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 40,
          transform: `translate(-50%, ${(toast - 1) * 140}px)`,
          opacity: toast,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "22px 34px",
          borderRadius: 24,
          background: C.surface,
          boxShadow: "0 30px 70px -20px rgba(31,27,22,0.4)",
          fontFamily: sans,
          fontSize: 28,
          fontWeight: 600,
          color: C.ink,
        }}
      >
        <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 20, background: C.leaf }}>
          <Check size={26} color="#fff" />
        </span>
        Mexican Spicy marked as visited
      </div>

      <Cursor
        path={[
          { f: 40, x: 1100, y: 1000 },
          { f: 72, x: BTN.x + BTN.w / 2 + 40, y: BTN.y + BTN.h / 2 + 10 },
          { f: 108, x: BTN.x + BTN.w / 2 + 40, y: BTN.y + BTN.h / 2 + 10 },
          { f: 126, x: STARB.x + STARB.s / 2 + 6, y: STARB.y + STARB.s / 2 + 8 },
          { f: 210, x: STARB.x + STARB.s / 2 + 6, y: STARB.y + STARB.s / 2 + 8 },
        ]}
        clicks={[CLICK, STAR]}
        scale={1.3}
      />
      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
}

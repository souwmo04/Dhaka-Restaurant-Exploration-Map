import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, display, ease, lerp, pop, prog, sans } from "../theme";

/* ─── Brand ─────────────────────────────────────────────────────────── */

export function BrandMark({ size = 64, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={style}>
      <rect width="64" height="64" rx="16" fill={C.ink} />
      <path fill={C.tomato} d="M32 12a20 20 0 1 0 19.5 15.6 7.5 7.5 0 0 1-9.6-9.6 7.5 7.5 0 0 1-6.3-5.7A20 20 0 0 0 32 12Z" />
      <circle cx="32" cy="32" r="6" fill={C.surface} />
    </svg>
  );
}

/* ─── Backgrounds ───────────────────────────────────────────────────── */

/** The app's 56px blueprint grid; lines draw outward from the centre when `draw` < 1. */
export function Grid({ color = C.paper, opacity = 0.1, cell = 64, draw = 1 }: { color?: string; opacity?: number; cell?: number; draw?: number }) {
  const mask = `radial-gradient(circle at 50% 50%, black ${draw * 75}%, transparent ${draw * 75 + 12}%)`;
  return (
    <AbsoluteFill
      style={{
        opacity,
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: "center center",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
}

/** Soft colour bloom. */
export function Glow({ x, y, size, color = C.tomato, opacity = 0.35 }: { x: number; y: number; size: number; color?: string; opacity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        opacity,
        filter: `blur(${size / 4}px)`,
      }}
    />
  );
}

/** Film grain, for texture on flat colour. */
export function Grain({ opacity = 0.07 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/* ─── Type ──────────────────────────────────────────────────────────── */

/**
 * Words rise out of a mask one after another. `accent` words get the italic
 * tomato treatment.
 */
export function Words({
  text,
  start = 0,
  stagger = 4,
  size = 96,
  color = C.ink,
  accent = [],
  accentColor = C.tomato,
  font = display,
  weight = 600,
  lineHeight = 1.04,
  align = "left",
  style,
  blur = true,
}: {
  text: string;
  start?: number;
  stagger?: number;
  size?: number;
  color?: string;
  accent?: string[];
  accentColor?: string;
  font?: string;
  weight?: number;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  style?: CSSProperties;
  blur?: boolean;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: "-0.025em",
        color,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        columnGap: "0.24em",
        ...style,
      }}
    >
      {words.map((w, i) => {
        const t = prog(frame, start + i * stagger, 22, ease.out);
        const isAccent = accent.includes(w.replace(/[^\p{L}\p{N}]/gu, ""));
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - t) * 105}%) rotate(${(1 - t) * 4}deg)`,
                filter: blur ? `blur(${(1 - t) * 8}px)` : undefined,
                opacity: interpolate(t, [0, 0.3, 1], [0, 1, 1]),
                color: isAccent ? accentColor : undefined,
                fontStyle: isAccent ? "italic" : undefined,
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Small tracked uppercase label with a drawing rule in front. */
export function Eyebrow({ text, start = 0, color = C.tomato, style }: { text: string; start?: number; color?: string; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const t = prog(frame, start, 24);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: sans, fontWeight: 600, fontSize: 22, letterSpacing: "0.2em", color, ...style }}>
      <span style={{ width: 48 * t, height: 2, background: color, display: "inline-block" }} />
      <span style={{ opacity: t, transform: `translateX(${(1 - t) * -20}px)`, textTransform: "uppercase" }}>{text}</span>
    </div>
  );
}

/** A number that counts up with an ease-out. */
export function Count({ to, start = 0, duration = 40, format = (n: number) => Math.round(n).toLocaleString("en-US"), style }: { to: number; start?: number; duration?: number; format?: (n: number) => string; style?: CSSProperties }) {
  const frame = useCurrentFrame();
  const t = prog(frame, start, duration, ease.soft);
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(to * t)}</span>;
}

/* ─── Devices ───────────────────────────────────────────────────────── */

/** A clean browser window around a screenshot (3200×2000 shots → 16:10). */
export function BrowserFrame({ src, width, url = "dhakarestuexplore.netlify.app", style, imgStyle, children }: { src: string; width: number; url?: string; style?: CSSProperties; imgStyle?: CSSProperties; children?: ReactNode }) {
  const bar = Math.round(width * 0.034);
  return (
    <div
      style={{
        width,
        borderRadius: width * 0.014,
        overflow: "hidden",
        background: C.surface,
        boxShadow: "0 2px 4px rgba(31,27,22,0.08), 0 40px 120px -20px rgba(31,27,22,0.45)",
        border: `1px solid ${C.line}`,
        ...style,
      }}
    >
      <div style={{ height: bar, background: "#f1ebe0", display: "flex", alignItems: "center", gap: bar * 0.22, padding: `0 ${bar * 0.5}px`, borderBottom: `1px solid ${C.line}` }}>
        {["#ec6a5e", "#f4bf4f", "#61c554"].map((c) => (
          <span key={c} style={{ width: bar * 0.3, height: bar * 0.3, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            marginLeft: bar * 0.6,
            flex: 1,
            maxWidth: width * 0.42,
            height: bar * 0.58,
            borderRadius: bar,
            background: C.surface,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: `0 ${bar * 0.4}px`,
            fontFamily: sans,
            fontSize: bar * 0.32,
            color: C.inkSoft,
          }}
        >
          <svg width={bar * 0.3} height={bar * 0.3} viewBox="0 0 24 24" fill="none" stroke={C.inkMuted} strokeWidth="2.5">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          {url}
        </div>
      </div>
      <div style={{ position: "relative", width, height: width * 0.625, overflow: "hidden" }}>
        <Img src={staticFile(`shots/${src}`)} style={{ width: "100%", height: "100%", display: "block", ...imgStyle }} />
        {children}
      </div>
    </div>
  );
}

/** A modern phone around a 1170×2532 screenshot. */
export function Phone({ src, width, style }: { src: string; width: number; style?: CSSProperties }) {
  const h = width * (2532 / 1170);
  const bezel = width * 0.035;
  return (
    <div
      style={{
        width: width + bezel * 2,
        height: h + bezel * 2,
        padding: bezel,
        borderRadius: width * 0.16,
        background: "#14110e",
        boxShadow: "0 0 0 2px #3a332b inset, 0 50px 120px -30px rgba(0,0,0,0.6)",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width, height: h, borderRadius: width * 0.13, overflow: "hidden", position: "relative", background: C.paper }}>
        <Img src={staticFile(`shots/${src}`)} style={{ width: "100%", height: "100%", display: "block" }} />
        <div style={{ position: "absolute", top: width * 0.03, left: "50%", width: width * 0.3, height: width * 0.085, marginLeft: -width * 0.15, borderRadius: 999, background: "#0b0a09" }} />
      </div>
    </div>
  );
}

/* ─── Pointer ───────────────────────────────────────────────────────── */

type Waypoint = { f: number; x: number; y: number };

/** A cursor gliding through waypoints, with click ripples at `clicks` frames. */
export function Cursor({ path, clicks = [], scale = 1 }: { path: Waypoint[]; clicks?: number[]; scale?: number }) {
  const frame = useCurrentFrame();
  let x = path[0].x;
  let y = path[0].y;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (frame >= a.f) {
      const t = prog(frame, a.f, b.f - a.f, ease.inOut);
      x = lerp(a.x, b.x, t);
      y = lerp(a.y, b.y, t);
    }
  }
  const appear = prog(frame, path[0].f - 8, 10);
  const press = clicks.reduce((s, c) => s + interpolate(frame, [c - 3, c, c + 5], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);
  return (
    <>
      {clicks.map((c) => {
        const t = prog(frame, c, 22);
        if (frame < c || t >= 1) return null;
        const at = pathAt(path, c);
        return (
          <div
            key={c}
            style={{
              position: "absolute",
              left: at.x - 40 * scale,
              top: at.y - 40 * scale,
              width: 80 * scale,
              height: 80 * scale,
              borderRadius: "50%",
              border: `${4 * scale}px solid ${C.tomato}`,
              transform: `scale(${0.2 + t * 1.2})`,
              opacity: 1 - t,
            }}
          />
        );
      })}
      <svg
        width={34 * scale}
        height={40 * scale}
        viewBox="0 0 34 40"
        style={{ position: "absolute", left: x - 4 * scale, top: y - 2 * scale, opacity: appear, transform: `scale(${1 - press * 0.15})`, transformOrigin: "4px 2px", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.3))" }}
      >
        <path d="M4 2 L4 31 L11.5 24 L16.5 36 L22 33.5 L17 22 L27 22 Z" fill={C.ink} stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
    </>
  );
}

function pathAt(path: Waypoint[], f: number) {
  let p = path[0];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (f >= a.f) {
      const t = interpolate(f, [a.f, b.f], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.inOut });
      p = { f, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    }
  }
  return p;
}

/* ─── Annotation ────────────────────────────────────────────────────── */

/** A pill label that pops in, connected to a point by a drawing leader line. */
export function Callout({ x, y, dx, dy, text, start, dark = false }: { x: number; y: number; dx: number; dy: number; text: string; start: number; dark?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dot = pop(frame, fps, start, { damping: 12 });
  const line = prog(frame, start + 4, 16);
  const pill = pop(frame, fps, start + 12, { damping: 13 });
  const len = Math.hypot(dx, dy);
  return (
    <>
      <div style={{ position: "absolute", left: x - 11, top: y - 11, width: 22, height: 22, borderRadius: "50%", background: C.tomato, border: `4px solid ${C.surface}`, transform: `scale(${dot})`, boxShadow: "0 4px 14px rgba(228,87,46,0.6)" }} />
      <div style={{ position: "absolute", left: x - 30, top: y - 30, width: 60, height: 60, borderRadius: "50%", border: `2px solid ${C.tomato}`, opacity: (1 - prog(frame, start, 30)) * 0.8, transform: `scale(${0.4 + prog(frame, start, 30) * 1.2})` }} />
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
        <line x1={x} y1={y} x2={x + dx * line} y2={y + dy * line} stroke={dark ? C.surface : C.ink} strokeWidth={2.5} strokeDasharray={len} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: x + dx,
          top: y + dy,
          transform: `translate(${dx < 0 ? "-100%" : "0"}, -50%) scale(${pill})`,
          transformOrigin: dx < 0 ? "right center" : "left center",
          background: dark ? C.surface : C.ink,
          color: dark ? C.ink : C.surface,
          fontFamily: sans,
          fontWeight: 600,
          fontSize: 26,
          padding: "14px 24px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          boxShadow: "0 18px 40px -12px rgba(0,0,0,0.45)",
        }}
      >
        {text}
      </div>
    </>
  );
}

/* ─── Transitions ───────────────────────────────────────────────────── */

/**
 * A cover wipe: tomato then ink bands sweep across on a slant and fully cover
 * the frame at `at`, where the scene cut happens underneath, then sweep away.
 */
export function CoverWipe({ at, colors = [C.tomato, C.ink] }: { at: number; colors?: string[] }) {
  const frame = useCurrentFrame();
  const span = 13;
  if (frame < at - span - 4 || frame > at + span + 8) return null;
  const slant = 22; // % of width the band's edges lean by
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      {colors.map((color, i) => {
        // Later bands enter later and leave earlier, so the top band (ink) owns the cut frame.
        const enter = prog(frame, at - span + i * 3, span - i * 3, ease.inOut);
        const exit = prog(frame, at + (colors.length - 1 - i) * 3, span, ease.inOut);
        const leftEdge = lerp(100 + slant, -slant - 2, enter); // sweeps in from the right
        const rightEdge = lerp(100 + slant + 2, -slant - 2, exit); // then the tail follows it out
        const poly = `polygon(${leftEdge + slant}% 0, ${rightEdge + slant}% 0, ${rightEdge}% 100%, ${leftEdge}% 100%)`;
        return <AbsoluteFill key={i} style={{ background: color, clipPath: poly, WebkitClipPath: poly }} />;
      })}
    </AbsoluteFill>
  );
}

/* ─── Celebration ───────────────────────────────────────────────────── */

const BURST_COLORS = [C.tomato, C.gold, C.tomatoDeep, C.leaf];
const jitter = (i: number) => ((i * 37) % 11) / 11;

/** The app's confetti burst, driven by frames. */
export function Burst({ start, x, y, scale = 1, emoji = ["🍛", "🍕", "🍜"] }: { start: number; x: number; y: number; scale?: number; emoji?: string[] }) {
  const frame = useCurrentFrame();
  const f = frame - start;
  if (f < 0 || f > 45) return null;
  const n = 22;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2 + jitter(i) * 0.5;
        const dist = (90 + jitter(i + 3) * 80) * scale;
        const t = prog(frame, start, 26 + jitter(i) * 8, ease.out);
        const fade = interpolate(f, [16, 40], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const size = (9 + jitter(i + 5) * 8) * scale;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: i % 3 === 0 ? 3 : 999,
              background: BURST_COLORS[i % 4],
              transform: `translate(${Math.cos(angle) * dist * 1.5 * t}px, ${Math.sin(angle) * dist * t + t * t * 30}px) rotate(${t * (jitter(i + 7) - 0.5) * 540}deg)`,
              opacity: fade,
            }}
          />
        );
      })}
      {emoji.map((e, i) => {
        const t = prog(frame, start + 2 + i * 2, 34, ease.out);
        return (
          <div
            key={e}
            style={{
              position: "absolute",
              fontSize: 46 * scale,
              transform: `translate(-50%, -50%) translate(${(i - 1) * 90 * scale * t}px, ${-150 * scale * t}px) scale(${interpolate(t, [0, 0.4, 1], [0.3, 1.2, 1])})`,
              opacity: interpolate(t, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
            }}
          >
            {e}
          </div>
        );
      })}
    </div>
  );
}

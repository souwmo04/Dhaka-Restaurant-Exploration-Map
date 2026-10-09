"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["var(--tomato)", "var(--gold)", "var(--tomato-deep)", "var(--leaf)"];
const EMOJI = ["🍛", "🍕", "🍜"];
const DOTS = 14;

/** Fixed pseudo-random spread so every burst looks lively but renders deterministically. */
const jitter = (i: number) => ((i * 37) % 11) / 11;

/**
 * A one-shot confetti burst from the centre of its (relative) parent.
 * Render it with a new `key` to play it again. Skipped with reduced motion.
 */
export function Burst() {
  const reduce = useReducedMotion();
  if (reduce) return null;

  const dots = Array.from({ length: DOTS }, (_, i) => {
    const angle = (i / DOTS) * Math.PI * 2 + jitter(i) * 0.5;
    const distance = 52 + jitter(i + 3) * 40;
    return {
      x: Math.cos(angle) * distance * 1.6, // the button is wide, so spread further sideways
      y: Math.sin(angle) * distance,
      size: 5 + Math.round(jitter(i + 5) * 4),
      color: COLORS[i % COLORS.length],
      square: i % 3 === 0,
      rotate: (jitter(i + 7) - 0.5) * 360,
    };
  });

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-visible">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: d.size, height: d.size, background: d.color, borderRadius: d.square ? 2 : 999 }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
          animate={{ x: d.x, y: d.y, scale: 1, opacity: [1, 1, 0], rotate: d.rotate }}
          transition={{
            default: { duration: 0.8 + jitter(i) * 0.25, ease: [0.16, 1, 0.3, 1] },
            // Stay visible while flying out, then fade.
            opacity: { duration: 0.9 + jitter(i) * 0.25, times: [0, 0.55, 1] },
          }}
        />
      ))}
      {EMOJI.map((e, i) => (
        <motion.span
          key={e}
          className="absolute text-xl"
          initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
          animate={{ x: (i - 1) * 46, y: [-6, -58, -74], scale: [0.3, 1.15, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1.05, delay: 0.05 + i * 0.06, ease: "easeOut" }}
        >
          {e}
        </motion.span>
      ))}
    </span>
  );
}

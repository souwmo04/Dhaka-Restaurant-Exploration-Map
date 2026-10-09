import type { CSSProperties } from "react";

/** Grid intersections (in 56px cells) where pins land, kept clear of the headline. */
const PINS = [
  { col: 6, row: 2, tone: "tomato" },
  { col: 9, row: 3, tone: "surface" },
  { col: 11, row: 5, tone: "gold" },
  { col: 12, row: 8, tone: "tomato" },
  { col: 10, row: 11, tone: "tomato" },
  { col: 3, row: 12, tone: "surface" },
  { col: 7, row: 13, tone: "tomato" },
] as const;

const FILL = { tomato: "var(--tomato)", surface: "var(--surface)", gold: "var(--gold)" } as const;

/**
 * Decorative map pins that drop onto the 56px background grid one by one and
 * send out a ring as they land. Purely visual; hidden from assistive tech.
 */
export function DroppingPins({ cell = 56 }: { cell?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {PINS.map((pin, i) => {
        const delay = 250 + i * 220;
        return (
          <div key={i} className="absolute" style={{ left: pin.col * cell - 11, top: pin.row * cell - 28 }}>
            <span
              className="absolute left-1/2 top-full block size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-tomato"
              style={{ animation: `pin-ring 1.6s ease-out ${delay + 450}ms both` } as CSSProperties}
            />
            <svg
              width="22"
              height="28"
              viewBox="0 0 22 28"
              className="relative drop-shadow-[0_4px_6px_rgb(0_0_0/0.35)]"
              style={{ animation: `pin-drop 650ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both` }}
            >
              <path d="M11 27C11 27 21 16.8 21 10.5A10 10 0 0 0 1 10.5C1 16.8 11 27 11 27Z" fill={FILL[pin.tone]} />
              <circle cx="11" cy="10.5" r="3.6" fill={pin.tone === "surface" ? "var(--ink)" : "var(--surface)"} />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

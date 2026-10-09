"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { citySketch } from "@/lib/map/citySketch";
import { formatPercent, type AreaProgress } from "@/lib/restaurants/progress";
import { cn } from "@/lib/utils";
import type { LngLat } from "@/types/domain";

const WIDTH = 400;
const EASE = [0.65, 0, 0.35, 1] as const;

/** How strongly an area is filled: any visit shows, and it deepens as you explore. */
function fillLevel({ visited, percent }: AreaProgress) {
  if (visited === 0) return 0.07;
  return 0.32 + 0.6 * Math.sqrt(Math.min(1, percent / 100));
}

const shortName = (name: string) => name.replace(/\s+R\/A$/, "").split(" & ")[0];

/**
 * The explorable areas drawn as one little map of the city. Outlines draw
 * themselves in, fill with tomato as you explore, and your visited
 * restaurants appear as dots. Each area opens its map.
 */
export function DhakaMap({ items, visitedPoints, className }: { items: AreaProgress[]; visitedPoints: LngLat[]; className?: string }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  const active = useMemo(() => items.filter((i) => i.area.active), [items]);
  const byId = useMemo(() => new Map(active.map((i) => [i.area.id, i])), [active]);
  const sketch = useMemo(() => citySketch(active.map((i) => i.area), WIDTH), [active]);

  // One label per area, or one per group (the four Mirpur maps share "Mirpur").
  const labels = useMemo(() => {
    const groups = new Map<string, { xs: number[]; ys: number[]; width: number }>();
    for (const s of sketch.shapes) {
      const area = byId.get(s.areaId)!.area;
      const key = area.group ?? shortName(area.name);
      const g = groups.get(key) ?? { xs: [], ys: [], width: 0 };
      g.xs.push(s.center[0]);
      g.ys.push(s.center[1]);
      g.width = Math.max(g.width, area.group ? 999 : s.width);
      groups.set(key, g);
    }
    // Biggest areas first; a label that would overlap one already placed is
    // left out (its name still shows on hover).
    const placed: { text: string; x: number; y: number; w: number }[] = [];
    const candidates = [...groups.entries()]
      .filter(([, g]) => g.width >= 34)
      .sort((a, b) => b[1].width - a[1].width)
      .map(([text, g]) => ({ text, x: g.xs.reduce((a, b) => a + b) / g.xs.length, y: g.ys.reduce((a, b) => a + b) / g.ys.length, w: text.length * 6.4 + 6 }));
    for (const c of candidates) {
      if (placed.every((p) => Math.abs(p.x - c.x) > (p.w + c.w) / 2 || Math.abs(p.y - c.y) > 15)) placed.push(c);
    }
    return placed;
  }, [sketch, byId]);

  const points = useMemo(() => visitedPoints.slice(0, 400).map(sketch.project), [visitedPoints, sketch]);

  if (sketch.shapes.length === 0) return null;
  const hoveredShape = sketch.shapes.find((s) => s.areaId === hovered);
  const hoveredItem = hovered ? byId.get(hovered) : undefined;
  const drawDone = 0.4 + sketch.shapes.length * 0.09 + 0.9;

  const open = (slug: string) => router.push(`/explore/${slug}`);

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${sketch.width} ${sketch.height}`} className="block h-auto w-full overflow-visible" role="group" aria-label="Your explored areas of Dhaka">
        {sketch.shapes.map((shape, i) => {
          const item = byId.get(shape.areaId)!;
          const lit = item.visited > 0;
          return (
            <motion.path
              key={shape.areaId}
              d={shape.d}
              role="link"
              tabIndex={0}
              aria-label={`${item.area.name}: ${item.visited} of ${item.total} restaurants visited. Open map.`}
              initial={{ pathLength: 0, fillOpacity: 0 }}
              animate={{ pathLength: 1, fillOpacity: fillLevel(item) }}
              transition={{
                pathLength: { duration: 1.1, delay: 0.25 + i * 0.09, ease: EASE },
                fillOpacity: { duration: 0.7, delay: 0.8 + i * 0.09 },
              }}
              fill={lit ? "var(--tomato)" : "var(--surface)"}
              stroke={lit ? "var(--tomato)" : "rgb(255 253 249 / 0.6)"}
              strokeWidth={1.3}
              strokeLinejoin="round"
              className="cursor-pointer outline-none transition-[filter,stroke-width] duration-200 hover:brightness-125 hover:[stroke-width:2.6px] focus-visible:brightness-125 focus-visible:[stroke-width:2.6px]"
              onMouseEnter={() => setHovered(shape.areaId)}
              onMouseLeave={() => setHovered((h) => (h === shape.areaId ? null : h))}
              onFocus={() => setHovered(shape.areaId)}
              onBlur={() => setHovered((h) => (h === shape.areaId ? null : h))}
              onClick={() => open(item.area.slug)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(item.area.slug);
                }
              }}
            />
          );
        })}

        {points.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={2.6}
            fill="var(--gold)"
            stroke="var(--ink)"
            strokeWidth={0.8}
            className="pointer-events-none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: drawDone + Math.min(i, 40) * 0.03, type: "spring", stiffness: 520, damping: 16 }}
            style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
          />
        ))}

        {labels.map((l) => (
          <motion.text
            key={l.text}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none select-none fill-surface/85 text-[11px] font-semibold tracking-wide"
            style={{ paintOrder: "stroke", stroke: "rgb(31 27 22 / 0.55)", strokeWidth: 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: drawDone - 0.4, duration: 0.5 }}
            aria-hidden
          >
            {l.text}
          </motion.text>
        ))}
      </svg>

      {hoveredShape && hoveredItem && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-xl bg-surface px-3 py-2 text-ink shadow-panel"
          style={{ left: `${(hoveredShape.center[0] / sketch.width) * 100}%`, top: `${(hoveredShape.center[1] / sketch.height) * 100}%` }}
          aria-hidden
        >
          <p className="font-display text-sm font-semibold">{hoveredItem.area.name}</p>
          <p className="tabular text-xs text-ink-soft">
            {hoveredItem.visited} / {hoveredItem.total.toLocaleString("en-US")} · <span className="font-semibold text-tomato-deep">{formatPercent(hoveredItem.percent)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

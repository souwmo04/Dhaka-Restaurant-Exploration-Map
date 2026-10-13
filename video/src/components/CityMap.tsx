import { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import city from "../data/city.json";
import { C, ease, prog, sans } from "../theme";

type Pt = [number, number];

/** Projects every area outline and restaurant into one width-fitted picture. */
function useSketch(width: number, pad: number) {
  return useMemo(() => {
    const all = city.areas.flatMap((a) => a.ring as Pt[]);
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
    const s = (width - pad * 2) / ((maxX - minX) * kx);
    const height = (maxY - minY) * s + pad * 2;
    const project = ([x, y]: Pt): Pt => [pad + (x - minX) * kx * s, pad + (maxY - y) * s];
    const areas = city.areas.map((a) => {
      const ring = (a.ring as Pt[]).map(project);
      const d = `M${ring.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
      let len = 0;
      for (let i = 1; i < ring.length; i++) len += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
      const cx = ring.reduce((t, p) => t + p[0], 0) / ring.length;
      const cy = ring.reduce((t, p) => t + p[1], 0) / ring.length;
      return { ...a, d, len, cx, cy };
    });
    // North → south sweep order for the dots.
    const points = (city.points as [number, number, number][])
      .map(([x, y, area], i) => ({ p: project([x, y]), area, i }))
      .sort((a, b) => a.p[1] - b.p[1]);
    return { height, areas, points };
  }, [width, pad]);
}

/** Deterministic "visited" pick (~1 in 7) so the lit dots look natural. */
const isVisited = (i: number) => (i * 2654435761) % 997 < 140;

export function CityMap({
  width,
  start = 0,
  dotsStart = 40,
  litStart = 9999,
  labelsStart = 9999,
  dark = true,
}: {
  width: number;
  start?: number;
  dotsStart?: number;
  litStart?: number;
  labelsStart?: number;
  dark?: boolean;
}) {
  const frame = useCurrentFrame();
  const { height, areas, points } = useSketch(width, 20);
  const stroke = dark ? C.paper : C.ink;
  const dotColor = dark ? "rgba(246,241,232,0.78)" : "rgba(31,27,22,0.55)";

  // Group labels: the four Mirpur maps share one.
  const labels = useMemo(() => {
    const m = new Map<string, { xs: number[]; ys: number[]; count: number }>();
    for (const a of areas) {
      const key = a.group ?? a.name.replace(/\s+R\/A$/, "").split(" & ")[0];
      const g = m.get(key) ?? { xs: [], ys: [], count: 0 };
      g.xs.push(a.cx);
      g.ys.push(a.cy);
      g.count += a.count;
      m.set(key, g);
    }
    const out = [...m].map(([name, g]) => ({ name, count: g.count, x: g.xs.reduce((s, v) => s + v) / g.xs.length, y: g.ys.reduce((s, v) => s + v) / g.ys.length }));
    // Push apart labels that would overlap (Banani and Gulshan sit side by side).
    for (let pass = 0; pass < 3; pass++) {
      for (const a of out) {
        for (const b of out) {
          if (a === b) continue;
          const w = (a.name.length + b.name.length) * 5.6 + 12;
          if (Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < 44) {
            const dir = a.x < b.x ? -1 : 1;
            a.x += (dir * (w - Math.abs(a.x - b.x))) / 2;
          }
        }
      }
    }
    return out;
  }, [areas]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <defs>
        <filter id="dotglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      {areas.map((a, i) => {
        const draw = prog(frame, start + i * 5, 40, ease.inOut);
        const fill = prog(frame, start + 30 + i * 5, 30);
        return (
          <path
            key={a.slug}
            d={a.d}
            fill={dark ? C.paper : C.ink}
            fillOpacity={0.05 * fill}
            stroke={stroke}
            strokeOpacity={0.75}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeDasharray={a.len}
            strokeDashoffset={a.len * (1 - draw)}
          />
        );
      })}
      {points.map(({ p, i }, order) => {
        const appear = prog(frame, dotsStart + (order / points.length) * 70, 10);
        if (appear <= 0) return null;
        const lit = isVisited(i) ? prog(frame, litStart + (order % 60), 12) : 0;
        return (
          <g key={i}>
            {lit > 0 && <circle cx={p[0]} cy={p[1]} r={5} fill={C.tomato} opacity={lit * 0.6} filter="url(#dotglow)" />}
            <circle cx={p[0]} cy={p[1]} r={(1.9 + lit * 1.2) * appear} fill={lit > 0.5 ? C.tomato : dotColor} />
          </g>
        );
      })}
      {labels.map((l, i) => {
        const t = prog(frame, labelsStart + i * 4, 18);
        if (t <= 0) return null;
        return (
          <g key={l.name} opacity={t} transform={`translate(${l.x} ${l.y - (1 - t) * 10})`}>
            <text textAnchor="middle" y={-6} fontFamily={sans} fontWeight={700} fontSize={19} fill={dark ? C.surface : C.ink} style={{ paintOrder: "stroke" }} stroke={dark ? C.ink : C.paper} strokeWidth={5}>
              {l.name}
            </text>
            <text textAnchor="middle" y={18} fontFamily={sans} fontWeight={600} fontSize={16} fill={C.tomato} style={{ paintOrder: "stroke" }} stroke={dark ? C.ink : C.paper} strokeWidth={5}>
              {Math.round(l.count * interpolate(t, [0, 1], [0, 1])).toLocaleString("en-US")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const cityStats = { total: city.points.length, sources: city.sources, pizza: city.pizzaGulshan };

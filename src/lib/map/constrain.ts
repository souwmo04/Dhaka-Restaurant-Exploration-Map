import type { LngLat as LngLatClass, PaddingOptions } from "maplibre-gl";
import type { BBox, LngLat } from "@/types/domain";

/** MapLibre's world size at zoom 0, in pixels. */
const TILE_SIZE = 512;
/** Slack (px) past the outline so markers on the edge aren't pinned to the screen edge. */
const EDGE_SLACK = 40;

type Merc = [number, number];

const toMercX = (lng: number) => (lng + 180) / 360;
const toMercY = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
const fromMercX = (x: number) => x * 360 - 180;
const fromMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - 90;

function inside([x, y]: Merc, ring: Merc[]): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function nearestOnRing([px, py]: Merc, ring: Merc[]): Merc {
  let best: Merc = ring[0];
  let bestD = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    const q: Merc = [ax + t * dx, ay + t * dy];
    const d = (q[0] - px) ** 2 + (q[1] - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best;
}

export type ConstrainViewport = {
  width: number;
  height: number;
  padding: PaddingOptions;
  minZoom: number;
  maxZoom: number;
};

/**
 * Camera constraint that keeps an area filling the map:
 *  1. the visible (unpadded) region can't show empty space past the area's
 *     extent — when the area is smaller than the screen it stays centred;
 *  2. the camera centre stays inside the area outline, so corners of the
 *     extent that lie outside the outline can't be panned into view;
 *  3. zoom is clamped to the map's min/max (this replaces MapLibre's default
 *     constraint, which is what normally enforces them).
 */
export function createAreaConstrain(
  LngLatCtor: typeof LngLatClass,
  getArea: () => { extent: BBox; outline: LngLat[] },
  getViewport: () => ConstrainViewport,
) {
  return (lngLat: LngLatClass, requestedZoom: number) => {
    const { extent, outline } = getArea();
    const [w, s, e, n] = extent;
    const { width, height, padding, minZoom, maxZoom } = getViewport();
    const zoom = Math.min(Math.max(requestedZoom, minZoom), maxZoom);
    const world = TILE_SIZE * 2 ** zoom;
    const slack = EDGE_SLACK / world;

    const clamp = (c: number, min: number, max: number, visiblePx: number) => {
      const half = Math.max(visiblePx, 0) / 2 / world;
      const lo = min - slack + half;
      const hi = max + slack - half;
      return lo > hi ? (min + max) / 2 : Math.min(Math.max(c, lo), hi);
    };

    let x = clamp(toMercX(lngLat.lng), toMercX(w), toMercX(e), width - (padding.left ?? 0) - (padding.right ?? 0));
    // Mercator y grows southward: the north edge has the smaller y.
    let y = clamp(toMercY(lngLat.lat), toMercY(n), toMercY(s), height - (padding.top ?? 0) - (padding.bottom ?? 0));

    if (outline.length > 3) {
      const ring = outline.map(([lng, lat]): Merc => [toMercX(lng), toMercY(lat)]);
      if (!inside([x, y], ring)) [x, y] = nearestOnRing([x, y], ring);
    }

    return { center: new LngLatCtor(fromMercX(x), fromMercY(y)), zoom };
  };
}

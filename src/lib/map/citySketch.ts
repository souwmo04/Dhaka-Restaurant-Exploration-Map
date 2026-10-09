import type { Area, LngLat } from "@/types/domain";

export type SketchShape = {
  areaId: string;
  /** SVG path data for the area outline. */
  d: string;
  /** Rough visual centre, for labels and tooltips. */
  center: [number, number];
  /** Projected width, used to decide whether a label fits. */
  width: number;
};

export type CitySketch = {
  width: number;
  height: number;
  shapes: SketchShape[];
  project: (p: LngLat) => [number, number];
};

function ringsOf(area: Area): LngLat[][] {
  if (area.boundary?.type === "Polygon") return [area.boundary.coordinates[0] as LngLat[]];
  if (area.boundary?.type === "MultiPolygon") return area.boundary.coordinates.map((p) => p[0] as LngLat[]);
  if (area.bbox) {
    const [w, s, e, n] = area.bbox;
    return [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
  }
  return [];
}

/**
 * A small SVG "sketch" of the city: every area's outline projected into one
 * picture (equirectangular, corrected for latitude), sized to `width`.
 */
export function citySketch(areas: Area[], width: number, pad = 12): CitySketch {
  const rings = areas.map((a) => ({ area: a, rings: ringsOf(a) })).filter((r) => r.rings.length > 0);
  const points = rings.flatMap((r) => r.rings.flat());
  if (points.length === 0) return { width, height: 0, shapes: [], project: () => [0, 0] };

  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  const [minLng, maxLng, minLat, maxLat] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)];
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = (width - pad * 2) / Math.max((maxLng - minLng) * kx, 1e-9);
  const height = Math.round((maxLat - minLat) * scale + pad * 2);
  const project = ([lng, lat]: LngLat): [number, number] => [pad + (lng - minLng) * kx * scale, pad + (maxLat - lat) * scale];
  const r1 = (n: number) => Math.round(n * 10) / 10;

  const shapes = rings.map(({ area, rings }) => {
    const projected = rings.map((ring) => ring.map(project));
    const d = projected.map((ring) => `M${ring.map(([x, y]) => `${r1(x)},${r1(y)}`).join("L")}Z`).join("");
    const all = projected.flat();
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    return {
      areaId: area.id,
      d,
      center: [r1((Math.min(...xs) + Math.max(...xs)) / 2), r1((Math.min(...ys) + Math.max(...ys)) / 2)] as [number, number],
      width: Math.max(...xs) - Math.min(...xs),
    };
  });
  return { width, height, shapes, project };
}

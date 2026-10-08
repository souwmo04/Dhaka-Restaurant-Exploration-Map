import type { Area, BBox, LngLat } from "@/types/domain";

/** The drawn edge sits this far (≈150 m) outside the tracked box, so pins on the edge read as inside. */
const EDGE_PAD = 0.0014;
/** Fallback half-size of an area without a bbox (≈2.5 km). */
const DEFAULT_HALF_SIZE = 0.022;

export type AreaFrame = {
  /** The exploration area's box (data collection extent). */
  bbox: BBox;
  /** Extent of the drawn outline — what the camera fits on screen. */
  extent: BBox;
  /** Everything outside the area, used to fade the surroundings. */
  mask: GeoJSON.Feature<GeoJSON.Polygon>;
  /** The area's edge. */
  outline: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
};

export function areaBBox(area: Area): BBox {
  if (area.bbox) return area.bbox;
  const [lng, lat] = area.center;
  return [lng - DEFAULT_HALF_SIZE, lat - DEFAULT_HALF_SIZE, lng + DEFAULT_HALF_SIZE, lat + DEFAULT_HALF_SIZE];
}

/**
 * The visible frame for an area. Uses the verified boundary when the area has
 * one; otherwise the area's exploration box (the region restaurants are
 * tracked in), drawn as a box rather than pretending to be an official border.
 */
export function areaFrame(area: Area): AreaFrame {
  const bbox = areaBBox(area);
  const [w, s, e, n] = [bbox[0] - EDGE_PAD, bbox[1] - EDGE_PAD, bbox[2] + EDGE_PAD, bbox[3] + EDGE_PAD];
  const ring: LngLat[] = [
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s],
  ];

  const outer: LngLat[] = [
    [w - 1, s - 1],
    [w - 1, n + 1],
    [e + 1, n + 1],
    [e + 1, s - 1],
    [w - 1, s - 1],
  ];
  const holes: LngLat[][] =
    area.boundary?.type === "Polygon"
      ? [area.boundary.coordinates[0] as LngLat[]]
      : area.boundary?.type === "MultiPolygon"
        ? area.boundary.coordinates.map((p) => p[0] as LngLat[])
        : [ring];

  const outlineGeometry = area.boundary ?? { type: "Polygon" as const, coordinates: [ring] };
  const extent = geometryExtent(outlineGeometry);

  return {
    bbox,
    extent,
    mask: { type: "Feature", properties: { role: "mask" }, geometry: { type: "Polygon", coordinates: [outer, ...holes] } },
    outline: {
      type: "Feature",
      properties: { role: "outline" },
      geometry: outlineGeometry,
    },
  };
}

function geometryExtent(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): BBox {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      w = Math.min(w, lng);
      s = Math.min(s, lat);
      e = Math.max(e, lng);
      n = Math.max(n, lat);
    }
  }
  return [w, s, e, n];
}


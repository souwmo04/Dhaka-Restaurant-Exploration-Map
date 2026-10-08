import type { Area, BBox, LngLat } from "@/types/domain";

/** How far (degrees, ≈1 km) the camera may wander past an area's box. */
const PAN_MARGIN = 0.009;
/** The drawn edge sits this far (≈150 m) outside the tracked box, so pins on the edge read as inside. */
const EDGE_PAD = 0.0014;
/** Fallback half-size of an area without a bbox (≈2.5 km). */
const DEFAULT_HALF_SIZE = 0.022;

export type AreaFrame = {
  /** The exploration area itself. */
  bbox: BBox;
  /** Camera limit: the area plus a small margin, so the map never leaves it. */
  maxBounds: [LngLat, LngLat];
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

  return {
    bbox,
    maxBounds: [
      [w - PAN_MARGIN, s - PAN_MARGIN],
      [e + PAN_MARGIN, n + PAN_MARGIN],
    ],
    mask: { type: "Feature", properties: { role: "mask" }, geometry: { type: "Polygon", coordinates: [outer, ...holes] } },
    outline: {
      type: "Feature",
      properties: { role: "outline" },
      geometry: area.boundary ?? { type: "Polygon", coordinates: [ring] },
    },
  };
}

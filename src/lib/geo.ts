/** Small, dependency-free geometry helpers shared by the app and the data scripts. */

type Position = number[];

export function metersBetween(aLng: number, aLat: number, bLng: number, bLat: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon (holes respected) for GeoJSON Polygon / MultiPolygon. */
export function pointInGeometry(lng: number, lat: number, geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon): boolean {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(([outer, ...holes]) => inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h)));
}

/** True when the point is inside the area's boundary, or its bbox if it has none. */
export function pointInArea(
  lng: number,
  lat: number,
  area: { bbox?: number[] | null; boundary_geojson?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null },
): boolean {
  if (area.boundary_geojson) return pointInGeometry(lng, lat, area.boundary_geojson);
  if (area.bbox) {
    const [w, s, e, n] = area.bbox;
    return lng >= w && lng <= e && lat >= s && lat <= n;
  }
  return true;
}

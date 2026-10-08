import type { LngLat, Restaurant } from "@/types/domain";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** "1" → "1st floor", "2,3,4" → "Floors 2, 3 & 4", "Ground" → "Ground floor". */
export function floorLabel(floor: string | null): string | null {
  if (!floor) return null;
  const f = floor.trim();
  if (/^(g|ground|0)$/i.test(f)) return "Ground floor";
  const parts = f.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return `Floors ${parts.slice(0, -1).join(", ")} & ${parts.at(-1)}`;
  if (/^\d+$/.test(f)) return `${ordinal(Number(f))} floor`;
  return `Floor ${f}`;
}

/** Official Google Maps URL scheme (no API key, no scraping). */
export function googleMapsUrl(r: Pick<Restaurant, "name" | "position" | "googlePlaceId">): string {
  const [lng, lat] = r.position;
  const params = new URLSearchParams({ api: "1", query: `${lat},${lng}` });
  if (r.googlePlaceId) {
    params.set("query", r.name);
    params.set("query_place_id", r.googlePlaceId);
  }
  return `https://www.google.com/maps/search/?${params}`;
}

export function openStreetMapUrl(position: LngLat, osmId: string | null): string {
  if (osmId) return `https://www.openstreetmap.org/${osmId}`;
  const [lng, lat] = position;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=19/${lat}/${lng}`;
}

export function websiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function websiteLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

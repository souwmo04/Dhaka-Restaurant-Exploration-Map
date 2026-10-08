/**
 * The restaurant import format — the contract between data sources
 * (OSM fetcher, hand-curated JSON/CSV, a future Google Places enricher) and the
 * database. Kept free of Node/browser APIs so scripts and the app can share it.
 */

export type AreaRecord = {
  slug: string;
  name: string;
  city?: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  zoom?: number;
  bbox?: [number, number, number, number] | null;
  boundary_geojson?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  boundary_source?: string | null;
  active?: boolean;
  sort_order?: number;
};

export type CategoryRecord = {
  slug: string;
  name: string;
  emoji?: string | null;
  /** OSM `cuisine=*` values that map to this category (used by the OSM fetcher). */
  osm?: string[];
  /** Overture Maps `taxonomy` categories that map to this category. */
  overture?: string[];
  /** Lower-case substrings of a restaurant name that imply this category. */
  name_keywords?: string[];
};

export type RestaurantRecord = {
  /** Stable natural key. Generated from the name when omitted. */
  slug?: string;
  name: string;
  name_bn?: string | null;
  /** Area slug or name, e.g. "uttara" or "Uttara". */
  area: string;
  latitude: number;
  longitude: number;
  /** Category slugs or names, primary first. A single string is accepted too. */
  categories?: string[] | string;
  /** Alias for a single category (matches the simple example format). */
  category?: string;
  address?: string | null;
  /** Restaurants sharing a building name (within an area) are grouped together. */
  building?: string | null;
  building_latitude?: number | null;
  building_longitude?: number | null;
  building_osm_id?: string | null;
  floor?: string | number | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  photo_url?: string | null;
  google_place_id?: string | null;
  osm_id?: string | null;
  overture_id?: string | null;
  source?: "osm" | "overture" | "manual" | "google_places" | "import";
  active?: boolean;
};

/** A data file may be a bare array, or an object carrying provenance metadata. */
export type RestaurantFile =
  | RestaurantRecord[]
  | {
      source?: string;
      license?: string;
      attribution?: string;
      generated_at?: string;
      area?: string;
      restaurants: RestaurantRecord[];
    };

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function restaurantsOf(file: RestaurantFile): RestaurantRecord[] {
  return Array.isArray(file) ? file : file.restaurants;
}

export function categoriesOf(record: RestaurantRecord): string[] {
  const raw = record.categories ?? record.category ?? [];
  const list = Array.isArray(raw) ? raw : raw.split(/[;|,]/);
  return list.map((c) => c.trim()).filter(Boolean);
}

export function floorOf(record: RestaurantRecord): string | null {
  if (record.floor === null || record.floor === undefined || record.floor === "") return null;
  return String(record.floor).trim();
}

export type ValidationIssue = { index: number; name: string; message: string };

/** Validates records and returns human-readable issues (empty when valid). */
export function validateRestaurants(records: RestaurantRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  records.forEach((r, index) => {
    const name = typeof r.name === "string" ? r.name : "(unnamed)";
    const push = (message: string) => issues.push({ index, name, message });
    if (typeof r.name !== "string" || !r.name.trim()) push("name is required");
    if (typeof r.area !== "string" || !r.area.trim()) push("area is required");
    if (!Number.isFinite(r.latitude) || r.latitude < -90 || r.latitude > 90) push("latitude must be a number in [-90, 90]");
    if (!Number.isFinite(r.longitude) || r.longitude < -180 || r.longitude > 180)
      push("longitude must be a number in [-180, 180]");
    if (r.rating !== undefined && r.rating !== null && (!Number.isFinite(r.rating) || r.rating < 0 || r.rating > 5))
      push("rating must be between 0 and 5");
  });
  return issues;
}

/**
 * Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF).
 * Returns one object per row keyed by the header row.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^﻿/, ""));
  return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? "").trim()])));
}

/** Converts a CSV row (all strings) into a RestaurantRecord. */
export function csvRowToRecord(row: Record<string, string>): RestaurantRecord {
  const num = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));
  const str = (v: string | undefined) => (v === undefined || v === "" ? null : v);
  return {
    slug: str(row.slug) ?? undefined,
    name: row.name ?? "",
    name_bn: str(row.name_bn),
    area: row.area ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    categories: row.categories || row.category || undefined,
    address: str(row.address),
    building: str(row.building),
    floor: str(row.floor),
    phone: str(row.phone),
    website: str(row.website),
    rating: num(row.rating),
    rating_count: num(row.rating_count),
    photo_url: str(row.photo_url),
    google_place_id: str(row.google_place_id),
    osm_id: str(row.osm_id),
    overture_id: str(row.overture_id),
    source: (str(row.source) as RestaurantRecord["source"]) ?? "import",
    active: row.active ? row.active.toLowerCase() !== "false" : true,
  };
}

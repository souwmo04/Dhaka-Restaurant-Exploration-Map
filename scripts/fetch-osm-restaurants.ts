/**
 * Fetches food places for one area from OpenStreetMap (Overpass API) and writes
 * them in the BiteAtlas import format to data/restaurants/<area>.osm.json.
 *
 *   npm run data:fetch-osm -- uttara            # query Overpass, cache raw responses
 *   npm run data:fetch-osm -- uttara --cached   # re-process data/raw/<area>.*.json offline
 *
 * Data © OpenStreetMap contributors, available under the ODbL
 * (https://www.openstreetmap.org/copyright). Keep the attribution in the output.
 *
 * Restaurants are grouped into buildings when OSM tells us they share one:
 *   1. the same `addr:housename` (e.g. "Paradise Tower"), or
 *   2. the point lies inside a named OSM building polygon, or
 *   3. the same house number + street, within 40 m.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AreaRecord, CategoryRecord, RestaurantRecord } from "../src/lib/catalog/import-format";
import { slugify } from "../src/lib/catalog/import-format";

const ROOT = join(__dirname, "..");
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const USER_AGENT = "BiteAtlas data fetcher (+https://github.com/souwmo04/Dhaka-Restaurant-Exploration-Map)";

/** Addresses that place a point outside the area even if it is inside the bbox. */
const EXCLUDED_LOCALITIES = /dakshin\s?khan|dokkhinkhan|ashkona|hazi\s?camp|bimanbandar|kumirtola|airport\s?road/i;

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
};

async function overpass(query: string): Promise<OsmElement[]> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
          body: new URLSearchParams({ data: query }),
        });
        if (!res.ok) throw new Error(`${endpoint} responded ${res.status}`);
        const json = (await res.json()) as { elements: OsmElement[]; remark?: string };
        if (json.remark?.includes("error")) throw new Error(json.remark);
        return json.elements;
      } catch (error) {
        lastError = error;
        console.warn(`  overpass attempt failed (${endpoint}, try ${attempt}): ${String(error)}`);
        await new Promise((r) => setTimeout(r, 3000 * attempt));
      }
    }
  }
  throw lastError;
}

function pointInRing(lon: number, lat: number, ring: { lat: number; lon: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > lat !== b.lat > lat && lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) {
      inside = !inside;
    }
  }
  return inside;
}

function ringCentroid(ring: { lat: number; lon: number }[]): [number, number] {
  const pts = ring.slice(0, -1).length ? ring.slice(0, -1) : ring;
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return [lat, lon];
}

function metersBetween(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const BENGALI = /[ঀ-৿]/;

/** "Nur Biriyani House নূর বিরিয়ানী হাউজ" → ["Nur Biriyani House", "নূর বিরিয়ানী হাউজ"] */
function splitNames(tags: Record<string, string>): { name: string; nameBn: string | null } | null {
  const raw = (tags["name:en"] ?? tags.name ?? "").trim();
  const explicitBn = tags["name:bn"]?.trim() || null;
  if (!raw) return null;
  if (!BENGALI.test(raw)) return { name: raw, nameBn: explicitBn };
  const idx = raw.search(BENGALI);
  const latin = raw.slice(0, idx).trim().replace(/[-–|/(]+$/, "").trim();
  const bn = raw.slice(idx).trim();
  if (latin.length >= 2) return { name: latin, nameBn: explicitBn ?? bn };
  return { name: raw, nameBn: explicitBn ?? raw };
}

function titleCaseIfShouting(name: string): string {
  // Leave short brand acronyms (KFC, BFC) alone; soften ALL-CAPS phrases.
  if (name.length > 5 && name === name.toUpperCase() && /[A-Z]{4,}/.test(name)) {
    return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function categoriesFor(tags: Record<string, string>, name: string, categories: CategoryRecord[]): string[] {
  const out: string[] = [];
  const add = (slug: string) => {
    if (!out.includes(slug)) out.push(slug);
  };
  const cuisines = (tags.cuisine ?? "")
    .split(";")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  for (const cuisine of cuisines) {
    const match = categories.find((c) => c.osm?.includes(cuisine));
    if (match) add(match.slug);
  }
  const lower = name.toLowerCase();
  for (const c of categories) {
    if (c.name_keywords?.some((k) => lower.includes(k))) add(c.slug);
  }
  const amenity = tags.amenity ?? tags.shop;
  if (amenity === "cafe") add("cafe");
  if (amenity === "fast_food" && out.length === 0) add("fast-food");
  if (amenity === "ice_cream") add("dessert");
  if (amenity === "bakery" || amenity === "pastry") add("bakery");
  if (out.length === 0) add("restaurant");
  return out;
}

function floorFor(tags: Record<string, string>): string | null {
  const raw = tags["addr:floor"] ?? tags.level;
  if (raw === undefined) return null;
  if (raw === "0") return "Ground";
  return raw;
}

function addressFor(tags: Record<string, string>): string | null {
  const parts: string[] = [];
  if (tags["addr:housename"]) parts.push(tags["addr:housename"]);
  const house = tags["addr:housenumber"]?.replace(/^house\s*(no\.?)?\s*/i, "");
  const street = [house && `House ${house}`, tags["addr:street"]]
    .filter(Boolean)
    .join(", ");
  if (street) parts.push(street);
  const sector = tags["place:neighbourhood"];
  if (sector && !parts.join(" ").toLowerCase().includes(sector.toLowerCase())) {
    parts.push(sector.replace(/\bsector\b/i, "Sector"));
  }
  return parts.length ? parts.join(", ") : tags["addr:full"] ?? null;
}

/** Runs a query, caching the raw response; with --cached, reads the cache instead. */
async function cachedOverpass(name: string, query: string, useCache: boolean): Promise<OsmElement[]> {
  const dir = join(ROOT, "data/raw");
  const file = join(dir, `${name}.json`);
  if (useCache) {
    if (!existsSync(file)) throw new Error(`No cached response at ${file}; run without --cached first`);
    return (JSON.parse(readFileSync(file, "utf8")) as { elements: OsmElement[] }).elements;
  }
  const elements = await overpass(query);
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify({ query, fetched_at: new Date().toISOString(), elements }) + "\n");
  return elements;
}

async function main() {
  const args = process.argv.slice(2);
  const useCache = args.includes("--cached");
  const areaSlug = args.find((a) => !a.startsWith("--")) ?? "uttara";
  const areas = JSON.parse(readFileSync(join(ROOT, "data/areas.json"), "utf8")) as AreaRecord[];
  const categories = JSON.parse(readFileSync(join(ROOT, "data/categories.json"), "utf8")) as CategoryRecord[];
  const area = areas.find((a) => a.slug === areaSlug);
  if (!area?.bbox) throw new Error(`Area "${areaSlug}" not found in data/areas.json or has no bbox`);

  const [w, s, e, n] = area.bbox;
  const bbox = `${s},${w},${n},${e}`;
  const selectors = [
    "[amenity=restaurant]",
    "[amenity=cafe]",
    "[amenity=fast_food]",
    "[amenity=food_court]",
    "[amenity=ice_cream]",
    "[shop=bakery]",
    "[shop=pastry]",
  ];

  console.log(`Fetching food places for ${area.name} (bbox ${area.bbox.join(", ")})…`);
  const places = await cachedOverpass(
    `${area.slug}.places`,
    `[out:json][timeout:90];(${selectors.map((sel) => `nwr(${bbox})${sel};`).join("")});out tags center;`,
    useCache,
  );
  console.log(`  ${places.length} raw elements`);

  console.log("Fetching named building outlines…");
  let buildingWays: OsmElement[] = [];
  try {
    buildingWays = await cachedOverpass(
      `${area.slug}.buildings`,
      `[out:json][timeout:90];way(${bbox})[building][name];out tags geom;`,
      useCache,
    );
    console.log(`  ${buildingWays.length} named buildings`);
  } catch (error) {
    // Building outlines only refine grouping; addr:housename still works without them.
    console.warn(`  skipping building outlines: ${String(error)}`);
  }

  type Draft = RestaurantRecord & { _street?: string; _house?: string };
  const drafts: Draft[] = [];
  const seenNames = new Map<string, Draft>();

  for (const el of places.sort((a, b) => `${a.type}${a.id}`.localeCompare(`${b.type}${b.id}`))) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    if (tags.disused === "yes" || tags["disused:amenity"]) continue;

    const names = splitNames(tags);
    if (!names) continue; // unnamed places can't be meaningfully tracked

    const address = addressFor(tags);
    const locality = [tags["addr:street"], tags["addr:city"], tags["addr:suburb"], address].filter(Boolean).join(" ");
    if (EXCLUDED_LOCALITIES.test(locality)) continue;

    const name = titleCaseIfShouting(names.name);

    // Collapse exact duplicates (same name within 30 m) — common when a place is
    // mapped both as a node and as part of a building.
    const dupKey = name.toLowerCase();
    const dup = seenNames.get(dupKey);
    if (dup && metersBetween(dup.latitude, dup.longitude, lat, lon) < 30) continue;

    const draft: Draft = {
      slug: undefined,
      name,
      name_bn: names.nameBn,
      area: area.slug,
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lon.toFixed(7)),
      categories: categoriesFor(tags, name, categories),
      address,
      building: tags["addr:housename"]?.trim() || null,
      floor: floorFor(tags),
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      osm_id: `${el.type}/${el.id}`,
      source: "osm",
      _street: tags["addr:street"]?.toLowerCase().replace(/\s+/g, " ").trim(),
      _house: tags["addr:housenumber"]?.toLowerCase().trim(),
    };
    seenNames.set(dupKey, draft);
    drafts.push(draft);
  }

  // Normalise housename spelling ("Paradise tower" / "Paradise Tower").
  const canonicalBuilding = new Map<string, string>();
  for (const d of drafts) {
    if (!d.building) continue;
    const key = slugify(d.building);
    const existing = canonicalBuilding.get(key);
    if (!existing || (d.building !== d.building.toLowerCase() && existing === existing.toLowerCase())) {
      canonicalBuilding.set(key, d.building);
    }
  }
  for (const d of drafts) if (d.building) d.building = canonicalBuilding.get(slugify(d.building))!;

  // 2. Point-in-polygon against named OSM buildings.
  const polygons = buildingWays
    .filter((w) => w.geometry && w.geometry.length >= 4 && w.tags?.name)
    .map((w) => ({ name: w.tags!.name, id: `way/${w.id}`, ring: w.geometry!, centroid: ringCentroid(w.geometry!) }));
  for (const d of drafts) {
    const hit = polygons.find((p) => pointInRing(d.longitude, d.latitude, p.ring));
    if (!hit) continue;
    if (!d.building) d.building = hit.name;
    if (slugify(d.building) === slugify(hit.name)) {
      d.building_latitude = Number(hit.centroid[0].toFixed(7));
      d.building_longitude = Number(hit.centroid[1].toFixed(7));
      d.building_osm_id = hit.id;
    }
  }

  // 3. Same house number + street, close together → an (unnamed) shared building.
  const byAddress = new Map<string, Draft[]>();
  for (const d of drafts) {
    if (d.building || !d._house || !d._street) continue;
    const key = `${d._house}|${d._street}`;
    byAddress.set(key, [...(byAddress.get(key) ?? []), d]);
  }
  for (const group of byAddress.values()) {
    if (group.length < 2) continue;
    const [first] = group;
    const close = group.filter((d) => metersBetween(first.latitude, first.longitude, d.latitude, d.longitude) < 40);
    if (close.length < 2) continue;
    const street = drafts.find((d) => d === first)?.address?.match(/House [^,]+, ([^,]+)/)?.[1] ?? first._street;
    const label = `House ${first._house!.replace(/^house\s*/i, "")}, ${street}`;
    for (const d of close) d.building = label;
  }

  // Buildings that only ever hold one restaurant are just an address detail.
  const counts = new Map<string, number>();
  for (const d of drafts) if (d.building) counts.set(d.building, (counts.get(d.building) ?? 0) + 1);
  for (const d of drafts) {
    if (d.building && (counts.get(d.building) ?? 0) < 2) {
      d.building = null;
      delete d.building_latitude;
      delete d.building_longitude;
      delete d.building_osm_id;
    }
  }

  const restaurants: RestaurantRecord[] = drafts
    .map(({ _street: _s, _house: _h, ...r }) => r)
    .sort((a, b) => a.name.localeCompare(b.name));
  // Stable slugs: name-based, disambiguated by OSM id.
  const slugCounts = new Map<string, number>();
  for (const r of restaurants) slugCounts.set(slugify(r.name), (slugCounts.get(slugify(r.name)) ?? 0) + 1);
  for (const r of restaurants) {
    const base = slugify(r.name) || "restaurant";
    r.slug = slugCounts.get(base)! > 1 ? `${base}-${r.osm_id!.split("/")[1]}` : base;
  }

  const output = {
    source: "OpenStreetMap via Overpass API",
    license: "ODbL-1.0",
    attribution: "© OpenStreetMap contributors (https://www.openstreetmap.org/copyright)",
    generated_at: new Date().toISOString(),
    area: area.slug,
    note:
      "Restaurants mapped in OpenStreetMap within the area's bounding box. This is not a complete list of every restaurant in the area.",
    restaurants,
  };

  const outPath = join(ROOT, "data/restaurants", `${area.slug}.osm.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  const buildingTotal = new Set(restaurants.map((r) => r.building).filter(Boolean)).size;
  console.log(`Wrote ${restaurants.length} restaurants (${buildingTotal} shared buildings) → ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

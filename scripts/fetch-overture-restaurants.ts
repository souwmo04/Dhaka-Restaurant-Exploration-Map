/**
 * Fetches food places for one area from Overture Maps (https://overturemaps.org)
 * and writes them in the BiteAtlas import format to
 * data/restaurants/<area>.overture.json — merged-friendly with the OSM file.
 *
 *   npm run data:fetch-overture -- uttara            # query Overture (cached to data/raw)
 *   npm run data:fetch-overture -- uttara --cached   # re-process the cached response
 *
 * Overture places are open data (CDLA-Permissive-2.0; some sources Apache-2.0),
 * aggregated from Meta, Microsoft, Foursquare and others. Keep the attribution.
 *
 * Processing:
 *   - keep places inside the area's boundary_geojson (or bbox)
 *   - keep food categories, drop lounges/bars/shops, require confidence ≥ MIN_CONFIDENCE
 *   - drop places that duplicate an OpenStreetMap restaurant (similar name within 80 m)
 *     and de-duplicate within Overture (keep the highest confidence)
 *   - map Overture's taxonomy onto BiteAtlas categories (data/categories.json)
 */
import { DuckDBInstance } from "@duckdb/node-api";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { restaurantsOf, slugify, type AreaRecord, type CategoryRecord, type RestaurantFile, type RestaurantRecord } from "../src/lib/catalog/import-format";
import { metersBetween, pointInArea } from "../src/lib/geo";

const ROOT = join(__dirname, "..");
const RELEASE = process.env.OVERTURE_RELEASE ?? "2026-09-23.1";
const MIN_CONFIDENCE = Number(process.env.OVERTURE_MIN_CONFIDENCE ?? 0.5);
const DUPLICATE_RADIUS_M = 80;

/** Places in Dhaka (and beyond) whose name in an address suggests a different area. */
const PLACE_NAMES = [
  "uttara", "mirpur", "dhanmondi", "gulshan", "banani", "mohammadpur", "badda", "bashundhara", "motijheel",
  "farmgate", "tejgaon", "mohakhali", "khilgaon", "rampura", "baridhara", "shyamoli", "lalmatia", "wari",
  "chittagong", "chattogram", "sylhet", "narayanganj", "savar", "gazipur", "tongi", "dakshinkhan", "uttarkhan",
];

/**
 * An address that names another part of Dhaka, and none of this area's own
 * aliases, means the pin is mis-geocoded (e.g. a Mirpur address placed in Uttara).
 */
function namesOtherArea(addr: string, area: AreaRecord): boolean {
  const text = addr.toLowerCase();
  const own = area.address_aliases ?? [area.slug];
  if (own.some((alias) => text.includes(alias))) return false;
  return PLACE_NAMES.filter((n) => !own.includes(n)).some((n) => new RegExp(`\\b${n}\\b`).test(text));
}

/** Overture food categories we don't count as restaurants. */
const EXCLUDED_CATEGORIES = new Set([
  "airport_lounge",
  "lounge",
  "bar",
  "pub",
  "night_club",
  "internet_cafe",
  "candy_store",
  "grocery_store",
  "liquor_store",
  "beverage_store",
  "food_delivery_service",
  "catering_service",
  "hookah_bar",
]);

type OverturePlace = {
  id: string;
  name: string | null;
  name_bn: string | null;
  lng: number;
  lat: number;
  confidence: number;
  cat: string | null;
  alts: string[] | null;
  hier: string[] | null;
  addr: string | null;
  phone: string | null;
  website: string | null;
  brand: string | null;
  datasets: string[];
};

async function queryOverture(area: AreaRecord): Promise<OverturePlace[]> {
  const [w, s, e, n] = area.bbox!;
  const db = await DuckDBInstance.create();
  const con = await db.connect();
  await con.run("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';");
  const reader = await con.runAndReadAll(`
    SELECT id, names.primary AS name, names.common['bn'] AS name_bn,
           ST_X(geometry) AS lng, ST_Y(geometry) AS lat, confidence,
           taxonomy.primary AS cat, taxonomy.alternates AS alts, taxonomy.hierarchy AS hier,
           addresses[1].freeform AS addr, phones[1] AS phone, websites[1] AS website,
           brand.names.primary AS brand,
           list_transform(sources, x -> x.dataset) AS datasets
    FROM read_parquet('s3://overturemaps-us-west-2/release/${RELEASE}/theme=places/type=place/*')
    WHERE bbox.xmin BETWEEN ${w} AND ${e} AND bbox.ymin BETWEEN ${s} AND ${n}
      AND list_contains(taxonomy.hierarchy, 'food_and_drink')
  `);
  return reader.getRowObjectsJson() as unknown as OverturePlace[];
}

/** Lower-case name tokens without filler words, for duplicate detection. */
function nameKey(name: string): Set<string> {
  const stop = new Set(["restaurant", "restora", "resturant", "cafe", "café", "and", "the", "uttara", "dhaka", "bd", "ltd", "&", "sector", "branch", "outlet"]);
  return new Set(
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9ঀ-৿]+/)
      .filter((t) => t.length > 1 && !stop.has(t)),
  );
}

function similarNames(a: string, b: string): boolean {
  const ka = nameKey(a);
  const kb = nameKey(b);
  if (ka.size === 0 || kb.size === 0) return false;
  let shared = 0;
  for (const t of ka) if (kb.has(t)) shared++;
  return shared / Math.min(ka.size, kb.size) >= 0.6;
}

/** "PIZZA HUT UTTARA!!" → "Pizza Hut Uttara". Leaves normal casing and short acronyms alone. */
function cleanName(raw: string): string {
  let name = raw.replace(/\s+/g, " ").replace(/[!]{2,}/g, "!").trim();
  if (name.length > 5 && name === name.toUpperCase() && /[A-Z]{4,}/.test(name)) {
    name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

function categoriesFor(place: OverturePlace, categories: CategoryRecord[]): string[] {
  const out: string[] = [];
  const add = (slug: string) => {
    if (!out.includes(slug)) out.push(slug);
  };
  for (const c of [place.cat, ...(place.alts ?? [])]) {
    const match = c ? categories.find((cat) => cat.overture?.includes(c)) : undefined;
    if (match && match.slug !== "restaurant") add(match.slug);
  }
  const lower = (place.name ?? "").toLowerCase();
  for (const c of categories) if (c.name_keywords?.some((k) => lower.includes(k))) add(c.slug);
  if (out.length === 0) add("restaurant");
  return out;
}

/** Buildings mentioned in free-form addresses: "Rajlaxmi Complex, Sector 3" → "Rajlaxmi Complex". */
function buildingFromAddress(addr: string | null): string | null {
  if (!addr) return null;
  const m = addr.match(/([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,3}\s+(?:Tower|Complex|Plaza|Square|Mall|Centre|Center|Market|Bhaban|Bhabon|City|Arcade|Shopping))\b/);
  // "Beside Of BNS Center" → "BNS Center"
  return m ? m[1].replace(/^((beside|opposite|opp|near|behind|in front|front|of|at|the)\s+)+/i, "").trim() : null;
}

async function main() {
  const args = process.argv.slice(2);
  const useCache = args.includes("--cached");
  const areaSlug = args.find((a) => !a.startsWith("--")) ?? "uttara";
  const areas = JSON.parse(readFileSync(join(ROOT, "data/areas.json"), "utf8")) as AreaRecord[];
  const categories = JSON.parse(readFileSync(join(ROOT, "data/categories.json"), "utf8")) as CategoryRecord[];
  const area = areas.find((a) => a.slug === areaSlug);
  if (!area?.bbox) throw new Error(`Area "${areaSlug}" not found in data/areas.json or has no bbox`);

  const cacheFile = join(ROOT, "data/raw", `${area.slug}.overture.json`);
  let places: OverturePlace[];
  if (useCache) {
    if (!existsSync(cacheFile)) throw new Error(`No cached response at ${cacheFile}; run without --cached first`);
    places = (JSON.parse(readFileSync(cacheFile, "utf8")) as { places: OverturePlace[] }).places;
  } else {
    console.log(`Querying Overture ${RELEASE} for ${area.name}… (this scans remote parquet; allow a few minutes)`);
    places = await queryOverture(area);
    mkdirSync(join(ROOT, "data/raw"), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({ release: RELEASE, fetched_at: new Date().toISOString(), places }) + "\n");
  }
  console.log(`  ${places.length} food & drink places in bbox`);

  const osmFile = join(ROOT, "data/restaurants", `${area.slug}.osm.json`);
  const osm: RestaurantRecord[] = existsSync(osmFile) ? restaurantsOf(JSON.parse(readFileSync(osmFile, "utf8")) as RestaurantFile) : [];

  const stats = { outside: 0, otherArea: 0, category: 0, confidence: 0, unnamed: 0, osmDuplicate: 0, selfDuplicate: 0 };
  const kept: (RestaurantRecord & { _confidence: number })[] = [];

  for (const p of [...places].sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id))) {
    if (!p.name?.trim()) {
      stats.unnamed++;
      continue;
    }
    if (!pointInArea(p.lng, p.lat, area)) {
      stats.outside++;
      continue;
    }
    if (p.addr && namesOtherArea(p.addr, area)) {
      stats.otherArea++;
      continue;
    }
    if (p.cat && EXCLUDED_CATEGORIES.has(p.cat)) {
      stats.category++;
      continue;
    }
    if (p.confidence < MIN_CONFIDENCE) {
      stats.confidence++;
      continue;
    }
    const name = cleanName(p.name);
    if (osm.some((o) => metersBetween(o.longitude, o.latitude, p.lng, p.lat) < DUPLICATE_RADIUS_M && similarNames(o.name, name))) {
      stats.osmDuplicate++;
      continue;
    }
    if (kept.some((k) => metersBetween(k.longitude, k.latitude, p.lng, p.lat) < DUPLICATE_RADIUS_M && similarNames(k.name, name))) {
      stats.selfDuplicate++;
      continue;
    }
    kept.push({
      name,
      name_bn: p.name_bn ?? null,
      area: area.slug,
      latitude: Number(p.lat.toFixed(7)),
      longitude: Number(p.lng.toFixed(7)),
      categories: categoriesFor(p, categories),
      address: p.addr?.trim() || null,
      building: buildingFromAddress(p.addr),
      phone: p.phone ?? null,
      website: p.website ?? null,
      overture_id: p.id,
      source: "overture",
      _confidence: p.confidence,
    });
  }

  // Merge spelling variants of one building ("Grand Zam Zam Tower" / "Zamzam Tower")
  // when they're close together: compare names without spaces or punctuation.
  const compact = (b: string) => b.toLowerCase().replace(/[^a-z0-9]/g, "");
  const withBuilding = kept.filter((k) => k.building);
  for (const a of withBuilding) {
    for (const b of withBuilding) {
      if (a === b || !a.building || !b.building || a.building === b.building) continue;
      const [ka, kb] = [compact(a.building), compact(b.building)];
      const related = ka === kb || ka.endsWith(kb) || kb.endsWith(ka);
      if (related && metersBetween(a.longitude, a.latitude, b.longitude, b.latitude) < 120) {
        const canonical = a.building.length >= b.building.length ? a.building : b.building;
        for (const k of withBuilding) if (k.building === a.building || k.building === b.building) k.building = canonical;
      }
    }
  }

  // Building names that only one restaurant mentions are just address detail.
  const counts = new Map<string, number>();
  for (const k of kept) if (k.building) counts.set(slugify(k.building), (counts.get(slugify(k.building)) ?? 0) + 1);
  for (const k of kept) if (k.building && (counts.get(slugify(k.building)) ?? 0) < 2) k.building = null;

  // Slugs must not collide with the OSM file's slugs.
  const taken = new Set(osm.map((o) => o.slug ?? slugify(o.name)));
  const restaurants: RestaurantRecord[] = kept
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ _confidence: _c, ...r }) => {
      let slug = slugify(r.name) || "restaurant";
      if (taken.has(slug)) slug = `${slug}-${r.overture_id!.slice(0, 6)}`;
      taken.add(slug);
      return { ...r, slug };
    });

  const output = {
    source: `Overture Maps Foundation, places theme, release ${RELEASE}`,
    license: "CDLA-Permissive-2.0 (some records Apache-2.0)",
    attribution: "© Overture Maps Foundation and contributors (https://overturemaps.org) — includes data from Meta, Microsoft and Foursquare",
    generated_at: new Date().toISOString(),
    area: area.slug,
    note: `Food places inside the area outline with confidence ≥ ${MIN_CONFIDENCE}, excluding duplicates of OpenStreetMap entries. Not a complete list of every restaurant in the area.`,
    restaurants,
  };
  writeFileSync(join(ROOT, "data/restaurants", `${area.slug}.overture.json`), JSON.stringify(output, null, 2) + "\n");
  console.log(`  filtered: ${JSON.stringify(stats)}`);
  console.log(`Wrote ${restaurants.length} restaurants → data/restaurants/${area.slug}.overture.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

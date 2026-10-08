/**
 * Loads catalog data from /data into Supabase. Idempotent: rows are upserted on
 * their natural keys (area/category/building/restaurant slugs), so re-running it
 * updates existing records instead of duplicating them.
 *
 *   npm run db:import                                  # every file in data/restaurants
 *   npm run db:import -- data/restaurants/extra.csv    # specific JSON/CSV files
 *   npm run db:import -- --dry-run                     # validate only
 *
 * A full import (no file arguments) also deactivates previously imported
 * restaurants that are no longer in the data files.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only)
 * in .env.local. The service role bypasses RLS — never ship it to the browser.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import {
  csvRowToRecord,
  parseCsv,
  restaurantsOf,
  validateRestaurants,
  type AreaRecord,
  type CategoryRecord,
  type RestaurantFile,
  type RestaurantRecord,
} from "../src/lib/catalog/import-format";
import { normalizeCatalog } from "../src/lib/catalog/normalize";

const ROOT = join(__dirname, "..");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

function readRecords(file: string): RestaurantRecord[] {
  const text = readFileSync(file, "utf8");
  if (extname(file).toLowerCase() === ".csv") return parseCsv(text).map(csvRowToRecord);
  return restaurantsOf(JSON.parse(text) as RestaurantFile);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function main() {
  loadEnvFile(join(ROOT, ".env.local"));
  loadEnvFile(join(ROOT, ".env"));

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileArgs = args.filter((a) => !a.startsWith("--"));
  const dataDir = join(ROOT, "data/restaurants");
  const files = fileArgs.length
    ? fileArgs.map((f) => resolve(f))
    : readdirSync(dataDir)
        .filter((f) => /\.(json|csv)$/i.test(f))
        .map((f) => join(dataDir, f));

  const areas = JSON.parse(readFileSync(join(ROOT, "data/areas.json"), "utf8")) as AreaRecord[];
  const categories = JSON.parse(readFileSync(join(ROOT, "data/categories.json"), "utf8")) as CategoryRecord[];

  const records: RestaurantRecord[] = [];
  for (const file of files) {
    const fileRecords = readRecords(file);
    const issues = validateRestaurants(fileRecords);
    if (issues.length) {
      console.error(`✗ ${file}`);
      for (const i of issues) console.error(`   #${i.index} ${i.name}: ${i.message}`);
      process.exit(1);
    }
    console.log(`✓ ${file} — ${fileRecords.length} restaurants`);
    records.push(...fileRecords);
  }

  const plan = normalizeCatalog(areas, categories, records);
  for (const w of plan.warnings) console.warn(`  ! ${w}`);
  console.log(
    `Plan: ${areas.length} areas, ${categories.length} categories, ${plan.buildings.length} buildings, ${plan.restaurants.length} restaurants`,
  );
  if (dryRun) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  // Areas
  {
    const { error } = await db.from("areas").upsert(
      areas.map((a) => ({
        slug: a.slug,
        name: a.name,
        city: a.city ?? "Dhaka",
        description: a.description ?? null,
        latitude: a.latitude,
        longitude: a.longitude,
        zoom: a.zoom ?? 14,
        bbox: a.bbox ?? null,
        boundary_geojson: a.boundary_geojson ?? null,
        boundary_source: a.boundary_source ?? null,
        active: a.active ?? false,
        sort_order: a.sort_order ?? 0,
      })),
      { onConflict: "slug" },
    );
    fail("areas", error);
  }
  const { data: areaRows, error: areaErr } = await db.from("areas").select("id, slug");
  fail("areas", areaErr);
  const areaId = new Map(areaRows!.map((r) => [r.slug as string, r.id as string]));

  // Categories
  {
    const { error } = await db.from("categories").upsert(
      categories.map((c, i) => ({ slug: c.slug, name: c.name, emoji: c.emoji ?? null, sort_order: i })),
      { onConflict: "slug" },
    );
    fail("categories", error);
  }
  const { data: categoryRows, error: catErr } = await db.from("categories").select("id, slug");
  fail("categories", catErr);
  const categoryId = new Map(categoryRows!.map((r) => [r.slug as string, r.id as string]));

  // Buildings
  for (const batch of chunk(plan.buildings, 500)) {
    const { error } = await db.from("buildings").upsert(
      batch.map((b) => ({
        slug: b.slug,
        area_id: areaId.get(b.areaSlug)!,
        name: b.name,
        address: b.address,
        latitude: b.latitude,
        longitude: b.longitude,
        osm_id: b.osmId,
      })),
      { onConflict: "slug" },
    );
    fail("buildings", error);
  }
  const { data: buildingRows, error: bErr } = await db.from("buildings").select("id, slug");
  fail("buildings", bErr);
  const buildingId = new Map(buildingRows!.map((r) => [r.slug as string, r.id as string]));

  // Restaurants
  for (const batch of chunk(plan.restaurants, 500)) {
    const { error } = await db.from("restaurants").upsert(
      batch.map((r) => ({
        slug: r.slug,
        name: r.name,
        name_bn: r.nameBn,
        area_id: areaId.get(r.areaSlug)!,
        building_id: r.buildingSlug ? buildingId.get(r.buildingSlug)! : null,
        latitude: r.latitude,
        longitude: r.longitude,
        floor: r.floor,
        address: r.address,
        phone: r.phone,
        website: r.website,
        rating: r.rating,
        rating_count: r.ratingCount,
        photo_url: r.photoUrl,
        google_place_id: r.googlePlaceId,
        osm_id: r.osmId,
        overture_id: r.overtureId,
        source: r.source,
        active: r.active,
      })),
      { onConflict: "slug" },
    );
    fail("restaurants", error);
  }
  // Look ids up in batches: hundreds of slugs in one `in` filter overflow the URL.
  const restaurantId = new Map<string, string>();
  for (const batch of chunk(
    plan.restaurants.map((r) => r.slug),
    150,
  )) {
    const { data, error } = await db.from("restaurants").select("id, slug").in("slug", batch);
    fail("restaurants", error);
    for (const r of data!) restaurantId.set(r.slug, r.id);
  }

  // Categories per restaurant: replace the imported restaurants' links.
  const ids = [...restaurantId.values()];
  for (const batch of chunk(ids, 200)) {
    const { error } = await db.from("restaurant_categories").delete().in("restaurant_id", batch);
    fail("restaurant_categories (clear)", error);
  }
  const links = plan.restaurants.flatMap((r) =>
    r.categorySlugs
      .filter((slug) => categoryId.has(slug))
      .map((slug, i) => ({
        restaurant_id: restaurantId.get(r.slug)!,
        category_id: categoryId.get(slug)!,
        is_primary: i === 0,
      })),
  );
  for (const batch of chunk(links, 1000)) {
    const { error } = await db.from("restaurant_categories").insert(batch);
    fail("restaurant_categories", error);
  }

  // Sync: restaurants from the imported sources/areas that are no longer in the
  // data are deactivated (not deleted — users' visit history stays intact).
  // Manually added restaurants (source "manual") are never touched.
  if (!fileArgs.length) {
    const importedSlugs = new Set(plan.restaurants.map((r) => r.slug));
    const sources = [...new Set(plan.restaurants.map((r) => r.source))].filter((src) => src !== "manual");
    const areaIds = [...new Set(plan.restaurants.map((r) => areaId.get(r.areaSlug)!))];
    const { data: existing, error: exErr } = await db
      .from("restaurants")
      .select("id, slug")
      .eq("active", true)
      .in("source", sources)
      .in("area_id", areaIds);
    fail("restaurants (sync)", exErr);
    const stale = (existing ?? []).filter((r) => !importedSlugs.has(r.slug)).map((r) => r.id);
    for (const batch of chunk(stale, 200)) {
      const { error } = await db.from("restaurants").update({ active: false }).in("id", batch);
      fail("restaurants (deactivate)", error);
    }
    if (stale.length) console.log(`Deactivated ${stale.length} restaurants no longer in the data files.`);
  }

  console.log(`Imported ${plan.restaurants.length} restaurants and ${plan.buildings.length} buildings.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

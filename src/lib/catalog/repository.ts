import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import type { Area, BBox, Catalog, Restaurant } from "@/types/domain";
import { buildSnapshotCatalog } from "./snapshot";

export const CATALOG_TAG = "catalog";
const PAGE_SIZE = 1000;

export class CatalogUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Restaurant data is temporarily unavailable", { cause });
    this.name = "CatalogUnavailableError";
  }
}

/**
 * The public restaurant catalog: areas, categories, buildings and active
 * restaurants. Cached and shared across users; admin edits call
 * `updateTag(CATALOG_TAG)` to refresh it.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const db = getPublicSupabase();
  if (!db) return buildSnapshotCatalog();

  try {
    const [areas, categories, buildings, restaurants] = await Promise.all([
      db.from("areas").select("*").order("sort_order"),
      db.from("categories").select("id, slug, name, emoji").order("sort_order"),
      db.from("buildings").select("id, slug, name, address, area_id, latitude, longitude"),
      fetchAllRestaurants(db),
    ]);
    for (const res of [areas, categories, buildings]) if (res.error) throw res.error;

    return {
      origin: "database",
      areas: areas.data!.map(
        (a): Area => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          city: a.city,
          description: a.description,
          center: [a.longitude, a.latitude],
          zoom: a.zoom,
          bbox: a.bbox && a.bbox.length === 4 ? (a.bbox as BBox) : null,
          boundary: (a.boundary_geojson as Area["boundary"]) ?? null,
          active: a.active,
          sortOrder: a.sort_order,
        }),
      ),
      categories: categories.data!,
      buildings: buildings.data!.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        address: b.address,
        areaId: b.area_id,
        position: [b.longitude, b.latitude],
      })),
      restaurants,
    };
  } catch (error) {
    throw new CatalogUnavailableError(error);
  }
}

type PublicDb = NonNullable<ReturnType<typeof getPublicSupabase>>;

async function fetchAllRestaurants(db: PublicDb): Promise<Restaurant[]> {
  const out: Restaurant[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("restaurants")
      .select(
        "id, slug, name, name_bn, area_id, building_id, latitude, longitude, floor, address, phone, website, rating, rating_count, photo_url, google_place_id, osm_id, source, restaurant_categories(category_id, is_primary)",
      )
      .eq("active", true)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    for (const r of data) {
      const links = [...r.restaurant_categories].sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
      out.push({
        id: r.id,
        slug: r.slug,
        name: r.name,
        nameBn: r.name_bn,
        areaId: r.area_id,
        buildingId: r.building_id,
        position: [r.longitude, r.latitude],
        floor: r.floor,
        address: r.address,
        phone: r.phone,
        website: r.website,
        rating: r.rating === null ? null : Number(r.rating),
        ratingCount: r.rating_count,
        photoUrl: r.photo_url,
        categoryIds: links.map((l) => l.category_id),
        googlePlaceId: r.google_place_id,
        osmId: r.osm_id,
        source: r.source,
      });
    }
    if (data.length < PAGE_SIZE) return out;
  }
}

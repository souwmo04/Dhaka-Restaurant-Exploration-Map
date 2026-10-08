import "server-only";

import type { Area, BBox, Catalog } from "@/types/domain";
import { restaurantsOf } from "./import-format";
import { normalizeCatalog } from "./normalize";
import { snapshotSources } from "./snapshot-data";

/**
 * Builds the catalog from the bundled /data files. IDs are the stable slugs,
 * which is also what guest (browser-only) progress is keyed on.
 */
export function buildSnapshotCatalog(): Catalog {
  const { areas, categories, restaurantFiles } = snapshotSources;
  const plan = normalizeCatalog(areas, categories, restaurantFiles.flatMap(restaurantsOf));

  return {
    origin: "snapshot",
    areas: areas
      .map(
        (a): Area => ({
          id: a.slug,
          slug: a.slug,
          name: a.name,
          city: a.city ?? "Dhaka",
          description: a.description ?? null,
          center: [a.longitude, a.latitude],
          zoom: a.zoom ?? 14,
          bbox: (a.bbox as BBox | undefined) ?? null,
          boundary: a.boundary_geojson ?? null,
          active: a.active ?? false,
          sortOrder: a.sort_order ?? 0,
        }),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder),
    categories: categories.map((c) => ({ id: c.slug, slug: c.slug, name: c.name, emoji: c.emoji ?? null })),
    buildings: plan.buildings.map((b) => ({
      id: b.slug,
      slug: b.slug,
      name: b.name,
      address: b.address,
      areaId: b.areaSlug,
      position: [b.longitude, b.latitude],
    })),
    restaurants: plan.restaurants
      .filter((r) => r.active)
      .map((r) => ({
        id: r.slug,
        slug: r.slug,
        name: r.name,
        nameBn: r.nameBn,
        areaId: r.areaSlug,
        buildingId: r.buildingSlug,
        position: [r.longitude, r.latitude],
        floor: r.floor,
        address: r.address,
        phone: r.phone,
        website: r.website,
        rating: r.rating,
        ratingCount: r.ratingCount,
        photoUrl: r.photoUrl,
        categoryIds: r.categorySlugs,
        googlePlaceId: r.googlePlaceId,
        osmId: r.osmId,
        source: r.source,
      })),
  };
}

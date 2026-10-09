import {
  categoriesOf,
  floorOf,
  slugify,
  type AreaRecord,
  type CategoryRecord,
  type RestaurantRecord,
} from "./import-format";

export const FALLBACK_CATEGORY_SLUG = "restaurant";

export type NormalizedBuilding = {
  slug: string;
  areaSlug: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  osmId: string | null;
};

export type NormalizedRestaurant = {
  slug: string;
  name: string;
  nameBn: string | null;
  areaSlug: string;
  buildingSlug: string | null;
  latitude: number;
  longitude: number;
  floor: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  photoUrl: string | null;
  googlePlaceId: string | null;
  osmId: string | null;
  overtureId: string | null;
  source: NonNullable<RestaurantRecord["source"]>;
  active: boolean;
  /** Primary first. */
  categorySlugs: string[];
};

export type NormalizedCatalog = {
  buildings: NormalizedBuilding[];
  restaurants: NormalizedRestaurant[];
  warnings: string[];
};

/**
 * Resolves area/category references, assigns stable slugs, and groups
 * restaurants that share a building into building records.
 */
export function normalizeCatalog(
  areas: AreaRecord[],
  categories: CategoryRecord[],
  records: RestaurantRecord[],
): NormalizedCatalog {
  const warnings: string[] = [];

  const areaLookup = new Map<string, string>();
  for (const a of areas) {
    areaLookup.set(a.slug.toLowerCase(), a.slug);
    areaLookup.set(a.name.toLowerCase(), a.slug);
  }

  const categoryLookup = new Map<string, string>();
  for (const c of categories) {
    categoryLookup.set(c.slug.toLowerCase(), c.slug);
    categoryLookup.set(c.name.toLowerCase(), c.slug);
    categoryLookup.set(slugify(c.name), c.slug);
  }

  // Slugs must be stable across imports (they key upserts and deep links).
  // A name used in more than one area gets the area as suffix ("bfc-gulshan"),
  // so adding another area's file can never shift which restaurant a slug means.
  const baseOf = (r: RestaurantRecord) => (r.slug ? slugify(r.slug) : slugify(r.name)) || "restaurant";
  const areasByBase = new Map<string, Set<string>>();
  for (const r of records) {
    const area = areaLookup.get(r.area.trim().toLowerCase());
    if (!area) continue;
    const set = areasByBase.get(baseOf(r)) ?? new Set<string>();
    set.add(area);
    areasByBase.set(baseOf(r), set);
  }
  const usedSlugs = new Set<string>();
  const uniqueSlug = (base: string, areaSlug: string) => {
    const scoped = (areasByBase.get(base)?.size ?? 0) > 1 ? `${base}-${areaSlug}` : base;
    let slug = scoped;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${scoped}-${n}`;
    usedSlugs.add(slug);
    return slug;
  };

  type BuildingDraft = NormalizedBuilding & { members: number; explicitPosition: boolean };
  const buildings = new Map<string, BuildingDraft>();
  const restaurants: NormalizedRestaurant[] = [];

  for (const record of records) {
    const areaSlug = areaLookup.get(record.area.trim().toLowerCase());
    if (!areaSlug) {
      warnings.push(`Skipped "${record.name}": unknown area "${record.area}"`);
      continue;
    }

    const categorySlugs: string[] = [];
    for (const raw of categoriesOf(record)) {
      const slug = categoryLookup.get(raw.toLowerCase()) ?? categoryLookup.get(slugify(raw));
      if (!slug) warnings.push(`"${record.name}": unknown category "${raw}" ignored`);
      else if (!categorySlugs.includes(slug)) categorySlugs.push(slug);
    }
    if (categorySlugs.length === 0) categorySlugs.push(FALLBACK_CATEGORY_SLUG);

    let buildingSlug: string | null = null;
    const buildingName = record.building?.trim();
    if (buildingName) {
      buildingSlug = `${areaSlug}-${slugify(buildingName)}`;
      const hasExplicit = Number.isFinite(record.building_latitude) && Number.isFinite(record.building_longitude);
      const existing = buildings.get(buildingSlug);
      if (!existing) {
        buildings.set(buildingSlug, {
          slug: buildingSlug,
          areaSlug,
          name: buildingName,
          address: record.address ?? null,
          latitude: hasExplicit ? record.building_latitude! : record.latitude,
          longitude: hasExplicit ? record.building_longitude! : record.longitude,
          osmId: record.building_osm_id ?? null,
          members: 1,
          explicitPosition: hasExplicit,
        });
      } else if (!existing.explicitPosition) {
        if (hasExplicit) {
          existing.latitude = record.building_latitude!;
          existing.longitude = record.building_longitude!;
          existing.explicitPosition = true;
        } else {
          // Running mean of member positions.
          existing.latitude += (record.latitude - existing.latitude) / (existing.members + 1);
          existing.longitude += (record.longitude - existing.longitude) / (existing.members + 1);
        }
        existing.members++;
      } else {
        existing.members++;
      }
    }

    restaurants.push({
      slug: uniqueSlug(baseOf(record), areaSlug),
      name: record.name.trim(),
      nameBn: record.name_bn ?? null,
      areaSlug,
      buildingSlug,
      latitude: record.latitude,
      longitude: record.longitude,
      floor: floorOf(record),
      address: record.address ?? null,
      phone: record.phone ?? null,
      website: record.website ?? null,
      rating: record.rating ?? null,
      ratingCount: record.rating_count ?? null,
      photoUrl: record.photo_url ?? null,
      googlePlaceId: record.google_place_id ?? null,
      osmId: record.osm_id ?? null,
      overtureId: record.overture_id ?? null,
      source: record.source ?? "import",
      active: record.active ?? true,
      categorySlugs,
    });
  }

  return {
    buildings: [...buildings.values()].map(({ members: _m, explicitPosition: _e, ...b }) => b),
    restaurants,
    warnings,
  };
}

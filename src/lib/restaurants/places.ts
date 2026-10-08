import { MARKER_IMAGES, type MarkerImageId } from "@/lib/map/markers";
import type { Building, Restaurant, VisitMap } from "@/types/domain";

/**
 * A "place" is one marker on the map: either a standalone restaurant or a
 * building holding several restaurants. Restaurants keep their own identity;
 * the place only decides how they're drawn.
 */
export type PlaceProperties = {
  placeId: string;
  kind: "restaurant" | "building";
  /** Set when the marker stands for exactly one restaurant. */
  restaurantId: string | null;
  /** Set when the place is a building. */
  buildingId: string | null;
  label: string;
  count: number;
  visitedCount: number;
  favoriteCount: number;
  icon: MarkerImageId;
};

export type PlaceCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PlaceProperties>;

export const placeIdForRestaurant = (r: Pick<Restaurant, "id" | "buildingId">) =>
  r.buildingId ? `b:${r.buildingId}` : `r:${r.id}`;

function restaurantIcon(visited: boolean, favorite: boolean): MarkerImageId {
  if (visited && favorite) return MARKER_IMAGES.visitedFavorite;
  if (visited) return MARKER_IMAGES.visited;
  if (favorite) return MARKER_IMAGES.favorite;
  return MARKER_IMAGES.unvisited;
}

function groupIcon(visited: number, count: number): MarkerImageId {
  if (visited === 0) return MARKER_IMAGES.groupNone;
  if (visited >= count) return MARKER_IMAGES.groupAll;
  return MARKER_IMAGES.groupSome;
}

export function buildPlaces(
  restaurants: Restaurant[],
  buildingsById: Map<string, Building>,
  visits: VisitMap,
): PlaceCollection {
  const features: PlaceCollection["features"] = [];
  const groups = new Map<string, Restaurant[]>();

  for (const r of restaurants) {
    if (r.buildingId && buildingsById.has(r.buildingId)) {
      const list = groups.get(r.buildingId);
      if (list) list.push(r);
      else groups.set(r.buildingId, [r]);
      continue;
    }
    const v = visits[r.id];
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: r.position },
      properties: {
        placeId: `r:${r.id}`,
        kind: "restaurant",
        restaurantId: r.id,
        buildingId: null,
        label: r.name,
        count: 1,
        visitedCount: v?.visited ? 1 : 0,
        favoriteCount: v?.favorite ? 1 : 0,
        icon: restaurantIcon(!!v?.visited, !!v?.favorite),
      },
    });
  }

  for (const [buildingId, members] of groups) {
    const building = buildingsById.get(buildingId)!;
    const visitedCount = members.filter((m) => visits[m.id]?.visited).length;
    const favoriteCount = members.filter((m) => visits[m.id]?.favorite).length;
    const single = members.length === 1 ? members[0] : null;

    // A filter can leave one member visible: draw it as a normal pin, but keep
    // the building's place id so selection still resolves to the same marker.
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: building.position },
      properties: {
        placeId: `b:${buildingId}`,
        kind: single ? "restaurant" : "building",
        restaurantId: single?.id ?? null,
        buildingId,
        label: single?.name ?? building.name,
        count: members.length,
        visitedCount,
        favoriteCount,
        icon: single
          ? restaurantIcon(visitedCount > 0, favoriteCount > 0)
          : groupIcon(visitedCount, members.length),
      },
    });
  }

  return { type: "FeatureCollection", features };
}

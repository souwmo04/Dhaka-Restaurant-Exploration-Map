import { placeIdForRestaurant } from "@/lib/restaurants/places";
import type { Restaurant } from "@/types/domain";

export type GroupSelection = {
  kind: "group";
  groupKind: "building" | "overlap";
  title: string;
  subtitle: string | null;
  restaurantIds: string[];
  placeId: string | null;
};

export type RestaurantSelection = {
  kind: "restaurant";
  restaurantId: string;
  /** The building/overlap list it was opened from, for the back button. */
  parent: GroupSelection | null;
};

export type Selection = RestaurantSelection | GroupSelection | null;

export function selectedPlaceId(selection: Selection, restaurantById: Map<string, Restaurant>): string | null {
  if (!selection) return null;
  if (selection.kind === "group") return selection.placeId;
  const r = restaurantById.get(selection.restaurantId);
  return r ? placeIdForRestaurant(r) : null;
}

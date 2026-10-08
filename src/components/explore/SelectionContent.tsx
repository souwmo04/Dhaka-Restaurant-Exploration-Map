"use client";

import { useId } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { PlaceGroupPanel } from "@/components/restaurants/PlaceGroupPanel";
import { RestaurantPanel } from "@/components/restaurants/RestaurantPanel";
import type { Restaurant } from "@/types/domain";
import type { GroupSelection, Selection } from "./selection";

/** Renders whatever is selected: one restaurant, or a building/overlap list. */
export function SelectionContent({
  selection,
  onSelectRestaurant,
  onBack,
  onClose,
}: {
  selection: NonNullable<Selection>;
  onSelectRestaurant: (r: Restaurant, parent: GroupSelection | null) => void;
  onBack: (parent: GroupSelection) => void;
  onClose: () => void;
}) {
  const { restaurantById } = useCatalog();
  const headingId = useId();

  if (selection.kind === "restaurant") {
    const restaurant = restaurantById.get(selection.restaurantId);
    if (!restaurant) return null;
    const parent = selection.parent;
    return (
      <RestaurantPanel
        key={restaurant.id}
        restaurant={restaurant}
        headingId={headingId}
        onClose={onClose}
        onBack={parent ? () => onBack(parent) : undefined}
        backLabel={parent ? parent.title : undefined}
      />
    );
  }

  const restaurants = selection.restaurantIds
    .map((id) => restaurantById.get(id))
    .filter((r): r is Restaurant => r !== undefined);

  return (
    <PlaceGroupPanel
      title={selection.title}
      subtitle={selection.subtitle}
      kind={selection.groupKind}
      restaurants={restaurants}
      headingId={headingId}
      onClose={onClose}
      onSelect={(r) => onSelectRestaurant(r, selection)}
    />
  );
}

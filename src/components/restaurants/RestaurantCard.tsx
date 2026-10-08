"use client";

import { Check, Star } from "lucide-react";
import { memo } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { cn } from "@/lib/utils";
import type { Restaurant, Visit } from "@/types/domain";
import { CategoryLabel, useCategoryEmoji } from "./CategoryLabel";

type Props = {
  restaurant: Restaurant;
  visit: Visit | undefined;
  selected?: boolean;
  onSelect: (r: Restaurant) => void;
  /** Hide the building line (e.g. inside a building's own list). */
  hideBuilding?: boolean;
};

export const RestaurantCard = memo(function RestaurantCard({ restaurant, visit, selected, onSelect, hideBuilding }: Props) {
  const { buildingNames } = useCatalog();
  const emoji = useCategoryEmoji(restaurant);
  const building = restaurant.buildingId ? buildingNames.get(restaurant.buildingId) : null;
  const visited = !!visit?.visited;
  const favorite = !!visit?.favorite;

  const location = [
    !hideBuilding && building,
    restaurant.floor && `Floor ${restaurant.floor}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => onSelect(restaurant)}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
        selected ? "bg-tomato-soft" : "hover:bg-paper-deep/70",
      )}
    >
      <span
        className={cn(
          "relative grid size-11 shrink-0 place-items-center rounded-xl text-xl transition-colors",
          visited ? "bg-tomato text-white" : "border border-line bg-surface",
        )}
        aria-hidden
      >
        {visited ? <Check className="size-5" strokeWidth={3} /> : emoji}
        {favorite && (
          <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gold ring-2 ring-surface">
            <Star className="size-3 fill-white text-white" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{restaurant.name}</span>
        <CategoryLabel restaurant={restaurant} max={1} className="mt-0.5 text-[13px]" />
        {location && <span className="block truncate text-xs text-ink-muted">{location}</span>}
      </span>

      <span className="shrink-0 text-right text-xs">
        {restaurant.rating !== null && (
          <span className="flex items-center justify-end gap-0.5 font-medium text-ink">
            <Star className="size-3 fill-gold text-gold" aria-hidden />
            {restaurant.rating.toFixed(1)}
          </span>
        )}
        {visited && <span className="mt-0.5 block font-medium text-tomato-deep">Visited</span>}
        <span className="sr-only">
          {visited ? "Visited." : "Not visited."}
          {favorite ? " Favorite." : ""}
        </span>
      </span>
    </button>
  );
});

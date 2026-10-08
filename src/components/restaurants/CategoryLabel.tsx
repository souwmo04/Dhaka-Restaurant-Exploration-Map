"use client";

import { useCatalog } from "@/components/providers/CatalogProvider";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types/domain";

/** "🍔 Burger · Fast Food" — the restaurant's categories, primary first. */
export function CategoryLabel({ restaurant, max = 2, className }: { restaurant: Restaurant; max?: number; className?: string }) {
  const { categoryById } = useCatalog();
  const cats = restaurant.categoryIds
    .map((id) => categoryById.get(id))
    .filter((c) => c !== undefined)
    .slice(0, max);
  if (cats.length === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-ink-soft", className)}>
      {cats[0].emoji && <span aria-hidden>{cats[0].emoji}</span>}
      <span>{cats.map((c) => c.name).join(" · ")}</span>
    </span>
  );
}

export function useCategoryEmoji(restaurant: Restaurant): string {
  const { categoryById } = useCatalog();
  return categoryById.get(restaurant.categoryIds[0] ?? "")?.emoji ?? "🍽️";
}

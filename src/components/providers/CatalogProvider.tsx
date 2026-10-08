"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Area, Building, Catalog, Category, Restaurant } from "@/types/domain";

export type CatalogIndex = Catalog & {
  areaById: Map<string, Area>;
  areaBySlug: Map<string, Area>;
  categoryById: Map<string, Category>;
  buildingById: Map<string, Building>;
  buildingNames: Map<string, string>;
  restaurantById: Map<string, Restaurant>;
  restaurantBySlug: Map<string, Restaurant>;
  slugToId: Map<string, string>;
  restaurantsByBuilding: Map<string, Restaurant[]>;
  /** Areas that are live, in display order. */
  activeAreas: Area[];
};

const CatalogContext = createContext<CatalogIndex | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const value = useMemo<CatalogIndex>(() => {
    const restaurantsByBuilding = new Map<string, Restaurant[]>();
    for (const r of catalog.restaurants) {
      if (!r.buildingId) continue;
      const list = restaurantsByBuilding.get(r.buildingId);
      if (list) list.push(r);
      else restaurantsByBuilding.set(r.buildingId, [r]);
    }
    for (const list of restaurantsByBuilding.values()) {
      list.sort((a, b) => (a.floor ?? "").localeCompare(b.floor ?? "", undefined, { numeric: true }));
    }
    return {
      ...catalog,
      areaById: new Map(catalog.areas.map((a) => [a.id, a])),
      areaBySlug: new Map(catalog.areas.map((a) => [a.slug, a])),
      categoryById: new Map(catalog.categories.map((c) => [c.id, c])),
      buildingById: new Map(catalog.buildings.map((b) => [b.id, b])),
      buildingNames: new Map(catalog.buildings.map((b) => [b.id, b.name])),
      restaurantById: new Map(catalog.restaurants.map((r) => [r.id, r])),
      restaurantBySlug: new Map(catalog.restaurants.map((r) => [r.slug, r])),
      slugToId: new Map(catalog.restaurants.map((r) => [r.slug, r.id])),
      restaurantsByBuilding,
      activeAreas: catalog.areas.filter((a) => a.active),
    };
  }, [catalog]);

  return <CatalogContext value={value}>{children}</CatalogContext>;
}

export function useCatalog(): CatalogIndex {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within <CatalogProvider>");
  return ctx;
}

/** Primary category, falling back gracefully. */
export function usePrimaryCategory(r: Restaurant): Category | null {
  const { categoryById } = useCatalog();
  return (r.categoryIds[0] && categoryById.get(r.categoryIds[0])) || null;
}

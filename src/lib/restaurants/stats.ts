import type { Category, Restaurant, Visit, VisitMap } from "@/types/domain";

export type CategoryProgress = { category: Category; visited: number; total: number };

/** Visited/total per cuisine, most-explored first. */
export function progressByCategory(categories: Category[], restaurants: Restaurant[], visits: VisitMap): CategoryProgress[] {
  const totals = new Map<string, { visited: number; total: number }>();
  for (const r of restaurants) {
    for (const id of r.categoryIds) {
      const t = totals.get(id) ?? { visited: 0, total: 0 };
      t.total++;
      if (visits[r.id]?.visited) t.visited++;
      totals.set(id, t);
    }
  }
  return categories
    .filter((c) => totals.has(c.id))
    .map((c) => ({ category: c, ...totals.get(c.id)! }))
    .sort((a, b) => b.visited - a.visited || b.visited / b.total - a.visited / a.total || b.total - a.total);
}

export type VisitEntry = { restaurant: Restaurant; visit: Visit };

/** Visited restaurants, newest visit first. */
export function recentVisits(restaurants: Map<string, Restaurant>, visits: VisitMap, limit = 8): VisitEntry[] {
  return Object.values(visits)
    .filter((v) => v.visited && restaurants.has(v.restaurantId))
    .sort((a, b) => (b.visitedAt ?? "").localeCompare(a.visitedAt ?? "") || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
    .map((visit) => ({ visit, restaurant: restaurants.get(visit.restaurantId)! }));
}

/** Number of visits whose date falls in the current calendar month. */
export function visitsThisMonth(visits: VisitMap, today: string): number {
  const month = today.slice(0, 7);
  return Object.values(visits).filter((v) => v.visited && v.visitedAt?.startsWith(month)).length;
}

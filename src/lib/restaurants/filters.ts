import type { Restaurant, VisitMap } from "@/types/domain";

export type StatusFilter = "all" | "visited" | "unvisited" | "favorites";

export type RestaurantFilters = {
  status: StatusFilter;
  /** Category id, or null for all cuisines. */
  categoryId: string | null;
  query: string;
};

export const DEFAULT_FILTERS: RestaurantFilters = { status: "all", categoryId: null, query: "" };

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "visited", label: "Visited" },
  { value: "unvisited", label: "Not visited" },
  { value: "favorites", label: "Favorites" },
];

/** Lower-cases and strips accents/punctuation so "Café" matches "cafe". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]+/g, " ")
    .trim();
}

export function matchesQuery(r: Restaurant, normalizedQuery: string, buildingName?: string): boolean {
  if (!normalizedQuery) return true;
  const haystack = normalizeSearch([r.name, r.nameBn, r.address, buildingName].filter(Boolean).join(" "));
  return normalizedQuery.split(" ").every((term) => haystack.includes(term));
}

export function applyFilters(
  restaurants: Restaurant[],
  filters: RestaurantFilters,
  visits: VisitMap,
  buildingNames: Map<string, string>,
): Restaurant[] {
  const q = normalizeSearch(filters.query);
  return restaurants.filter((r) => {
    const v = visits[r.id];
    if (filters.status === "visited" && !v?.visited) return false;
    if (filters.status === "unvisited" && v?.visited) return false;
    if (filters.status === "favorites" && !v?.favorite) return false;
    if (filters.categoryId && !r.categoryIds.includes(filters.categoryId)) return false;
    return matchesQuery(r, q, r.buildingId ? buildingNames.get(r.buildingId) : undefined);
  });
}

export function isFiltered(filters: RestaurantFilters): boolean {
  return filters.status !== "all" || filters.categoryId !== null || filters.query.trim() !== "";
}

/** Search ranking: name prefix beats word prefix beats any match (address, building, Bangla name). */
export function rankSearch(
  restaurants: Restaurant[],
  query: string,
  buildingNames: Map<string, string>,
  limit = 8,
): Restaurant[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const scored: { r: Restaurant; score: number }[] = [];
  for (const r of restaurants) {
    const name = normalizeSearch(r.name);
    let score = -1;
    if (name.startsWith(q)) score = 3;
    else if (name.split(" ").some((w) => w.startsWith(q))) score = 2;
    else if (matchesQuery(r, q, r.buildingId ? buildingNames.get(r.buildingId) : undefined)) score = 1;
    if (score >= 0) scored.push({ r, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)
    .map((s) => s.r);
}

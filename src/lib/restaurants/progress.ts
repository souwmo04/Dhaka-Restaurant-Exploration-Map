import type { Area, Restaurant, VisitMap } from "@/types/domain";

export type Progress = {
  visited: number;
  total: number;
  /** Precise ratio × 100 — round only for display. */
  percent: number;
};

export function progressOf(restaurants: Restaurant[], visits: VisitMap): Progress {
  const total = restaurants.length;
  const visited = restaurants.reduce((n, r) => n + (visits[r.id]?.visited ? 1 : 0), 0);
  return { visited, total, percent: total === 0 ? 0 : (visited / total) * 100 };
}

export type AreaProgress = Progress & { area: Area };

/** Progress for every area in display order. Inactive areas report a total of 0. */
export function progressByArea(areas: Area[], restaurants: Restaurant[], visits: VisitMap): AreaProgress[] {
  const byArea = new Map<string, Restaurant[]>();
  for (const r of restaurants) {
    const list = byArea.get(r.areaId);
    if (list) list.push(r);
    else byArea.set(r.areaId, [r]);
  }
  return areas.map((area) => ({ area, ...progressOf(area.active ? (byArea.get(area.id) ?? []) : [], visits) }));
}

/** Overall progress across every active area: Σ visited / Σ restaurants. */
export function overallProgress(areas: Area[], restaurants: Restaurant[], visits: VisitMap): Progress {
  const active = new Set(areas.filter((a) => a.active).map((a) => a.id));
  return progressOf(
    restaurants.filter((r) => active.has(r.areaId)),
    visits,
  );
}

/** One decimal for display ("19.8%"). Never shows a non-zero value as 0.0%. */
export function formatPercent(percent: number): string {
  if (percent > 0 && percent < 0.05) return "<0.1%";
  return `${(Math.round(percent * 10) / 10).toFixed(1)}%`;
}

import { todayIso } from "@/lib/utils";
import type { Visit, VisitPatch } from "@/types/domain";

/** Applies a patch with the visit rules: visiting defaults the date to today; un-visiting clears it. */
export function applyVisitPatch(restaurantId: string, prev: Visit | undefined, patch: VisitPatch): Visit {
  const visited = patch.visited ?? prev?.visited ?? false;
  let visitedAt = patch.visitedAt !== undefined ? patch.visitedAt : (prev?.visitedAt ?? null);
  if (!visited) visitedAt = null;
  else if (!visitedAt) visitedAt = todayIso();

  return {
    restaurantId,
    visited,
    visitedAt,
    favorite: patch.favorite ?? prev?.favorite ?? false,
    notes: patch.notes !== undefined ? patch.notes : (prev?.notes ?? null),
    updatedAt: new Date().toISOString(),
  };
}

/** A visit with nothing recorded doesn't need a row. */
export function isEmptyVisit(v: Visit): boolean {
  return !v.visited && !v.favorite && !v.notes?.trim();
}

/**
 * Merges guest progress into account progress (used once, at sign-in).
 * Visited/favorite are OR-ed; the earliest visit date and any existing notes win.
 */
export function mergeVisits(account: Visit | undefined, guest: Visit): Visit {
  if (!account) return guest;
  const visited = account.visited || guest.visited;
  const dates = [account.visitedAt, guest.visitedAt].filter((d): d is string => !!d).sort();
  return {
    restaurantId: account.restaurantId,
    visited,
    visitedAt: visited ? (dates[0] ?? null) : null,
    favorite: account.favorite || guest.favorite,
    notes: account.notes?.trim() ? account.notes : guest.notes,
    updatedAt: new Date().toISOString(),
  };
}

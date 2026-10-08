"use client";

import type { Visit, VisitMap } from "@/types/domain";
import { isEmptyVisit } from "./model";

/**
 * Guest progress, kept in this browser only. Keyed by restaurant *slug* so it
 * survives a switch between snapshot mode (ids = slugs) and database mode (UUIDs).
 */
const STORAGE_KEY = "biteatlas:guest-visits:v1";

type StoredVisit = Omit<Visit, "restaurantId">;

function readStore(): Record<string, StoredVisit> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, StoredVisit>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredVisit>) {
  try {
    if (Object.keys(store).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked (private mode) — progress stays in memory for this session.
  }
}

export function loadGuestVisits(slugToId: Map<string, string>): VisitMap {
  const out: VisitMap = {};
  for (const [slug, v] of Object.entries(readStore())) {
    const id = slugToId.get(slug);
    if (id) out[id] = { ...v, restaurantId: id };
  }
  return out;
}

export function saveGuestVisit(slug: string, visit: Visit) {
  const store = readStore();
  if (isEmptyVisit(visit)) delete store[slug];
  else {
    const { restaurantId: _id, ...rest } = visit;
    store[slug] = rest;
  }
  writeStore(store);
}

export function hasGuestVisits(): boolean {
  return Object.keys(readStore()).length > 0;
}

export function clearGuestVisits() {
  writeStore({});
}

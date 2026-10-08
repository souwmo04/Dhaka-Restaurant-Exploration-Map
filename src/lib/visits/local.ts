"use client";

import type { Visit, VisitMap } from "@/types/domain";
import { isEmptyVisit } from "./model";

/**
 * Guest progress, kept in this browser only — an external store for
 * `useSyncExternalStore`. Keyed by restaurant *slug* so it survives a switch
 * between snapshot mode (ids = slugs) and database mode (UUIDs).
 */
const STORAGE_KEY = "biteatlas:guest-visits:v1";

export type StoredVisit = Omit<Visit, "restaurantId">;
export type GuestStore = Record<string, StoredVisit>;

const EMPTY: GuestStore = {};
const listeners = new Set<() => void>();
let cache: GuestStore | null = null;

function read(): GuestStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as GuestStore) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(next: GuestStore) {
  cache = next;
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode): progress stays in memory for this session.
  }
  for (const l of listeners) l();
}

export const guestVisitStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    // Keep tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      cache = read();
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): GuestStore {
    cache ??= read();
    return cache;
  },
  getServerSnapshot(): GuestStore {
    return EMPTY;
  },
  save(slug: string, visit: Visit) {
    const next = { ...guestVisitStore.getSnapshot() };
    if (isEmptyVisit(visit)) delete next[slug];
    else {
      const { restaurantId: _id, ...rest } = visit;
      next[slug] = rest;
    }
    write(next);
  },
  clear() {
    write({});
  },
};

/** Converts the slug-keyed store into a VisitMap keyed by restaurant id. */
export function toVisitMap(store: GuestStore, slugToId: Map<string, string>): VisitMap {
  const out: VisitMap = {};
  for (const [slug, v] of Object.entries(store)) {
    const id = slugToId.get(slug);
    if (id) out[id] = { ...v, restaurantId: id };
  }
  return out;
}

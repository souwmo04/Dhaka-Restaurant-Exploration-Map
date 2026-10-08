"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toaster";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { pluralize } from "@/lib/utils";
import { guestVisitStore, toVisitMap } from "@/lib/visits/local";
import { applyVisitPatch, isEmptyVisit, mergeVisits } from "@/lib/visits/model";
import { fetchAccountVisits, saveAccountVisit, saveAccountVisits } from "@/lib/visits/remote";
import type { VisitMap, VisitPatch } from "@/types/domain";
import { useCatalog } from "./CatalogProvider";
import { useSession } from "./SessionProvider";

type VisitsState = {
  visits: VisitMap;
  /** "guest" = saved in this browser only; "account" = saved to the user's account. */
  mode: "guest" | "account";
  status: "loading" | "ready" | "error";
  update: (restaurantId: string, patch: VisitPatch) => Promise<void>;
  retry: () => void;
};

/** Account visits are tagged with their owner so a stale load never shows for another user. */
type AccountState = { userId: string; visits: VisitMap } | { userId: string; error: true };

const VisitsContext = createContext<VisitsState | null>(null);
const NO_VISITS: VisitMap = {};

export function VisitsProvider({ children }: { children: ReactNode }) {
  const { slugToId, restaurantById } = useCatalog();
  const session = useSession();
  const toast = useToast();

  const guestStore = useSyncExternalStore(guestVisitStore.subscribe, guestVisitStore.getSnapshot, guestVisitStore.getServerSnapshot);
  const guestVisits = useMemo(() => toVisitMap(guestStore, slugToId), [guestStore, slugToId]);

  const [account, setAccount] = useState<AccountState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  /** Latest write per restaurant, so a slow failed request can't roll back a newer change. */
  const writeSeq = useRef(new Map<string, number>());

  const userId = session.user?.id ?? null;
  const accountReady = account && userId && account.userId === userId ? account : null;

  // Load account visits; on first sign-in, fold guest progress into the account.
  useEffect(() => {
    if (!userId) return;
    const db = getBrowserSupabase();
    if (!db) return;
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchAccountVisits(db);
        const guest = Object.values(toVisitMap(guestVisitStore.getSnapshot(), slugToId)).filter((v) => !isEmptyVisit(v));
        if (guest.length > 0) {
          const merged = guest.map((g) => mergeVisits(remote[g.restaurantId], g));
          await saveAccountVisits(db, userId, merged);
          for (const m of merged) remote[m.restaurantId] = m;
          guestVisitStore.clear();
          if (!cancelled) {
            toast({
              tone: "success",
              title: "Progress saved to your account",
              description: `${pluralize(guest.length, "restaurant")} from this browser were added.`,
            });
          }
        }
        if (!cancelled) setAccount({ userId, visits: remote });
      } catch {
        if (!cancelled) setAccount({ userId, error: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, slugToId, reloadKey, toast]);

  let visits: VisitMap;
  let status: VisitsState["status"];
  if (session.status === "loading") {
    visits = NO_VISITS;
    status = "loading";
  } else if (!userId) {
    visits = guestVisits;
    status = "ready";
  } else if (!accountReady) {
    visits = NO_VISITS;
    status = "loading";
  } else if ("error" in accountReady) {
    visits = NO_VISITS;
    status = "error";
  } else {
    visits = accountReady.visits;
    status = "ready";
  }

  const visitsRef = useRef(visits);
  useEffect(() => {
    visitsRef.current = visits;
  });

  const update = useCallback(
    async (restaurantId: string, patch: VisitPatch) => {
      const prev = visitsRef.current[restaurantId];
      const next = applyVisitPatch(restaurantId, prev, patch);
      visitsRef.current = { ...visitsRef.current, [restaurantId]: next };

      if (!userId) {
        const restaurant = restaurantById.get(restaurantId);
        if (restaurant) guestVisitStore.save(restaurant.slug, next);
        return;
      }

      const seq = (writeSeq.current.get(restaurantId) ?? 0) + 1;
      writeSeq.current.set(restaurantId, seq);
      const put = (value: typeof prev) =>
        setAccount((a) => {
          if (!a || a.userId !== userId || "error" in a) return a;
          const copy = { ...a.visits };
          if (!value || isEmptyVisit(value)) delete copy[restaurantId];
          else copy[restaurantId] = value;
          return { userId, visits: copy };
        });

      put(next); // optimistic
      const db = getBrowserSupabase();
      if (!db) return;
      try {
        await saveAccountVisit(db, userId, next);
      } catch {
        if (writeSeq.current.get(restaurantId) !== seq) return;
        put(prev);
        toast({ tone: "error", title: "Couldn't save that change", description: "Check your connection and try again." });
      }
    },
    [userId, restaurantById, toast],
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  const mode: VisitsState["mode"] = userId ? "account" : "guest";

  const value = useMemo(() => ({ visits, mode, status, update, retry }), [visits, mode, status, update, retry]);
  return <VisitsContext value={value}>{children}</VisitsContext>;
}

export function useVisits(): VisitsState {
  const ctx = useContext(VisitsContext);
  if (!ctx) throw new Error("useVisits must be used within <VisitsProvider>");
  return ctx;
}

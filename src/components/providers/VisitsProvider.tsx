"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toaster";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { pluralize } from "@/lib/utils";
import { clearGuestVisits, loadGuestVisits, saveGuestVisit } from "@/lib/visits/local";
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

const VisitsContext = createContext<VisitsState | null>(null);

export function VisitsProvider({ children }: { children: ReactNode }) {
  const { slugToId, restaurantById } = useCatalog();
  const session = useSession();
  const toast = useToast();

  const [visits, setVisits] = useState<VisitMap>({});
  const [status, setStatus] = useState<VisitsState["status"]>("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const visitsRef = useRef(visits);
  visitsRef.current = visits;
  /** Latest write per restaurant, so a slow failed request can't roll back a newer change. */
  const writeSeq = useRef(new Map<string, number>());

  const userId = session.user?.id ?? null;
  const mode: VisitsState["mode"] = userId ? "account" : "guest";

  useEffect(() => {
    if (session.status === "loading") return;
    let cancelled = false;

    if (!userId) {
      setVisits(loadGuestVisits(slugToId));
      setStatus("ready");
      return;
    }

    const db = getBrowserSupabase();
    if (!db) return;
    setStatus("loading");

    (async () => {
      try {
        const account = await fetchAccountVisits(db);
        const guest = loadGuestVisits(slugToId);
        const guestList = Object.values(guest).filter((v) => !isEmptyVisit(v));

        if (guestList.length > 0) {
          const merged = guestList.map((g) => mergeVisits(account[g.restaurantId], g));
          await saveAccountVisits(db, userId, merged);
          for (const m of merged) account[m.restaurantId] = m;
          clearGuestVisits();
          if (!cancelled) {
            toast({
              tone: "success",
              title: "Progress saved to your account",
              description: `${pluralize(guestList.length, "restaurant")} from this browser were added.`,
            });
          }
        }
        if (!cancelled) {
          setVisits(account);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.status, userId, slugToId, reloadKey, toast]);

  const update = useCallback(
    async (restaurantId: string, patch: VisitPatch) => {
      const prev = visitsRef.current[restaurantId];
      const next = applyVisitPatch(restaurantId, prev, patch);
      const seq = (writeSeq.current.get(restaurantId) ?? 0) + 1;
      writeSeq.current.set(restaurantId, seq);

      setVisits((all) => {
        const copy = { ...all };
        if (isEmptyVisit(next)) delete copy[restaurantId];
        else copy[restaurantId] = next;
        return copy;
      });

      const restaurant = restaurantById.get(restaurantId);
      if (!userId) {
        if (restaurant) saveGuestVisit(restaurant.slug, next);
        return;
      }

      const db = getBrowserSupabase();
      if (!db) return;
      try {
        await saveAccountVisit(db, userId, next);
      } catch {
        if (writeSeq.current.get(restaurantId) !== seq) return;
        setVisits((all) => {
          const copy = { ...all };
          if (prev) copy[restaurantId] = prev;
          else delete copy[restaurantId];
          return copy;
        });
        toast({
          tone: "error",
          title: "Couldn't save that change",
          description: "Check your connection and try again.",
        });
      }
    },
    [userId, restaurantById, toast],
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const value = useMemo(() => ({ visits, mode, status, update, retry }), [visits, mode, status, update, retry]);
  return <VisitsContext value={value}>{children}</VisitsContext>;
}

export function useVisits(): VisitsState {
  const ctx = useContext(VisitsContext);
  if (!ctx) throw new Error("useVisits must be used within <VisitsProvider>");
  return ctx;
}

"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
};

type SessionState = {
  /** "unavailable" = no Supabase configured (snapshot mode); accounts are disabled. */
  status: "loading" | "signed-in" | "guest" | "unavailable";
  user: SessionUser | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

function toSessionUser(user: User): SessionUser {
  const meta = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string };
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: meta.full_name || meta.name || user.email?.split("@")[0] || "Explorer",
    avatarUrl: meta.avatar_url ?? null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>(isSupabaseConfigured ? "loading" : "unavailable");
  const [user, setUser] = useState<SessionUser | null>(null);
  /** Admin flag, tagged with the user it was loaded for. */
  const [adminFor, setAdminFor] = useState<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    const db = getBrowserSupabase();
    if (!db) return;

    const { data } = db.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ? toSessionUser(session.user) : null;
      setUser((prev) => (prev?.id === next?.id && prev?.displayName === next?.displayName ? prev : next));
      setStatus(next ? "signed-in" : "guest");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Admin flag (RLS: users can read only their own profile).
  const userId = user?.id ?? null;
  useEffect(() => {
    const db = getBrowserSupabase();
    if (!db || !userId) return;
    let cancelled = false;
    db.from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAdminFor({ userId, isAdmin: !!data?.is_admin });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  const isAdmin = !!userId && adminFor?.userId === userId && adminFor.isAdmin;

  const signOut = useCallback(async () => {
    await getBrowserSupabase()?.auth.signOut();
  }, []);

  const value = useMemo(() => ({ status, user, isAdmin, signOut }), [status, user, isAdmin, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}

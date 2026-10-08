import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Anonymous, cookie-less client for public catalog reads. Safe to use inside
 * `"use cache"` functions because it never touches the request.
 */
export function getPublicSupabase() {
  if (!isSupabaseConfigured) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

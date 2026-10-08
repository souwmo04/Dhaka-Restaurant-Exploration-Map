"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let browserClient: SupabaseClient<Database> | null = null;

/** Singleton browser client, or null when Supabase isn't configured. */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

/** Public Supabase settings. Both values are safe to expose; RLS enforces access. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * When Supabase isn't configured the app runs in "snapshot" mode: the catalog
 * comes from the bundled /data files and progress is kept in this browser only.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

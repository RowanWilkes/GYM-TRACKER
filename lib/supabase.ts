import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function hasSupabaseConfig(): boolean {
  return Boolean(
    url &&
      anonKey &&
      !url.includes("YOUR_PROJECT_REF") &&
      anonKey !== "your_anon_key_here"
  );
}

function createSupabase(): SupabaseClient {
  return createClient(url || "https://unavailable.supabase.co", anonKey || "missing", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = createSupabase();

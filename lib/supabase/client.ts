import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

export function createClient() {
  return createSupabaseClient(url || "https://unavailable.supabase.co", anonKey || "missing", {
    auth: {
      // @supabase/ssr createBrowserClient hardcodes flowType: "pkce", which
      // rejects the default recovery email's hash tokens. Implicit +
      // detectSessionInUrl is required for that default template.
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export const supabase = createClient();

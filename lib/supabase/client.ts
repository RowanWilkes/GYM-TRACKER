import { createBrowserClient } from "@supabase/ssr";

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
  return createBrowserClient(url || "https://unavailable.supabase.co", anonKey || "missing");
}

export const supabase = createClient();

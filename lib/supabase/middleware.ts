import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RECOVERY_EXEMPT = ["/auth/confirm", "/update-password", "/reset-password"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url || "https://unavailable.supabase.co", anonKey || "missing", {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isRecoveryExempt = RECOVERY_EXEMPT.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  // A recovery session is authenticated. Never bounce those routes to the dashboard.
  if (user && path === "/" && !isRecoveryExempt) {
    const type = request.nextUrl.searchParams.get("type");
    if (type === "recovery" || request.nextUrl.searchParams.has("token_hash")) {
      const url = request.nextUrl.clone();
      url.pathname = "/update-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

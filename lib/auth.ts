import { supabase } from "@/lib/supabase";

type RouterLike = { replace: (href: string) => void };

export async function routeAfterAuth(router: RouterLike): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    router.replace("/");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded) {
    router.replace("/tracker");
    return;
  }

  router.replace("/onboarding");
}

export function isRateLimited(err: unknown): boolean {
  const error = err as { message?: string; code?: string; status?: number };
  const code = (error.code ?? "").toLowerCase();
  const text = (error.message ?? "").toLowerCase();
  return (
    code.includes("rate_limit") ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    text.includes("rate limit") ||
    text.includes("for security purposes") ||
    text.includes("only request this after")
  );
}

export function mapAuthError(err: unknown, context: "login" | "signup"): string {
  const error = err as { message?: string; code?: string };
  const code = (error.code ?? "").toLowerCase();
  const text = (error.message ?? "").toLowerCase();
  const blob = `${code} ${text}`;

  if (
    code === "email_address_invalid" ||
    text.includes("email_address_invalid") ||
    text.startsWith("email address")
  ) {
    return "Use a real email address. That one was rejected.";
  }

  if (isRateLimited(err)) {
    return "Too many attempts. Wait a minute and try again.";
  }

  if (context === "login") {
    if (blob.includes("email not confirmed") || code === "email_not_confirmed") {
      return "Confirm your email before logging in, or turn off Confirm email in Supabase Auth settings.";
    }
    if (
      code === "invalid_credentials" ||
      blob.includes("invalid login") ||
      blob.includes("invalid credentials")
    ) {
      return "Invalid email or password.";
    }
    return error.message || "Could not log in. Try again.";
  }

  if (
    code === "user_already_exists" ||
    blob.includes("already registered") ||
    blob.includes("already been registered")
  ) {
    return "That email already has an account. Log in instead.";
  }
  if (blob.includes("password") && (blob.includes("weak") || blob.includes("at least") || blob.includes("characters"))) {
    return "Password must be at least 6 characters.";
  }

  return error.message || "Could not create an account. Try again.";
}

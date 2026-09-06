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

export function mapAuthError(err: unknown, context: "email" | "code"): string {
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
    if (context === "email") {
      return "A code may already be on the way. Check your inbox (and spam), then enter it. Wait a minute before asking for another.";
    }
    return "Wait a minute before requesting another code.";
  }

  if (context === "code") {
    if (blob.includes("expired")) {
      return "That code expired. Request a new one.";
    }
    if (
      blob.includes("invalid") ||
      blob.includes("otp") ||
      blob.includes("token") ||
      blob.includes("wrong")
    ) {
      return "That code is wrong. Try again.";
    }
  }

  if (context === "email") {
    return error.message || "Could not send a code. Try again.";
  }

  return error.message || "Something went wrong. Try again.";
}

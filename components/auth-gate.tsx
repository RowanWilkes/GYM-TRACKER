"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export function AuthGate({
  children,
  requireOnboarded = false,
  redirectIfOnboarded = false,
  guestOnly = false,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
  redirectIfOnboarded?: boolean;
  guestOnly?: boolean;
}) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!hasSupabaseConfig()) {
        if (guestOnly) {
          setOk(true);
          return;
        }
        router.replace("/");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        if (guestOnly) {
          setOk(true);
          return;
        }
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (guestOnly) {
        router.replace(profile?.onboarded ? "/tracker" : "/onboarding");
        return;
      }
      if (requireOnboarded && !profile?.onboarded) {
        router.replace("/onboarding");
        return;
      }
      if (redirectIfOnboarded && profile?.onboarded) {
        router.replace("/tracker");
        return;
      }
      setOk(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, requireOnboarded, redirectIfOnboarded, guestOnly]);

  if (!ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <p className="text-sm text-[#9aa3b2]">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}

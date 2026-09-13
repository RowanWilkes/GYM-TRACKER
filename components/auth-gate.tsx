"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { hasRecoveryTokens, isRecoveryExemptPath } from "@/lib/passwordReset";
import LiftLoader from "@/components/LiftLoader";

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
  const pathname = usePathname();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

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
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          router.replace("/update-password");
        }
      });
      unsubscribe = () => subscription.unsubscribe();

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

      if (isRecoveryExemptPath(pathname)) {
        setOk(true);
        return;
      }

      if (
        guestOnly &&
        hasRecoveryTokens(window.location.search, window.location.hash)
      ) {
        router.replace("/update-password");
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
      unsubscribe();
    };
  }, [router, pathname, requireOnboarded, redirectIfOnboarded, guestOnly]);

  if (!ok) {
    return <LiftLoader />;
  }

  return <>{children}</>;
}

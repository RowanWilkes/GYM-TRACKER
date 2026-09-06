"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { routeAfterAuth } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!hasSupabaseConfig()) {
        router.replace("/");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryParams = new URLSearchParams(window.location.search);
      const redirectError =
        hashParams.get("error_description") ||
        hashParams.get("error") ||
        queryParams.get("error_description") ||
        queryParams.get("error");

      if (redirectError) {
        setError(redirectError.replace(/\+/g, " "));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        const code = queryParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        } else {
          setError("That sign-in link is invalid or expired. Request a new one.");
          return;
        }
      }

      await routeAfterAuth(router);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
      {error ? (
        <>
          <p className="text-sm text-[#ff7a6e]">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-6 min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a]"
          >
            Back to sign in
          </button>
        </>
      ) : (
        <p className="text-sm text-[#9aa3b2]">Signing you in…</p>
      )}
    </main>
  );
}

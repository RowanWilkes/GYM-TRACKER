"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { isRateLimited, mapAuthError, routeAfterAuth, getAuthCallbackUrl } from "@/lib/auth";

type Step = "landing" | "check-email";
type Intent = "signup" | "login";

export function LoginFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("landing");
  const [intent, setIntent] = useState<Intent>("signup");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hasSupabaseConfig()) {
        setCheckingSession(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        await routeAfterAuth(router);
        return;
      }
      setCheckingSession(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function sendLink(nextEmail: string, nextIntent: Intent) {
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        shouldCreateUser: nextIntent === "signup",
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });
    if (otpError) {
      throw otpError;
    }
  }

  async function requestLink(nextIntent: Intent) {
    setError("");
    setInfo("");

    if (!hasSupabaseConfig()) {
      setError("Add your Supabase URL and anon key to .env.local, then restart the app.");
      return;
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    setIntent(nextIntent);
    try {
      await sendLink(trimmed, nextIntent);
      setEmail(trimmed);
      setStep("check-email");
    } catch (err) {
      setEmail(trimmed);
      if (isRateLimited(err)) {
        setStep("check-email");
        setError("");
        setInfo(
          "A link may already be in your inbox. Check your email, or wait a minute before resending."
        );
      } else {
        setError(mapAuthError(err, nextIntent === "login" ? "login" : "email"));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onEmailSubmit(event: FormEvent) {
    event.preventDefault();
    await requestLink("signup");
  }

  async function onResend() {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await sendLink(email, intent);
      setInfo("A new sign-in link is on the way.");
    } catch (err) {
      setError(mapAuthError(err, intent === "login" ? "login" : "email"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
        <p className="text-sm text-[#9aa3b2]">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9aa3b2]">
        Progressive Overload Tracker
      </p>

      {step === "landing" ? (
        <>
          <h1 className="text-[2.15rem] font-extrabold leading-[1.1] tracking-tight text-[#f4f1ea]">
            Lift smarter every session
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#9aa3b2]">
            Log the weight, rate how it felt, and get tomorrow’s target — no
            notes app, no password.
          </p>
          <form onSubmit={onEmailSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-[#9aa3b2]">
              Email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 text-lg text-[#f4f1ea] outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]"
              />
            </label>
            {error ? <p className="text-sm text-[#ff7a6e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 rounded-2xl bg-[#c9f24d] text-base font-extrabold text-[#14180a] disabled:opacity-60"
            >
              {loading && intent === "signup" ? "Sending link…" : "Get started"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void requestLink("login")}
              className="min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] text-base font-extrabold text-[#f4f1ea] disabled:opacity-60"
            >
              {loading && intent === "login" ? "Sending link…" : "Log in"}
            </button>
            <p className="text-center text-sm text-[#9aa3b2]">
              No password. We&apos;ll email you a sign-in link. Log in never
              creates a new account.
            </p>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-tight text-[#f4f1ea]">
            Check your email — we sent a sign-in link to {email}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#9aa3b2]">
            Click the link to sign in. You can close this tab after that.
          </p>
          {error ? <p className="mt-4 text-sm text-[#ff7a6e]">{error}</p> : null}
          {info ? <p className="mt-4 text-sm text-[#c9f24d]">{info}</p> : null}
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={onResend}
              disabled={loading}
              className="min-h-12 text-sm font-semibold text-[#c9f24d] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Resend"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("landing");
                setIntent("signup");
                setError("");
                setInfo("");
              }}
              className="text-sm text-[#9aa3b2]"
            >
              Use a different email
            </button>
          </div>
        </>
      )}
    </main>
  );
}

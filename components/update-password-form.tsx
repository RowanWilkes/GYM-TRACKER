"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { isRateLimited } from "@/lib/auth";
import {
  authRedirectErrorFromLocation,
  hashRecoveryTokens,
  validateNewPassword,
} from "@/lib/passwordReset";

const fieldClass =
  "t-value min-h-14 rounded-2xl border border-[#2a313c] bg-[#14171c] px-4 outline-none placeholder:text-[#6b7380] focus:border-[#c9f24d]";

const expiredMessage = "This reset link is invalid or has expired.";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let settled = false;

    function finish(ok: boolean, message = "") {
      if (cancelled || settled) return;
      settled = true;
      setSessionOk(ok);
      setError(ok ? "" : message || expiredMessage);
      setChecking(false);
    }

    if (!hasSupabaseConfig()) {
      finish(false, "Add your Supabase URL and anon key to .env.local, then restart the app.");
      return;
    }

    const redirectError = authRedirectErrorFromLocation(window.location.search, window.location.hash);
    if (redirectError) {
      finish(false, redirectError);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        finish(true);
      }
    });

    async function resolveSession() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError) {
        finish(false, sessionError.message);
        return;
      }
      if (session) {
        finish(true);
        return;
      }

      const tokens = hashRecoveryTokens(window.location.hash);
      if (tokens) {
        const { data, error: setError } = await supabase.auth.setSession(tokens);
        if (cancelled) return;
        if (setError) {
          finish(false, setError.message);
          return;
        }
        if (data.session) {
          finish(true);
          return;
        }
      }

      finish(false);
    }

    void resolveSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateNewPassword(password, confirm);
    if (message) {
      setError(message);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }
      router.replace("/tracker");
    } catch (err) {
      const fallback = err instanceof Error ? err.message : "Could not update your password.";
      setError(isRateLimited(err) ? "Too many attempts. Wait a minute and try again." : fallback);
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="t-meta">Checking your session…</p>;
  }

  if (!sessionOk) {
    return (
      <>
        <h1 className="t-title leading-[1.15]">Reset link expired</h1>
        <p className="t-body mt-4">{error || expiredMessage}</p>
        <Link
          href="/reset-password"
          className="t-value mt-6 grid min-h-14 place-items-center rounded-2xl bg-[#c4f042] text-[#14180a]!"
        >
          Request a new reset link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="t-title leading-[1.15]">Set a new password</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="t-label">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="t-label">Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat your password"
            className={fieldClass}
          />
        </label>
        {error ? <p className="t-body text-[#ff7a6e]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="t-value min-h-14 rounded-2xl bg-[#c4f042] text-[#14180a]! disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
        <Link href="/" className="t-meta">
          Back to log in
        </Link>
      </form>
    </>
  );
}

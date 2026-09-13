export function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (!password) {
    return "Enter a new password.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

function paramsFromLocation(search: string, hash: string): URLSearchParams {
  const query = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  hashParams.forEach((value, key) => {
    if (!query.has(key)) query.set(key, value);
  });
  return query;
}

export function authRedirectErrorFromLocation(search: string, hash: string): string | null {
  const params = paramsFromLocation(search, hash);
  const code = params.get("error_code");
  const error = params.get("error");
  const description = params.get("error_description");
  if (!code && !error && !description) return null;
  if (
    code === "otp_expired" ||
    error === "access_denied" ||
    (description && /expired|invalid/i.test(description))
  ) {
    return "This reset link is invalid or has expired.";
  }
  return description || code || error;
}

export function hashRecoveryTokens(hash: string): { access_token: string; refresh_token: string } | null {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

export function hasRecoveryTokens(search: string, hash: string): boolean {
  const params = paramsFromLocation(search, hash);
  return Boolean(
    params.get("access_token") ||
      params.get("code") ||
      params.get("token_hash") ||
      params.get("type") === "recovery"
  );
}

export function isRecoveryExemptPath(pathname: string): boolean {
  return (
    pathname === "/update-password" ||
    pathname === "/reset-password" ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/auth/confirm/")
  );
}

export function resetLinkErrorMessage(error: string | null): string | null {
  if (!error) return null;
  if (error === "invalid_or_expired") {
    return "This reset link is invalid or has expired.";
  }
  return error;
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return "/update-password";
  }
  return next;
}

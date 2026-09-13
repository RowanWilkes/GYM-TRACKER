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
  return params.get("error_description") || params.get("error");
}

export function hasRecoveryTokens(search: string, hash: string): boolean {
  const params = paramsFromLocation(search, hash);
  return Boolean(
    params.get("access_token") ||
      params.get("code") ||
      params.get("type") === "recovery"
  );
}

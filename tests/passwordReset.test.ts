import {
  authRedirectErrorFromLocation,
  hashRecoveryTokens,
  hasRecoveryTokens,
  isRecoveryExemptPath,
  resetLinkErrorMessage,
  safeNextPath,
  validateEmail,
  validateNewPassword,
} from "../lib/passwordReset";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(actual)}`);
  }
}

assertEqual(validateEmail(""), "Enter a valid email address.", "empty email is rejected");
assertEqual(validateEmail("not-an-email"), "Enter a valid email address.", "email without @ is rejected");
assertEqual(validateEmail("  you@email.com  "), null, "trims a valid email");

assertEqual(validateNewPassword("", "secret123"), "Enter a new password.", "empty password is rejected");
assertEqual(validateNewPassword("short", "short"), "Password must be at least 8 characters.", "short password is rejected");
assertEqual(
  validateNewPassword("longenough", "different1"),
  "Passwords do not match.",
  "mismatch is rejected"
);
assertEqual(validateNewPassword("longenough", "longenough"), null, "matching 8+ password is valid");

assertEqual(
  authRedirectErrorFromLocation("error=access_denied&error_description=Email+link+is+invalid+or+has+expired", ""),
  "This reset link is invalid or has expired.",
  "maps expired query errors"
);
assertEqual(
  authRedirectErrorFromLocation("", "#error=access_denied&error_code=otp_expired"),
  "This reset link is invalid or has expired.",
  "maps hash access_denied / otp_expired"
);
assertEqual(authRedirectErrorFromLocation("", ""), null, "no error params is null");

assertEqual(hasRecoveryTokens("", "#access_token=abc&type=recovery"), true, "hash recovery tokens count");
assertEqual(
  JSON.stringify(hashRecoveryTokens("#access_token=aaa&refresh_token=bbb&type=recovery")),
  JSON.stringify({ access_token: "aaa", refresh_token: "bbb" }),
  "reads implicit hash tokens"
);
assertEqual(hashRecoveryTokens("#error=access_denied"), null, "error hash has no tokens");
assertEqual(hasRecoveryTokens("token_hash=abc&type=recovery", ""), true, "token_hash recovery counts");
assertEqual(hasRecoveryTokens("", ""), false, "empty url has no recovery tokens");

assertEqual(isRecoveryExemptPath("/update-password"), true, "update-password is exempt");
assertEqual(isRecoveryExemptPath("/reset-password"), true, "reset-password is exempt");
assertEqual(isRecoveryExemptPath("/auth/confirm"), true, "confirm route is exempt");
assertEqual(isRecoveryExemptPath("/tracker"), false, "tracker is not exempt");

assertEqual(
  resetLinkErrorMessage("invalid_or_expired"),
  "This reset link is invalid or has expired.",
  "maps confirm-route error query"
);
assertEqual(resetLinkErrorMessage(null), null, "no reset error is null");

assertEqual(safeNextPath(null), "/update-password", "missing next defaults to update-password");
assertEqual(safeNextPath("/update-password"), "/update-password", "relative next is kept");
assertEqual(safeNextPath("https://evil.example"), "/update-password", "absolute next is rejected");
assertEqual(safeNextPath("//evil.example"), "/update-password", "protocol-relative next is rejected");

console.log("All passwordReset tests passed.");

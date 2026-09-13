import {
  authRedirectErrorFromLocation,
  hasRecoveryTokens,
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
  "Email link is invalid or has expired",
  "reads error_description from the query string"
);
assertEqual(
  authRedirectErrorFromLocation("", "#error_description=Token+has+expired&error=access_denied"),
  "Token has expired",
  "reads error_description from the hash"
);
assertEqual(authRedirectErrorFromLocation("", ""), null, "no error params is null");

assertEqual(hasRecoveryTokens("", "#access_token=abc&type=recovery"), true, "hash recovery tokens count");
assertEqual(hasRecoveryTokens("code=abc", ""), true, "pkce code counts as recovery tokens");
assertEqual(hasRecoveryTokens("", ""), false, "empty url has no recovery tokens");

console.log("All passwordReset tests passed.");

/**
 * Runtime environment validation.
 *
 * Validates critical environment variables on demand. Warns (not throws) at
 * module load so the Next.js build still succeeds when env vars are missing
 * (typical for first-time deploys). The actual auth call will surface the
 * error to users via the branded `/error` page if needed.
 */

const APP_NAME = "opencode.guru";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns AUTH_SECRET, or a non-secret dev fallback if unset.
 * Production deployments without AUTH_SECRET will silently get a "Server
 * error" when a user tries to sign in — handled by src/app/error.tsx.
 */
export function getAuthSecret(): string {
  let secret = process.env.AUTH_SECRET;
  if (secret && secret.length > 0) return secret;

  if (!isProduction()) {
    secret = "dev-only-insecure-secret-do-not-use-in-production-please";
    process.env.AUTH_SECRET = secret;
    console.warn(
      `[${APP_NAME}] AUTH_SECRET not set — using insecure dev fallback. Set it in .env.local.`,
    );
    return secret;
  }

  console.error(
    [
      `[${APP_NAME}] AUTH_SECRET is not set in production.`,
      "",
      "Generate one with:",
      "  openssl rand -base64 32",
      "",
      "Then add it in Vercel:",
      "  Project Settings → Environment Variables",
      "  Name:  AUTH_SECRET",
      "  Value: <the generated string>",
      "  Apply to: Production, Preview, Development",
      "  Then redeploy.",
    ].join("\n"),
  );
  // Return an empty string — NextAuth will then throw a clearer error at
  // sign-in time which is caught by our /error page.
  return "";
}

/**
 * Warn (don't throw) if no OAuth provider is configured.
 */
function warnOAuthProviders() {
  const hasGithub = !!(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  );
  const hasGoogle = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  if (!hasGithub && !hasGoogle && isProduction()) {
    console.warn(
      `[${APP_NAME}] No OAuth providers configured — sign-in will fail.\n` +
        `Set AUTH_GITHUB_ID + AUTH_GITHUB_SECRET and/or AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET.`,
    );
  }
}

/**
 * Warn if NEXT_PUBLIC_APP_URL is missing (needed for OAuth callbacks).
 */
function warnAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url && isProduction()) {
    console.warn(
      `[${APP_NAME}] NEXT_PUBLIC_APP_URL not set. OAuth callbacks may break.\n` +
        `Set it to your deployed URL (e.g. https://your-app.vercel.app).`,
    );
  }
}

/**
 * Print warnings at module load — never throws, so builds succeed even
 * when env vars are incomplete.
 */
warnOAuthProviders();
warnAppUrl();
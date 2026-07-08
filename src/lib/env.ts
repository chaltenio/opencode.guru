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
 * Typed `process.env` snapshot for code that needs to read multiple
 * environment variables without repeatedly accessing `process.env`.
 *
 * Mutating this object does NOT affect `process.env`.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  IS_PRODUCTION: isProduction(),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "https://www.opencode.guru",
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru",
  AWS_SES_REGION: process.env.AWS_SES_REGION ?? "",
  AWS_SES_SMTP_USER: process.env.AWS_SES_SMTP_USER ?? "",
  AWS_SES_SMTP_PASSWORD: process.env.AWS_SES_SMTP_PASSWORD ?? "",
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST ?? "",
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT ?? "587",
  EMAIL_SERVER_SECURE: process.env.EMAIL_SERVER_SECURE ?? "",
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ?? "",
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "",
} as const;

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
 * Warn (don't throw) when SMTP email is not configured in production.
 * Email-change confirmations will fall back to console.log.
 *
 * Two paths are supported:
 *   - Generic SMTP:   EMAIL_SERVER_HOST, EMAIL_SERVER_PORT,
 *                     EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM
 *   - SES-specific:   AWS_SES_REGION + AWS_SES_SMTP_USER +
 *                     AWS_SES_SMTP_PASSWORD + EMAIL_FROM
 */
function warnEmail() {
  if (!isProduction()) return;
  const generic =
    process.env.EMAIL_SERVER_HOST &&
    process.env.EMAIL_SERVER_USER &&
    process.env.EMAIL_SERVER_PASSWORD &&
    process.env.EMAIL_FROM;
  const ses =
    process.env.AWS_SES_REGION &&
    process.env.AWS_SES_SMTP_USER &&
    process.env.AWS_SES_SMTP_PASSWORD &&
    process.env.EMAIL_FROM;
  if (!generic && !ses) {
    console.warn(
      `[${APP_NAME}] SMTP email is not configured — email-change confirmations will be logged to the server console instead of sent. Set either EMAIL_SERVER_HOST + EMAIL_SERVER_USER + EMAIL_SERVER_PASSWORD + EMAIL_FROM (any SMTP provider) or AWS_SES_REGION + AWS_SES_SMTP_USER + AWS_SES_SMTP_PASSWORD + EMAIL_FROM (Amazon SES).`,
    );
  }
}

/**
 * Print warnings at module load — never throws, so builds succeed even
 * when env vars are incomplete.
 */
warnOAuthProviders();
warnAppUrl();
warnEmail();
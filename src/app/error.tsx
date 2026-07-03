"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Caught by Next.js for any unhandled error in
 * a route's server component or client component. Renders a branded UI with
 * recovery options instead of the generic "Server error" message.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to console for debugging. In production this is captured by
    // your error reporter (Sentry etc.).
    console.error("Route error:", error);
  }, [error]);

  const message = error.message || "";
  const isAuthError =
    /MissingSecret|AUTH_SECRET|CONFIGURATION_ERROR|configuration/i.test(message);
  const isDbError = /ECONNREFUSED|relation .* does not exist|connection/i.test(
    message,
  );

  let title = "Something went wrong";
  let description =
    "An unexpected error occurred. We've been notified. Try again, or come back in a minute.";
  let fixLabel = "Try again";
  let fixHref: string | null = null;

  if (isAuthError) {
    title = "Authentication isn't configured";
    description =
      "The server is missing required environment variables for sign-in. The site owner needs to set AUTH_SECRET (and OAuth credentials) in the deployment platform's env-var settings.";
    fixLabel = "Back to home";
    fixHref = "/";
  } else if (isDbError) {
    title = "Database is unreachable";
    description =
      "We couldn't connect to the database. The site owner needs to check that the database is provisioned and the connection URL is set.";
    fixLabel = "Back to home";
    fixHref = "/";
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="rounded-xl border border-zinc-800 bg-bg-elev p-8">
        <p className="text-xs uppercase tracking-widest text-brand font-bold">
          Error
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-zinc-300 text-sm">{description}</p>

        {process.env.NODE_ENV !== "production" && error.digest && (
          <p className="mt-4 text-[10px] font-mono text-zinc-500 break-all">
            digest: {error.digest}
          </p>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          {fixHref ? (
            <Link
              href={fixHref}
              className="px-5 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm"
            >
              {fixLabel}
            </Link>
          ) : (
            <button
              onClick={reset}
              className="px-5 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm"
            >
              {fixLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
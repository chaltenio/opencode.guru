"use client";

/**
 * Top-level error boundary. Catches catastrophic errors in the root layout
 * itself (which the regular error.tsx cannot handle).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "36rem",
            width: "100%",
            border: "1px solid #27272a",
            background: "#141414",
            borderRadius: "0.75rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              color: "#e50914",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Error
          </p>
          <h1 style={{ marginTop: "0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
            Service is unavailable
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              color: "#d4d4d8",
              fontSize: "0.875rem",
              lineHeight: 1.5,
            }}
          >
            Something went catastrophically wrong. The site owner has been
            notified. Please try again in a minute.
          </p>

          {process.env.NODE_ENV !== "production" && error.digest && (
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.7rem",
                fontFamily: "monospace",
                color: "#71717a",
                wordBreak: "break-all",
              }}
            >
              digest: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.375rem",
              background: "#e50914",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
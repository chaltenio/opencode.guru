import { auth, signIn } from "@/auth";

export const dynamic = "force-dynamic";

interface AuthErrorInfo {
  title: string;
  description: string;
}

const AUTH_ERROR_MAP: Record<string, AuthErrorInfo> = {
  Configuration: {
    title: "Sign-in is not configured",
    description:
      "The server is missing required environment variables. The site owner needs to set AUTH_SECRET (and OAuth client credentials) in the deployment platform's env-var settings.",
  },
  AccessDenied: {
    title: "Access denied",
    description:
      "Your account was denied. If you believe this is wrong, contact a site administrator.",
  },
  Verification: {
    title: "Verification link expired",
    description:
      "The sign-in link is no longer valid. Please try signing in again.",
  },
  OAuthSignin: {
    title: "Could not start sign-in",
    description:
      "There was a problem starting the OAuth flow. Check that the OAuth app callback URL matches the deployment URL.",
  },
  OAuthCallback: {
    title: "Sign-in callback failed",
    description:
      "The OAuth provider rejected the sign-in. Most often this means the callback URL doesn't match what's registered in the provider.",
  },
  OAuthAccountNotLinked: {
    title: "Account already linked to another provider",
    description:
      "An account with this email already exists with a different sign-in provider. Use the original provider to sign in.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await auth();
  if (session?.user) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-zinc-300">
          Already signed in as{" "}
          <span className="text-white">{session.user.username}</span>.
        </p>
      </div>
    );
  }

  const errorInfo = searchParams.error
    ? AUTH_ERROR_MAP[searchParams.error] ?? {
        title: "Sign-in error",
        description: `Authentication failed (${searchParams.error}). Please try again.`,
      }
    : null;

  async function githubSignIn() {
    "use server";
    await signIn("github", {
      redirectTo: searchParams.callbackUrl ?? "/",
    });
  }
  async function googleSignIn() {
    "use server";
    await signIn("google", {
      redirectTo: searchParams.callbackUrl ?? "/",
    });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-zinc-800 bg-bg-elev p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Sign in to opencode.guru
        </h1>
        <p className="text-center text-sm text-zinc-400 mb-6">
          Submit videos, comment, save to your list, and track your progress.
        </p>

        {errorInfo && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-md border border-red-900/60 bg-red-950/40"
          >
            <p className="text-sm font-semibold text-red-300">
              {errorInfo.title}
            </p>
            <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
              {errorInfo.description}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <form action={githubSignIn}>
            <button
              type="submit"
              className="w-full py-3 rounded-md bg-zinc-100 text-black font-semibold hover:bg-white"
            >
              Continue with GitHub
            </button>
          </form>
          <form action={googleSignIn}>
            <button
              type="submit"
              className="w-full py-3 rounded-md bg-white text-black font-semibold hover:bg-zinc-200"
            >
              Continue with Google
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          By signing in you agree to follow our{" "}
            <a href="/code-of-conduct" className="underline hover:text-white">
              Code of Conduct
            </a>
            .
        </p>
      </div>
    </div>
  );
}
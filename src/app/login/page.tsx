import { auth, signIn } from "@/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
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
        <p className="text-center text-sm text-zinc-400 mb-8">
          Submit videos, comment, save to your list, and track your progress.
        </p>

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
          By signing in you agree to follow our community guidelines.
        </p>
      </div>
    </div>
  );
}
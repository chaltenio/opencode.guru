import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { cn } from "@/lib/utils";
import { AdminDropdown } from "@/components/admin-dropdown";
import type { UserRole } from "@/db/schema";

interface TopNavProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: UserRole;
  } | null;
}

export async function TopNav({ user }: TopNavProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-bg/80 backdrop-blur border-b border-zinc-900">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center gap-6">
        <Link
          href="/"
          className="text-brand font-extrabold text-xl tracking-tight"
        >
          opencode<span className="text-white">.guru</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm text-zinc-300">
          <Link href="/browse" className="hover:text-white">
            Browse
          </Link>
          <Link href="/tags" className="hover:text-white">
            Tags
          </Link>
          <Link href="/leaderboard" className="hover:text-white">
            Leaderboard
          </Link>
          {user && (
            <Link href="/watchlist" className="hover:text-white">
              Library
            </Link>
          )}
        </nav>

        <div className="ml-6 hidden md:flex items-center gap-2 text-sm">
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand/10 border border-brand/40 text-brand hover:bg-brand/20 hover:text-brand-hover"
          >
            <span aria-hidden>+</span>
            Submit a video
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              {(user.role === "SUPER_ADMIN" || user.role === "MODERATOR") && (
                <AdminDropdown role={user.role} />
              )}
              <Link
                href={`/u/${user.username}`}
                className="flex items-center gap-2 text-sm"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-full border border-zinc-700"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-zinc-700" />
                )}
                <span className="hidden sm:inline">
                  {user.displayName ?? user.username}
                </span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="text-xs text-zinc-400 hover:text-white">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("github", { redirectTo: "/" });
              }}
            >
              <button className="text-sm px-3 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-white">
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
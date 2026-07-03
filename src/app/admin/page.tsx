import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listPendingVideos,
  listOpenReports,
  listAudit,
  listPendingTagSuggestions,
  mostActiveUsers,
} from "@/db/queries";
import { formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    redirect("/");
  }

  const [pending, reports, audit, tagSuggestions, topUsers] = await Promise.all([
    listPendingVideos(10),
    listOpenReports(10),
    listAudit(10),
    listPendingTagSuggestions(),
    mostActiveUsers(5),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Admin dashboard</h1>
        <p className="text-sm text-zinc-400">
          You&apos;re signed in as <b>{session.user.role}</b>.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending review" value={pending.length} href="/admin/queue" />
        <Stat label="Open reports" value={reports.length} href="/admin/reports" />
        <Stat
          label="Tag suggestions"
          value={tagSuggestions.length}
          href="/admin/tags"
        />
        <Stat label="Audit entries (10)" value={audit.length} href="/admin/audit" />
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <AdminLink href="/admin/queue">Review queue</AdminLink>
        <AdminLink href="/admin/videos">All videos</AdminLink>
        <AdminLink href="/admin/tags">Tags</AdminLink>
        <AdminLink href="/admin/reports">Reports</AdminLink>
        <AdminLink href="/admin/users">Users</AdminLink>
        <AdminLink href="/admin/audit">Audit log</AdminLink>
      </nav>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Pending reviews</h2>
        {pending.length === 0 ? (
          <p className="text-zinc-500 text-sm">Queue is empty.</p>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 5).map((v) => (
              <li
                key={v.id}
                className="p-3 rounded-lg bg-bg-elev border border-zinc-800 flex items-center justify-between"
              >
                <div>
                  <Link
                    href={`/admin/videos/${v.id}`}
                    className="text-white font-medium hover:text-brand"
                  >
                    {v.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {v.platform} · {v.level.toLowerCase()} · by{" "}
                    {v.submitter.displayName ?? v.submitter.username} ·{" "}
                    {timeAgo(v.createdAt)}
                  </p>
                </div>
                <Link
                  href={`/admin/videos/${v.id}`}
                  className="text-xs text-brand hover:text-brand-hover"
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Top contributors</h2>
        <ul className="space-y-1.5 text-sm">
          {topUsers.map((u, i) => (
            <li
              key={u.id}
              className="flex items-center gap-3 p-2 rounded bg-bg-elev border border-zinc-800"
            >
              <span className="w-6 text-zinc-500">{i + 1}.</span>
              <span className="text-white">{u.displayName ?? u.username}</span>
              <span className="ml-auto text-zinc-500 text-xs">
                {u.videosApproved} videos · {formatNumber(u.likesReceived)} likes
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="p-4 rounded-lg bg-bg-elev border border-zinc-800 hover:border-zinc-700"
    >
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-400 mt-1">{label}</p>
    </Link>
  );
}

function AdminLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
    >
      {children}
    </Link>
  );
}
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listOpenReports } from "@/db/queries";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MODERATOR" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const reports = await listOpenReports(200);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Open reports ({reports.length})
      </h1>
      {reports.length === 0 ? (
        <p className="text-zinc-500">No open reports.</p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="p-4 rounded-lg bg-bg-elev border border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <span className="font-semibold text-white">
                    {r.targetType}
                  </span>
                  <span className="text-zinc-500 ml-2 text-xs">
                    {r.targetId}
                  </span>
                </p>
                <span className="text-xs text-zinc-500">
                  {timeAgo(r.createdAt)}
                </span>
              </div>
              <p className="text-sm text-zinc-200 mt-2">{r.reason}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Reported by{" "}
                {r.reporter.displayName ?? r.reporter.username}
              </p>
              {r.targetType === "VIDEO" && (
                <a
                  href={`/v/${r.targetId}`}
                  className="text-xs text-brand mt-1 inline-block"
                >
                  View target →
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
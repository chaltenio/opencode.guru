import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listAudit } from "@/db/queries";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MODERATOR") {
    redirect("/");
  }

  const entries = await listAudit(200);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Audit log</h1>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-zinc-400 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Diff</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-zinc-800">
                <td className="px-3 py-2 text-zinc-400 text-xs">
                  {timeAgo(e.createdAt)}
                </td>
                <td className="px-3 py-2 text-zinc-200 text-xs">
                  {e.actor?.username ?? "system"}
                </td>
                <td className="px-3 py-2 text-white text-xs font-mono">
                  {e.action}
                </td>
                <td className="px-3 py-2 text-zinc-300 text-xs">
                  {e.entityType} {e.entityId?.slice(0, 8)}
                </td>
                <td className="px-3 py-2 text-zinc-500 text-xs font-mono max-w-md truncate">
                  {e.diff ? JSON.stringify(e.diff) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
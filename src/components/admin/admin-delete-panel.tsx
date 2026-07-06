"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw } from "lucide-react";
import { deleteVideoAction, restoreVideoAction } from "@/app/actions/video";

export function AdminDeletePanel({
  videoId,
  deletedAt,
}: {
  videoId: string;
  deletedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function softDelete() {
    const reason = prompt(
      "Optional: why are you deleting this video? (visible in the audit log)",
    );
    if (reason !== null && reason.trim().length > 500) {
      setError("Reason must be 500 characters or fewer.");
      return;
    }
    setError(null);
    if (
      !confirm(
        "Soft-delete this video? It will disappear from the public site immediately but can be restored.",
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteVideoAction({
        videoId,
        reason: reason?.trim() || undefined,
      });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error || "Delete failed");
      }
    });
  }

  function restore() {
    setError(null);
    if (!confirm("Restore this video? It will become visible again.")) return;
    startTransition(async () => {
      const r = await restoreVideoAction({ videoId });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error || "Restore failed");
      }
    });
  }

  return (
    <section className="mt-6 p-4 rounded-lg bg-bg-elev border border-red-900/40">
      <h2 className="text-sm font-semibold text-red-300 mb-3">
        Danger zone
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        {deletedAt ? (
          <>
            <p className="text-xs text-zinc-400">
              This video was deleted on{" "}
              <span className="text-white">
                {new Date(deletedAt).toLocaleString()}
              </span>
              . It is invisible on the public site.
            </p>
            <button
              type="button"
              onClick={restore}
              disabled={pending}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              {pending ? "Restoring…" : "Restore video"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={softDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {pending ? "Deleting…" : "Delete video (soft)"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-300">{error}</p>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">
        Soft-delete sets <code>deleted_at</code>; the row stays for the audit
        log. Recorded under <a href="/admin/audit" className="underline">Audit log</a>.
      </p>
    </section>
  );
}
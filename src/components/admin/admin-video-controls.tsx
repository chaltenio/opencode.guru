"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, EyeOff, AlertTriangle } from "lucide-react";
import {
  updateVideoLevelAction,
  unpublishVideoAction,
} from "@/app/actions/video";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const LEVEL_LABEL: Record<Level, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function AdminVideoControls({
  videoId,
  currentLevel,
  isPublished,
}: {
  videoId: string;
  currentLevel: Level;
  isPublished: boolean;
}) {
  const [level, setLevel] = useState<Level>(currentLevel);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const router = useRouter();

  function saveLevel() {
    setMsg(null);
    startTransition(async () => {
      const r = await updateVideoLevelAction({ videoId, level });
      if (r.ok) {
        setMsg({
          kind: "ok",
          text: r.unchanged ? "Already at this level" : "Level updated",
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error || "Failed" });
      }
    });
  }

  function unpublish() {
    setMsg(null);
    const reason = prompt("Optional reason for unpublishing (visible in audit log):");
    if (reason !== null && reason.trim().length > 500) {
      setMsg({ kind: "err", text: "Reason must be 500 characters or fewer." });
      return;
    }
    if (
      !confirm(
        "Unpublish this video? It will no longer appear on the public site but stays in the DB and can be re-published.",
      )
    )
      return;
    startTransition(async () => {
      const r = await unpublishVideoAction({
        videoId,
        reason: reason?.trim() || undefined,
      });
      if (r.ok) {
        setMsg({
          kind: "ok",
          text: r.unchanged ? "Already unpublished" : "Unpublished",
        });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error || "Failed" });
      }
    });
  }

  return (
    <section className="mt-6 p-4 rounded-lg bg-bg-elev border border-zinc-800">
      <h2 className="text-sm font-semibold text-white mb-3">
        Video controls
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Difficulty level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
            disabled={pending}
            className="px-2 py-1 rounded bg-bg border border-zinc-700 text-sm"
          >
            {(Object.keys(LEVEL_LABEL) as Level[]).map((k) => (
              <option key={k} value={k}>
                {LEVEL_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={saveLevel}
          disabled={pending || level === currentLevel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-sm"
        >
          <Save className="w-3.5 h-3.5" />
          Save level
        </button>

        <div className="border-l border-zinc-700 pl-4 ml-auto">
          {isPublished ? (
            <button
              type="button"
              onClick={unpublish}
              disabled={pending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600/20 border border-amber-700/40 text-amber-200 hover:bg-amber-600/30 text-sm disabled:opacity-50"
            >
              <EyeOff className="w-3.5 h-3.5" />
              Unpublish
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              Already unpublished
            </span>
          )}
        </div>
      </div>

      {msg && (
        <p
          className={`mt-3 text-xs ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}
        >
          {msg.text}
        </p>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">
        Level changes are recorded in the audit log. Unpublishing hides the
        video from the public site within ~60s but keeps the row for
        re-publishing.
      </p>
    </section>
  );
}
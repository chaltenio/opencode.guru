"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, DollarSign, Save } from "lucide-react";
import {
  updateVideoFlagsAction,
  updateVideoOrderAction,
} from "@/app/actions/video";

export function AdminFlagsPanel({
  videoId,
  slug,
  isSponsored,
  isFeatured,
  order,
}: {
  videoId: string;
  slug: string;
  isSponsored: boolean;
  isFeatured: boolean;
  order: number;
}) {
  const [featured, setFeatured] = useState(isFeatured);
  const [sponsored, setSponsored] = useState(isSponsored);
  const [orderVal, setOrderVal] = useState(order);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function flash(msg: string) {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2200);
  }

  function saveFlags(nextFeatured: boolean, nextSponsored: boolean) {
    setFeatured(nextFeatured);
    setSponsored(nextSponsored);
    startTransition(async () => {
      const r = await updateVideoFlagsAction({
        videoId,
        isFeatured: nextFeatured,
        isSponsored: nextSponsored,
      });
      if (r.ok) {
        flash(r.unchanged ? "No change" : "Saved");
        router.refresh();
      } else {
        // revert on failure
        setFeatured(isFeatured);
        setSponsored(isSponsored);
        flash(r.error || "Failed");
      }
    });
  }

  function saveOrderOnly() {
    startTransition(async () => {
      const r = await updateVideoOrderAction({ videoId, order: orderVal });
      if (r.ok) {
        flash("Order saved");
        router.refresh();
      } else {
        setOrderVal(order);
        flash(r.error || "Failed");
      }
    });
  }

  return (
    <section className="mt-6 p-4 rounded-lg bg-bg-elev border border-zinc-800">
      <h2 className="text-sm font-semibold text-white mb-3">
        Super admin controls
      </h2>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) =>
              saveFlags(e.target.checked, sponsored)
            }
            disabled={pending}
            className="w-4 h-4 accent-amber-500"
          />
          <Star className="w-4 h-4 text-amber-400" />
          <span className="text-zinc-200">Featured (homepage hero)</span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={sponsored}
            onChange={(e) =>
              saveFlags(featured, e.target.checked)
            }
            disabled={pending}
            className="w-4 h-4 accent-brand"
          />
          <DollarSign className="w-4 h-4 text-brand" />
          <span className="text-zinc-200">Sponsored (top placement)</span>
        </label>

        <div className="flex items-center gap-2 text-sm">
          <label className="text-zinc-400">Display order</label>
          <input
            type="number"
            min={1}
            max={10}
            value={orderVal}
            onChange={(e) => setOrderVal(Number(e.target.value))}
            disabled={pending}
            className="w-16 px-2 py-1 rounded bg-bg border border-zinc-700 text-sm"
          />
          <button
            type="button"
            onClick={saveOrderOnly}
            disabled={pending || orderVal === order}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs"
          >
            <Save className="w-3 h-3" />
            Save order
          </button>
        </div>

        {savedMsg && (
          <span className="text-xs text-emerald-400 ml-auto">{savedMsg}</span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        Toggle changes are audited (visible under{" "}
        <a href="/admin/audit" className="underline">
          Audit log
        </a>
        ) and reflected on the public site within ~60s.
      </p>
    </section>
  );
}
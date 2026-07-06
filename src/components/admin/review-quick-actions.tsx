"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateVideoOrderAction,
  updateVideoFlagsAction,
} from "@/app/actions/video";
import { Star, DollarSign } from "lucide-react";

/**
 * Inline admin controls for a video row.
 *
 * - Order: edit + save (super admin)
 * - Featured: toggle pill (super admin)
 * - Sponsored: toggle pill (super admin)
 *
 * Moderators (non-super-admin) see read-only badges.
 */
export function ReviewQuickActions({
  videoId,
  currentOrder,
  isSponsored,
  isFeatured,
  isSuperAdmin,
}: {
  videoId: string;
  currentOrder: number;
  isSponsored: boolean;
  isFeatured: boolean;
  isSuperAdmin: boolean;
}) {
  const [order, setOrder] = useState(currentOrder);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function saveOrder() {
    startTransition(async () => {
      const r = await updateVideoOrderAction({
        videoId,
        order,
        isSponsored,
        isFeatured,
      });
      if (r.ok) router.refresh();
    });
  }

  function toggleFlag(key: "isFeatured" | "isSponsored", next: boolean) {
    startTransition(async () => {
      const r = await updateVideoFlagsAction({ videoId, [key]: next });
      if (r.ok) router.refresh();
    });
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">#{currentOrder}</span>
        {isFeatured && (
          <span className="text-amber-400" title="Featured">
            ★
          </span>
        )}
        {isSponsored && (
          <span className="text-brand" title="Sponsored">
            $
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          max={10}
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-12 px-1.5 py-0.5 rounded bg-bg border border-zinc-700 text-xs"
          aria-label="Display order"
        />
        <button
          type="button"
          onClick={saveOrder}
          disabled={pending}
          className="text-[10px] text-brand hover:underline disabled:opacity-50"
        >
          save
        </button>
      </div>

      <button
        type="button"
        onClick={() => toggleFlag("isFeatured", !isFeatured)}
        disabled={pending}
        title={isFeatured ? "Unset featured" : "Set featured"}
        aria-pressed={isFeatured}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] disabled:opacity-50 ${
          isFeatured
            ? "bg-amber-500/15 border-amber-600 text-amber-300"
            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        <Star className="w-3 h-3" />
        {isFeatured ? "Featured" : "Feature"}
      </button>

      <button
        type="button"
        onClick={() => toggleFlag("isSponsored", !isSponsored)}
        disabled={pending}
        title={isSponsored ? "Unset sponsored" : "Set sponsored"}
        aria-pressed={isSponsored}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] disabled:opacity-50 ${
          isSponsored
            ? "bg-brand/15 border-brand/60 text-brand"
            : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500"
        }`}
      >
        <DollarSign className="w-3 h-3" />
        {isSponsored ? "Sponsored" : "Sponsor"}
      </button>
    </div>
  );
}
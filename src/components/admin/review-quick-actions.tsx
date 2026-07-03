"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVideoOrderAction } from "@/app/actions/video";

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

  function save() {
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

  if (!isSuperAdmin) {
    return <span>{currentOrder}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={10}
        value={order}
        onChange={(e) => setOrder(Number(e.target.value))}
        className="w-14 px-2 py-0.5 rounded bg-bg border border-zinc-700 text-xs"
      />
      <button
        onClick={save}
        disabled={pending}
        className="text-[10px] text-brand hover:underline disabled:opacity-50"
      >
        save
      </button>
    </div>
  );
}
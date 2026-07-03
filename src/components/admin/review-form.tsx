"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewVideoAction, updateVideoOrderAction } from "@/app/actions/video";

export function ReviewForm({
  videoId,
  currentStatus,
}: {
  videoId: string;
  currentStatus: string;
}) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [publish, setPublish] = useState(true);
  const [order, setOrder] = useState(10);
  const [sponsored, setSponsored] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      const r = await reviewVideoAction({
        videoId,
        decision: "APPROVE",
        publish,
      });
      if (r.ok) {
        await updateVideoOrderAction({
          videoId,
          order,
          isSponsored: sponsored,
          isFeatured: featured,
        });
        router.push("/admin/queue");
      }
    });
  }

  function reject() {
    if (rejectionReason.trim().length < 10) {
      alert("Provide a rejection reason (at least 10 characters).");
      return;
    }
    startTransition(async () => {
      const r = await reviewVideoAction({
        videoId,
        decision: "REJECT",
        rejectionReason: rejectionReason.trim(),
      });
      if (r.ok) router.push("/admin/queue");
    });
  }

  if (currentStatus !== "REVIEW") {
    return (
      <p className="mt-6 text-sm text-zinc-400">
        This video is already {currentStatus.toLowerCase()}.{" "}
        <button
          onClick={() => router.push("/admin/videos")}
          className="text-brand"
        >
          Back to all videos
        </button>
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="p-4 rounded-lg bg-bg-elev border border-zinc-800">
        <h2 className="font-semibold text-white mb-3">Approve</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-300 mb-3">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="accent-brand"
          />
          Publish immediately (recommended)
        </label>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <label className="block text-xs text-zinc-400">
            Order (1 = top)
            <input
              type="number"
              min={1}
              max={10}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="block mt-1 w-full px-2 py-1 rounded bg-bg border border-zinc-700 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-400">
            Sponsored
            <select
              value={sponsored ? "1" : "0"}
              onChange={(e) => setSponsored(e.target.value === "1")}
              className="block mt-1 w-full px-2 py-1 rounded bg-bg border border-zinc-700 text-sm"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-400">
            Featured
            <select
              value={featured ? "1" : "0"}
              onChange={(e) => setFeatured(e.target.value === "1")}
              className="block mt-1 w-full px-2 py-1 rounded bg-bg border border-zinc-700 text-sm"
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </label>
        </div>

        <button
          onClick={approve}
          disabled={pending}
          className="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Approving…" : "Approve & publish"}
        </button>
      </div>

      <div className="p-4 rounded-lg bg-bg-elev border border-zinc-800">
        <h2 className="font-semibold text-white mb-3">Reject</h2>
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={3}
          placeholder="Reason for rejection (visible to submitter)"
          className="w-full px-3 py-2 rounded bg-bg border border-zinc-700 text-sm"
        />
        <button
          onClick={reject}
          disabled={pending}
          className="mt-3 px-5 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
        >
          {pending ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
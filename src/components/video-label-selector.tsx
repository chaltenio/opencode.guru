"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Bookmark, Eye, RotateCcw } from "lucide-react";
import { setVideoLabelAction } from "@/app/actions/video";

const LABEL_OPTIONS = [
  {
    value: "TO_WATCH" as const,
    label: "To watch",
    description: "Save for later",
    icon: Bookmark,
    activeClass: "bg-sky-500/15 border-sky-700/60 text-sky-200",
  },
  {
    value: "WATCHED" as const,
    label: "Watched",
    description: "I've seen this",
    icon: Check,
    activeClass: "bg-emerald-500/15 border-emerald-700/60 text-emerald-200",
  },
  {
    value: "TO_REWATCH" as const,
    label: "To re-watch",
    description: "Worth another look",
    icon: RotateCcw,
    activeClass: "bg-amber-500/15 border-amber-700/60 text-amber-200",
  },
];

type LabelValue = "TO_WATCH" | "WATCHED" | "TO_REWATCH";

export function VideoLabelSelector({
  videoId,
  isAuthenticated,
  currentLabel,
}: {
  videoId: string;
  isAuthenticated: boolean;
  currentLabel: LabelValue | null;
}) {
  const [label, setLabel] = useState<LabelValue | null>(currentLabel);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pick(next: LabelValue) {
    if (!isAuthenticated) return;
    const previous = label;
    const finalValue = previous === next ? null : next;
    setLabel(finalValue);
    startTransition(async () => {
      const r = await setVideoLabelAction({
        videoId,
        label: finalValue ?? "NONE",
      });
      if (!r.ok) {
        setLabel(previous);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-zinc-500 mb-2">My label</p>
      <div className="flex flex-wrap gap-2">
        {LABEL_OPTIONS.map((opt) => {
          const active = label === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => pick(opt.value)}
              disabled={!isAuthenticated || pending}
              aria-pressed={active}
              title={isAuthenticated ? opt.description : "Sign in to label"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition disabled:opacity-50 ${
                active
                  ? opt.activeClass
                  : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white bg-bg"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
        {label && (
          <button
            type="button"
            onClick={() => {
              const previous = label;
              setLabel(null);
              startTransition(async () => {
                const r = await setVideoLabelAction({ videoId, label: "NONE" });
                if (!r.ok) setLabel(previous);
                else router.refresh();
              });
            }}
            disabled={pending}
            className="ml-auto text-[11px] text-zinc-500 hover:text-white underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {!isAuthenticated && (
        <p className="mt-2 text-[11px] text-zinc-500">
          <a href="/login" className="text-brand hover:underline">
            Sign in
          </a>{" "}
          to label this video.
        </p>
      )}
    </div>
  );
}
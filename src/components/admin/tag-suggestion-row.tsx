"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveTagSuggestionAction } from "@/app/actions/video";

interface Suggestion {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  createdAt: Date | string;
  suggester: { id: string; username: string; displayName: string | null };
}

export function TagSuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function decide(decision: "APPROVE" | "REJECT") {
    startTransition(async () => {
      const r = await resolveTagSuggestionAction({
        suggestionId: suggestion.id,
        decision,
      });
      if (r.ok) router.refresh();
    });
  }

  return (
    <li className="p-3 rounded-lg bg-bg-elev border border-zinc-800 flex items-center justify-between gap-3">
      <div>
        <p className="text-white font-medium">
          #{suggestion.name}{" "}
          <span className="ml-2 text-xs text-zinc-500">
            {suggestion.category.toLowerCase()}
          </span>
        </p>
        {suggestion.description && (
          <p className="text-xs text-zinc-400">{suggestion.description}</p>
        )}
        <p className="text-xs text-zinc-500 mt-1">
          by{" "}
          {suggestion.suggester.displayName ?? suggestion.suggester.username}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => decide("APPROVE")}
          disabled={pending}
          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
        >
          Approve
        </button>
        <button
          onClick={() => decide("REJECT")}
          disabled={pending}
          className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-xs"
        >
          Reject
        </button>
      </div>
    </li>
  );
}
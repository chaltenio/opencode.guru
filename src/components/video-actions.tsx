"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, Flag } from "lucide-react";
import { likeAction, watchlistAction, reportAction } from "@/app/actions/video";

interface Props {
  videoId: string;
  initialLike: "LIKE" | "DISLIKE" | null;
  likeCount: number;
  dislikeCount: number;
  isAuthenticated: boolean;
  externalUrl: string;
}

export function VideoActions({
  videoId,
  initialLike,
  likeCount,
  dislikeCount,
  isAuthenticated,
  externalUrl,
}: Props) {
  const [like, setLike] = useState(initialLike);
  const [likes, setLikes] = useState(likeCount);
  const [dislikes, setDislikes] = useState(dislikeCount);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  function toggleLike(value: "LIKE" | "DISLIKE") {
    if (!isAuthenticated) return;
    const prev = like;
    const next = prev === value ? null : value;
    setLike(next);
    // Optimistic count
    if (prev === value) {
      if (value === "LIKE") setLikes((n) => n - 1);
      else setDislikes((n) => n - 1);
    } else {
      if (next === "LIKE") {
        setLikes((n) => n + 1);
        if (prev === "DISLIKE") setDislikes((n) => n - 1);
      } else {
        setDislikes((n) => n + 1);
        if (prev === "LIKE") setLikes((n) => n - 1);
      }
    }
    startTransition(() => {
      likeAction({ videoId, value: next ?? "NONE" });
    });
  }

  function toggleSave() {
    if (!isAuthenticated) return;
    const next = !saved;
    setSaved(next);
    startTransition(() => {
      watchlistAction({ videoId, action: next ? "ADD" : "REMOVE" });
    });
  }

  function report() {
    if (!isAuthenticated) return;
    const reason = prompt("Why are you reporting this video?");
    if (!reason || reason.trim().length < 10) return;
    startTransition(() => {
      reportAction({
        targetType: "VIDEO",
        targetId: videoId,
        reason: reason.trim(),
      });
      alert("Thanks — moderators will review this report.");
    });
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        onClick={() => toggleLike("LIKE")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm ${
          like === "LIKE"
            ? "bg-brand/15 border-brand text-white"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        <ThumbsUp className="w-4 h-4" />
        <span>{likes}</span>
      </button>
      <button
        onClick={() => toggleLike("DISLIKE")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm ${
          like === "DISLIKE"
            ? "bg-zinc-700 border-zinc-500 text-white"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        <ThumbsDown className="w-4 h-4" />
        <span>{dislikes}</span>
      </button>
      <button
        onClick={toggleSave}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm ${
          saved
            ? "bg-amber-500/15 border-amber-600 text-amber-200"
            : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        {saved ? (
          <BookmarkCheck className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
        {saved ? "Saved" : "Save"}
      </button>
      <button
        onClick={report}
        className="ml-auto flex items-center gap-1.5 px-2 py-1.5 text-xs text-zinc-500 hover:text-white"
      >
        <Flag className="w-3.5 h-3.5" />
        Report
      </button>
    </div>
  );
}
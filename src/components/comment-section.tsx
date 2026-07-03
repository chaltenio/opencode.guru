"use client";

import { useState, useTransition } from "react";
import { commentAction } from "@/app/actions/video";
import { timeAgo } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  likeCount: number;
  status: string;
  createdAt: Date | string;
  editedAt: Date | string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

interface Props {
  videoId: string;
  initialComments: Comment[];
  isAuthenticated: boolean;
  currentUserId: string | null;
}

export function CommentSection({
  videoId,
  initialComments,
  isAuthenticated,
  currentUserId,
}: Props) {
  const [list, setList] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      setError("Sign in to leave a comment.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await commentAction({ videoId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      // Optimistic insert; the page refresh on next nav will canonicalize
      if (result.comment) setList((l) => [result.comment!, ...l]);
    });
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-white mb-4">
        {list.length} {list.length === 1 ? "Comment" : "Comments"}
      </h2>

      {isAuthenticated ? (
        <form onSubmit={submit} className="mb-8">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Share what you learned…"
            className="w-full p-3 rounded-md bg-bg-elev border border-zinc-800 focus:border-zinc-600 outline-none text-sm resize-y"
            maxLength={2000}
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-zinc-500">{body.length}/2000</span>
            {error && <span className="text-red-400">{error}</span>}
            <button
              type="submit"
              disabled={pending || body.trim().length < 2}
              className="px-4 py-1.5 rounded-md bg-brand hover:bg-brand-hover text-white text-sm disabled:opacity-50"
            >
              {pending ? "Posting…" : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-zinc-400">
          <a href="/login" className="text-brand hover:underline">
            Sign in
          </a>{" "}
          to leave a comment.
        </p>
      )}

      <ul className="space-y-5">
        {list.map((c) => (
          <li key={c.id} className="flex gap-3">
            {c.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.author.avatarUrl}
                alt=""
                className="w-9 h-9 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex-shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-medium text-white">
                  {c.author.displayName ?? c.author.username}
                </span>
                {c.author.role !== "USER" && (
                  <span className="text-[10px] uppercase tracking-wide bg-brand/20 text-brand px-1.5 rounded">
                    {c.author.role.replace("_", " ").toLowerCase()}
                  </span>
                )}
                <span className="text-zinc-500 text-xs">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-200 whitespace-pre-wrap break-words">
                {c.body}
              </p>
              {currentUserId === c.author.id && (
                <p className="mt-1 text-[11px] text-zinc-500">Your comment</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
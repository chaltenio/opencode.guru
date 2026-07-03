"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTagAction } from "@/app/actions/video";

export function TagAdminForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"TOPIC" | "TOOL" | "LANGUAGE">("TOPIC");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createTagAction({ name, description, category });
      if (r.ok) {
        setName("");
        setDescription("");
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="p-4 rounded-lg bg-bg-elev border border-zinc-800 space-y-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name (e.g. LSP)"
        required
        className="w-full px-3 py-2 rounded bg-bg border border-zinc-700 text-sm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional)"
        className="w-full px-3 py-2 rounded bg-bg border border-zinc-700 text-sm"
      />
      <div className="flex items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="px-3 py-2 rounded bg-bg border border-zinc-700 text-sm"
        >
          <option value="TOPIC">Topic</option>
          <option value="TOOL">Tool</option>
          <option value="LANGUAGE">Language</option>
        </select>
        <button
          type="submit"
          disabled={pending || name.trim().length < 2}
          className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create tag"}
        </button>
      </div>
    </form>
  );
}
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, X } from "lucide-react";
import { requestEmailChangeAction, cancelEmailChangeAction } from "@/app/actions/profile";

export function EmailChangeForm() {
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newEmail !== confirmEmail) {
      setMsg({ kind: "err", text: "Email and confirmation must match." });
      return;
    }
    startTransition(async () => {
      const r = await requestEmailChangeAction({ newEmail, confirmEmail });
      if (r.ok) {
        setMsg({ kind: "ok", text: r.message });
        setNewEmail("");
        setConfirmEmail("");
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error || "Failed" });
      }
    });
  }

  function cancel() {
    setMsg(null);
    startTransition(async () => {
      const r = await cancelEmailChangeAction();
      if (r.ok) {
        setMsg({ kind: "ok", text: "Pending email change cancelled." });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error || "Failed" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-1">
          New email
        </label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-1">
          Confirm new email
        </label>
        <input
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
          autoComplete="email"
        />
      </div>
      <p className="text-[11px] text-zinc-500">
        We will send a confirmation link to the new address. The change takes
        effect only after you click the link. Expires in 24 hours.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !newEmail || !confirmEmail}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-semibold disabled:opacity-50"
        >
          <Mail className="w-4 h-4" />
          {pending ? "Sending…" : "Send confirmation"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-zinc-400 hover:text-white text-xs disabled:opacity-50"
          title="Cancel a pending email change (if any)"
        >
          <X className="w-3.5 h-3.5" />
          Cancel pending
        </button>
      </div>
      {msg && (
        <p
          className={`text-xs ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}
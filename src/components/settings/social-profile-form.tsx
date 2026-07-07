"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSocialProfileAction } from "@/app/actions/profile";
import { Save, Github, Youtube, Twitch, Video, Linkedin, Globe } from "lucide-react";

interface SocialInitial {
  displayName: string;
  bio: string;
  githubUsername: string;
  youtubeHandle: string;
  twitchUsername: string;
  vimeoUsername: string;
  linkedinSlug: string;
  xHandle: string;
}

export function SocialProfileForm({ initial }: { initial: SocialInitial }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  function update<K extends keyof SocialInitial>(key: K, value: SocialInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await updateSocialProfileAction(form);
      if (r.ok) {
        setMsg({ kind: "ok", text: "Profile updated" });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: r.error || "Failed" });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold text-white">Profile</h2>

      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-1">
          Display name
        </label>
        <input
          value={form.displayName}
          onChange={(e) => update("displayName", e.target.value)}
          maxLength={80}
          className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-1">
          Bio (max 500 chars)
        </label>
        <textarea
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">
          Social accounts
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          Add your handles so others can follow you on other platforms. Leave
          a field blank to remove it. Public profile shows them as badges.
        </p>
        <div className="space-y-3">
          <SocialField
            label="GitHub"
            icon={Github}
            placeholder="octocat"
            value={form.githubUsername}
            onChange={(v) => update("githubUsername", v)}
          />
          <SocialField
            label="YouTube"
            icon={Youtube}
            placeholder="your-channel-name (without @)"
            value={form.youtubeHandle}
            onChange={(v) => update("youtubeHandle", v)}
          />
          <SocialField
            label="Twitch"
            icon={Twitch}
            placeholder="streamer-name"
            value={form.twitchUsername}
            onChange={(v) => update("twitchUsername", v)}
          />
          <SocialField
            label="Vimeo"
            icon={Video}
            placeholder="username"
            value={form.vimeoUsername}
            onChange={(v) => update("vimeoUsername", v)}
          />
          <SocialField
            label="LinkedIn"
            icon={Linkedin}
            placeholder="public-slug (the part after /in/)"
            value={form.linkedinSlug}
            onChange={(v) => update("linkedinSlug", v)}
            maxLength={128}
          />
          <SocialField
            label="X (Twitter)"
            icon={Globe}
            placeholder="handle (without @)"
            value={form.xHandle}
            onChange={(v) => update("xHandle", v)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-semibold disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {pending ? "Saving…" : "Save profile"}
        </button>
        {msg && (
          <span
            className={`text-xs ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function SocialField({
  label,
  icon: Icon,
  placeholder,
  value,
  onChange,
  maxLength = 64,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">
        <Icon className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-1.5 rounded-md bg-bg-elev border border-zinc-800 text-sm font-mono"
      />
    </div>
  );
}
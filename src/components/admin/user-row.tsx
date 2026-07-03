"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserRoleAction, setUserStatusAction } from "@/app/actions/video";
import type { User } from "@/db/schema";

export function UserRow({
  user,
  isSuperAdmin,
}: {
  user: User;
  isSuperAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setRole(role: "USER" | "MODERATOR" | "SUPER_ADMIN") {
    if (!confirm(`Set role of @${user.username} to ${role}?`)) return;
    startTransition(async () => {
      const r = await setUserRoleAction({ userId: user.id, role });
      if (r.ok) router.refresh();
    });
  }

  function setStatus(status: "ACTIVE" | "SUSPENDED" | "BANNED") {
    if (status === "BANNED" && !confirm(`Ban @${user.username}? This is severe.`))
      return;
    startTransition(async () => {
      const r = await setUserStatusAction({ userId: user.id, status });
      if (r.ok) router.refresh();
    });
  }

  return (
    <tr className="border-t border-zinc-800">
      <td className="px-3 py-2 text-white">
        <a href={`/u/${user.username}`} className="hover:text-brand">
          {user.displayName ?? user.username}
        </a>
        <span className="ml-2 text-xs text-zinc-500">@{user.username}</span>
      </td>
      <td className="px-3 py-2 text-zinc-300">{user.email}</td>
      <td className="px-3 py-2">
        {isSuperAdmin ? (
          <select
            value={user.role}
            disabled={pending}
            onChange={(e) => setRole(e.target.value as "USER" | "MODERATOR" | "SUPER_ADMIN")}
            className="bg-bg border border-zinc-700 text-xs px-1.5 py-0.5 rounded"
          >
            <option value="USER">USER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        ) : (
          <span className="text-zinc-300">{user.role}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <select
          value={user.status}
          disabled={pending || (user.status === "BANNED" && !isSuperAdmin)}
          onChange={(e) =>
            setStatus(e.target.value as "ACTIVE" | "SUSPENDED" | "BANNED")
          }
          className="bg-bg border border-zinc-700 text-xs px-1.5 py-0.5 rounded"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          {isSuperAdmin && <option value="BANNED">BANNED</option>}
        </select>
      </td>
      <td className="px-3 py-2 text-zinc-400 text-xs">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}
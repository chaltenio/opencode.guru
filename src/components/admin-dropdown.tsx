"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

interface AdminDropdownProps {
  role: "SUPER_ADMIN" | "MODERATOR";
}

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/queue", label: "Review queue" },
  { href: "/admin/videos", label: "All videos" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/leaderboard", label: "Leaderboard", superAdminOnly: true },
];

export function AdminDropdown({ role }: AdminDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-xs uppercase tracking-wide px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 inline-flex items-center gap-1"
      >
        Admin
        <ChevronDown
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-48 rounded-md border border-zinc-800 bg-bg-elev shadow-xl py-1 z-50"
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            {role.replace("_", " ").toLowerCase()}
          </div>
          {ADMIN_LINKS.map((link) => {
            // Only SUPER_ADMIN can see Audit log (it's currently public-ish)
            if ("superAdminOnly" in link && link.superAdminOnly && role !== "SUPER_ADMIN") return null;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 hover:text-white"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
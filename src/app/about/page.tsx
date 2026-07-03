export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 prose prose-invert">
      <h1 className="text-3xl font-bold text-white">About opencode.guru</h1>
      <p className="text-zinc-300 mt-4">
        <strong className="text-white">opencode.guru</strong> is a
        community-curated library of video tutorials about{" "}
        <a href="https://opencode.ai" className="text-brand">
          opencode
        </a>
        , the open-source AI coding CLI/IDE.
      </p>
      <p className="text-zinc-300 mt-3">
        Anyone signed in can submit a video. Moderators review submissions for
        quality, accuracy, and originality. Approved videos get ranked by an{" "}
        <code>order</code> field — sponsored videos get top placement (order =
        1).
      </p>
      <h2 className="text-xl font-semibold text-white mt-8">Roles</h2>
      <ul className="text-zinc-300 mt-2 space-y-1">
        <li>
          <strong className="text-white">Super admin</strong> — full control:
          approve/reject videos, change ordering, manage users and tags.
        </li>
        <li>
          <strong className="text-white">Moderator</strong> — review queue, tag
          management, comments, reports. Cannot ban users or change video order.
        </li>
        <li>
          <strong className="text-white">User</strong> — submit videos, comment,
          like, save to watchlist, track watch history.
        </li>
      </ul>
      <h2 className="text-xl font-semibold text-white mt-8">Stack</h2>
      <ul className="text-zinc-300 mt-2 space-y-1">
        <li>Next.js 14 (App Router) + TypeScript</li>
        <li>PostgreSQL via Drizzle ORM (Vercel Postgres / Neon)</li>
        <li>Auth.js (NextAuth v5) — GitHub & Google OAuth, JWT sessions</li>
        <li>Tailwind CSS + lucide-react icons</li>
        <li>Server Actions + Zod validation</li>
      </ul>
    </div>
  );
}
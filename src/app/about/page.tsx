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
    </div>
  );
}
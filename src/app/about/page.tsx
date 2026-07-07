export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-white">About opencode.guru</h1>
      <p className="text-zinc-300 mt-4">
        <strong className="text-white">opencode.guru</strong> is a
        community-curated library of video tutorials about{" "}
        <a href="https://opencode.ai" className="text-brand hover:text-brand-hover">
          opencode
        </a>
        , the open-source AI coding CLI/IDE.
      </p>
    </div>
  );
}
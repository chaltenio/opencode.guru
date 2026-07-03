import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20 text-center">
      <h1 className="text-6xl font-extrabold text-brand">404</h1>
      <p className="mt-4 text-xl text-white">This page isn&apos;t on the feed.</p>
      <p className="mt-2 text-zinc-400">
        The video may have been removed by a moderator or never existed.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-5 py-2 rounded-md bg-brand hover:bg-brand-hover text-white"
      >
        Back home
      </Link>
    </div>
  );
}
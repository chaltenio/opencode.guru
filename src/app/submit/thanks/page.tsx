import Link from "next/link";

export default async function SubmitThanks({
  searchParams,
}: {
  searchParams: { slug?: string };
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-white mb-3">Thanks for submitting!</h1>
      <p className="text-zinc-300 mb-6">
        A moderator will review your video shortly. You&apos;ll get a
        notification once it&apos;s approved.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          href="/"
          className="px-5 py-2 rounded-md bg-brand hover:bg-brand-hover text-white"
        >
          Back home
        </Link>
        <Link
          href="/submit"
          className="px-5 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
        >
          Submit another
        </Link>
      </div>
    </div>
  );
}
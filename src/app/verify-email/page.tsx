import { redirect } from "next/navigation";
import { verifyEmailChangeAction } from "@/app/actions/profile";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token?.trim();
  if (!token) {
    return <Result ok={false} message="Missing verification token in the URL." />;
  }

  const result = await verifyEmailChangeAction({ token });
  if (result.ok) {
    return (
      <Result
        ok
        message={`Your email has been updated to ${result.newEmail}. You can keep using the site as usual.`}
      />
    );
  }
  return <Result ok={false} message={result.error ?? "Verification failed."} />;
}

function Result({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-xl border border-zinc-800 bg-bg-elev p-8 text-center">
        {ok ? (
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        ) : (
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        )}
        <h1
          className={`text-xl font-semibold ${ok ? "text-emerald-300" : "text-red-300"}`}
        >
          {ok ? "Email verified" : "Verification failed"}
        </h1>
        <p className="text-sm text-zinc-300 mt-3">{message}</p>
        <div className="mt-6 flex justify-center gap-3 text-sm">
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700"
          >
            Home
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-white"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
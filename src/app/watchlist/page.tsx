import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listWatchlist, listContinueWatching } from "@/db/queries";
import { VideoCard } from "@/components/video-card";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/watchlist");

  const [items, history] = await Promise.all([
    listWatchlist(session.user.id),
    listContinueWatching(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">My List</h1>

      {history.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">
            Continue watching
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {history.map((h) => {
              const pct =
                h.totalDurationSec > 0
                  ? Math.min(
                      100,
                      Math.round((h.watchedSeconds / h.totalDurationSec) * 100),
                    )
                  : 0;
              return (
                <div key={h.video.id} className="block">
                  <VideoCard video={h.video} />
                  <div className="mt-1.5">
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {formatDuration(h.watchedSeconds)} /{" "}
                      {formatDuration(h.totalDurationSec)} watched
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <h2 className="text-lg font-semibold text-white mb-3">Saved for later</h2>
      {items.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          You haven&apos;t saved any videos yet. Click the bookmark icon on a
          video page to save it.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((i) => (
            <VideoCard key={i.video.id} video={i.video} />
          ))}
        </div>
      )}
    </div>
  );
}
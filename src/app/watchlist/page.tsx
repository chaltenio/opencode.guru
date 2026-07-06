import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  listContinueWatching,
  listLabeledVideos,
  countLabelsForUser,
} from "@/db/queries";
import { VideoCard } from "@/components/video-card";
import { formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LabelFilter = "TO_WATCH" | "WATCHED" | "TO_REWATCH";

const LABEL_TABS: { value: LabelFilter; label: string }[] = [
  { value: "TO_WATCH", label: "To watch" },
  { value: "WATCHED", label: "Watched" },
  { value: "TO_REWATCH", label: "To re-watch" },
];

const VALID_LABELS = new Set<LabelFilter>([
  "TO_WATCH",
  "WATCHED",
  "TO_REWATCH",
]);

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: { label?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/watchlist");

  const activeLabel: LabelFilter | null =
    searchParams.label && VALID_LABELS.has(searchParams.label as LabelFilter)
      ? (searchParams.label as LabelFilter)
      : null;

  const [history, labeled, counts] = await Promise.all([
    listContinueWatching(session.user.id),
    activeLabel
      ? listLabeledVideos(session.user.id, activeLabel)
      : Promise.resolve([]),
    countLabelsForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">My Library</h1>

      {/* Label tabs */}
      <nav className="mb-8 flex gap-2 border-b border-zinc-800">
        {LABEL_TABS.map((tab) => {
          const isActive = activeLabel === tab.value;
          const count = counts[tab.value] ?? 0;
          return (
            <a
              key={tab.value}
              href={`/watchlist?label=${tab.value}`}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition ${
                isActive
                  ? "border-brand text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs text-zinc-500">({count})</span>
            </a>
          );
        })}
      </nav>

      {history.length > 0 && !activeLabel && (
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
                      Math.round(
                        (h.watchedSeconds / h.totalDurationSec) * 100,
                      ),
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

      {activeLabel && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">
            {LABEL_TABS.find((t) => t.value === activeLabel)?.label}
          </h2>
          {labeled.length === 0 ? (
            <p className="text-zinc-400 text-sm">
              Nothing here yet. Mark a video as{" "}
              <b>
                {LABEL_TABS.find((t) => t.value === activeLabel)?.label}
              </b>{" "}
              from any video page and it will show up here.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {labeled.map((row) => (
                <VideoCard key={row.video.id} video={row.video} />
              ))}
            </div>
          )}
        </section>
      )}

      {!activeLabel && (
        <p className="text-zinc-500 text-sm">
          Pick a tab above to see videos you&apos;ve labeled.
        </p>
      )}
    </div>
  );
}
import Link from "next/link";
import { listTags } from "@/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const CATEGORY_LABEL = {
  TOPIC: "Topics",
  TOOL: "Tools",
  LANGUAGE: "Languages",
};

export default async function TagsPage() {
  const tags = await listTags(500);
  const byCategory: Record<string, typeof tags> = {
    TOPIC: [],
    TOOL: [],
    LANGUAGE: [],
  };
  for (const t of tags) byCategory[t.category]?.push(t);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Tags</h1>
      {(Object.keys(byCategory) as Array<keyof typeof CATEGORY_LABEL>).map(
        (cat) => (
          <section key={cat} className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">
              {CATEGORY_LABEL[cat]}
            </h2>
            <div className="flex flex-wrap gap-2">
              {byCategory[cat].length === 0 ? (
                <span className="text-sm text-zinc-500">No tags yet</span>
              ) : (
                byCategory[cat].map((t) => (
                  <Link
                    key={t.id}
                    href={`/tags/${t.slug}`}
                    className="px-3 py-1.5 text-sm rounded-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  >
                    #{t.name}
                    <span className="ml-1.5 text-xs text-zinc-500">
                      {t.usageCount}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
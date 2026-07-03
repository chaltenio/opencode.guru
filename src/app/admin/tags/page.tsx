import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listPendingTagSuggestions,
  listTags,
} from "@/db/queries";
import { TagAdminForm } from "@/components/admin/tag-admin-form";
import { TagSuggestionRow } from "@/components/admin/tag-suggestion-row";

export const dynamic = "force-dynamic";

export default async function TagsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "MODERATOR" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  const [allTags, suggestions] = await Promise.all([
    listTags(200),
    listPendingTagSuggestions(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Tag management</h1>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Create new tag
        </h2>
        <TagAdminForm />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          Pending suggestions ({suggestions.length})
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No pending suggestions.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <TagSuggestionRow key={s.id} suggestion={s} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-3">
          All tags ({allTags.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {allTags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-200"
            >
              #{t.name}
              <span className="ml-1.5 text-zinc-500">{t.usageCount}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
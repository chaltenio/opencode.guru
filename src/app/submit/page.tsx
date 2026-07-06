import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { submitVideoAction } from "@/app/actions/video";
import slugify from "slugify";
import { desc, eq } from "drizzle-orm";
import { SUPPORTED_LANGUAGES } from "@/lib/validation";

const LANGUAGE_LABEL: Record<string, string> = {
  EN: "English",
  ES: "Spanish (Español)",
  PT: "Portuguese (Português)",
  HI: "Hindi (हिन्दी)",
  ZH: "Mandarin Chinese (中文)",
};

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/submit");

  const allTags = await db
    .select({ id: tags.id, name: tags.name, slug: tags.slug, category: tags.category })
    .from(tags)
    .orderBy(desc(tags.usageCount), tags.name)
    .limit(200);

  async function action(formData: FormData) {
    "use server";
    const tagIds = formData.getAll("tagIds").map(String);
    const result = await submitVideoAction({
      title: formData.get("title"),
      shortDescription: formData.get("shortDescription"),
      description: formData.get("description") ?? "",
      externalUrl: formData.get("externalUrl"),
      level: formData.get("level"),
      language: formData.get("language") ?? "EN",
      tagIds,
    });
    if (result.ok) {
      redirect(`/submit/thanks?slug=${result.slug}`);
    } else {
      throw new Error(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-1">Submit a video</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Your video will go through moderator review before it appears on the
        site.
      </p>

      <form action={action} className="space-y-5">
        <Field label="Title" name="title" required maxLength={200} />
        <Field
          label="Short description (max 150 chars)"
          name="shortDescription"
          required
          maxLength={150}
        />
        <Field
          label="Video URL (YouTube, Vimeo, Twitch, or other)"
          name="externalUrl"
          type="url"
          required
          placeholder="https://www.youtube.com/watch?v=…"
        />

        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-1">
            Level
          </label>
          <select
            name="level"
            required
            className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-1">
            Spoken language
          </label>
          <select
            name="language"
            defaultValue="EN"
            className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
          >
            {SUPPORTED_LANGUAGES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGE_LABEL[code]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">
            Default is English. Used for filtering in the future.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-1">
            Tags (select up to ~5)
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-md bg-bg-elev border border-zinc-800">
            {allTags.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
              >
                <input type="checkbox" name="tagIds" value={t.id} className="accent-brand" />
                #{t.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-200 mb-1">
            Long description (optional, markdown supported)
          </label>
          <textarea
            name="description"
            rows={5}
            className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
          />
        </div>

        <button className="px-6 py-2.5 rounded-md bg-brand hover:bg-brand-hover text-white font-semibold">
          Submit for review
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-200 mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-md bg-bg-elev border border-zinc-800 text-sm"
      />
    </div>
  );
}
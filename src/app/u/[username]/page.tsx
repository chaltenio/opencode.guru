import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { users, videos } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { VideoCard } from "@/components/video-card";
import { timeAgo } from "@/lib/utils";
import { Github, Youtube, Twitch, Linkedin, Globe, Video } from "lucide-react";

interface PageProps {
  params: { username: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 60;

interface SocialLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}

function buildSocials(u: typeof users.$inferSelect): SocialLink[] {
  const out: SocialLink[] = [];
  if (u.githubUsername)
    out.push({
      href: `https://github.com/${u.githubUsername}`,
      label: `GitHub: ${u.githubUsername}`,
      icon: Github,
      className: "hover:text-white",
    });
  if (u.youtubeHandle)
    out.push({
      href: `https://www.youtube.com/@${u.youtubeHandle}`,
      label: `YouTube: @${u.youtubeHandle}`,
      icon: Youtube,
      className: "hover:text-red-400",
    });
  if (u.twitchUsername)
    out.push({
      href: `https://www.twitch.tv/${u.twitchUsername}`,
      label: `Twitch: ${u.twitchUsername}`,
      icon: Twitch,
      className: "hover:text-purple-400",
    });
  if (u.vimeoUsername)
    out.push({
      href: `https://vimeo.com/${u.vimeoUsername}`,
      label: `Vimeo: ${u.vimeoUsername}`,
      icon: Video,
      className: "hover:text-sky-400",
    });
  if (u.linkedinSlug)
    out.push({
      href: `https://www.linkedin.com/in/${u.linkedinSlug}`,
      label: `LinkedIn: ${u.linkedinSlug}`,
      icon: Linkedin,
      className: "hover:text-sky-400",
    });
  if (u.xHandle)
    out.push({
      href: `https://x.com/${u.xHandle}`,
      label: `X: @${u.xHandle}`,
      icon: Globe,
      className: "hover:text-white",
    });
  return out;
}

export default async function UserProfilePage({ params }: PageProps) {
  const user = (
    await db.select().from(users).where(eq(users.username, params.username)).limit(1)
  )[0];
  if (!user || user.status === "BANNED") notFound();

  const userVideos = await db
    .select()
    .from(videos)
    .where(
      and(
        eq(videos.submittedById, user.id),
        eq(videos.status, "APPROVED"),
        eq(videos.published, true),
      ),
    )
    .orderBy(desc(videos.publishedAt))
    .limit(60);

  const submitter = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  };

  const socials = buildSocials(user);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-start gap-6 mb-8">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="w-24 h-24 rounded-full border border-zinc-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-zinc-700" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white">
            {user.displayName ?? user.username}
          </h1>
          <p className="text-sm text-zinc-500">@{user.username}</p>
          {user.bio && (
            <p className="mt-2 text-zinc-300 max-w-xl whitespace-pre-wrap">
              {user.bio}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span>Joined {timeAgo(user.createdAt)}</span>
            {user.role !== "USER" && (
              <span className="uppercase bg-brand/15 text-brand px-2 py-0.5 rounded">
                {user.role.replace("_", " ").toLowerCase()}
              </span>
            )}
            <Link
              href="/settings"
              className="text-zinc-500 hover:text-white underline-offset-2 hover:underline"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </header>

      {socials.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Links
          </h2>
          <div className="flex flex-wrap gap-2">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  title={s.label}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-sm ${s.className}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{s.label.split(": ")[1] ?? s.label}</span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <h2 className="text-lg font-semibold text-white mb-4">
        Tutorials submitted ({userVideos.length})
      </h2>
      {userVideos.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          No tutorials yet.{" "}
          <Link href="/submit" className="text-brand">Submit one →</Link>
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {userVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={{ ...v, submitter }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import { listPublishedVideos } from "@/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function Sitemap() {
  const videos = await listPublishedVideos({ limit: 5000 });

  const videoEntries = videos.map((v) => ({
    url: `${BASE}/v/${v.slug}`,
    lastModified: v.publishedAt ?? v.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticEntries = [
    { url: BASE, lastModified: new Date(), changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE}/browse`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 },
    { url: `${BASE}/tags`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE}/leaderboard`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.5 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  return [...staticEntries, ...videoEntries];
}
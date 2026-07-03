import { listPublishedVideos } from "@/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "opencode.guru";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const videos = await listPublishedVideos({ limit: 50 });
  const items = videos
    .map((v) => {
      const link = `${BASE}/v/${v.slug}`;
      const pub = v.publishedAt ?? v.createdAt;
      return `
    <item>
      <title>${escapeXml(v.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${new Date(pub).toUTCString()}</pubDate>
      <description>${escapeXml(v.shortDescription)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${APP_NAME}</title>
    <link>${BASE}</link>
    <description>Latest opencode tutorials.</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
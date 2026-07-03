/**
 * Seed script — populates the DB with a SUPER_ADMIN, sample tags, and a few
 * approved videos. Run with: `npm run db:seed`
 *
 * Requires POSTGRES_URL in environment.
 */
import { db } from "../src/db";
import {
  users,
  tags,
  videos,
  videoTags,
  videoSeries,
  comments,
  videoLikes,
} from "../src/db/schema";
import { eq } from "drizzle-orm";
import slugify from "slugify";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@opencode.guru";

async function main() {
  console.log("Seeding…");

  // 1) Admin user (no-op if exists)
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);
  let adminId: string;
  if (existingAdmin[0]) {
    adminId = existingAdmin[0].id;
    console.log(`✓ Admin already exists: ${ADMIN_EMAIL}`);
  } else {
    const inserted = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        username: "admin",
        displayName: "opencode.guru admin",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      })
      .returning();
    adminId = inserted[0].id;
    console.log(`✓ Created admin ${ADMIN_EMAIL}`);
  }

  // 2) Tags
  const tagNames = [
    { name: "Getting Started", category: "TOPIC" as const },
    { name: "LSP", category: "TOOL" as const },
    { name: "MCP Servers", category: "TOOL" as const },
    { name: "Plugins", category: "TOPIC" as const },
    { name: "Theming", category: "TOPIC" as const },
    { name: "TypeScript", category: "LANGUAGE" as const },
    { name: "Python", category: "LANGUAGE" as const },
    { name: "Go", category: "LANGUAGE" as const },
    { name: "Tips & Tricks", category: "TOPIC" as const },
    { name: "Performance", category: "TOPIC" as const },
  ];
  const tagRows = await db
    .insert(tags)
    .values(
      tagNames.map((t) => ({
        name: t.name,
        slug: slugify(t.name, { lower: true, strict: true }).slice(0, 80),
        category: t.category,
        createdById: adminId,
      })),
    )
    .onConflictDoNothing()
    .returning();
  console.log(`✓ Tags (${tagRows.length} new, ${tagNames.length} total)`);

  // 3) Sample series
  const seriesSlug = "opencode-essentials";
  const existingSeries = await db
    .select()
    .from(videoSeries)
    .where(eq(videoSeries.slug, seriesSlug))
    .limit(1);
  let seriesId: string | null = existingSeries[0]?.id ?? null;
  if (!seriesId) {
    const s = await db
      .insert(videoSeries)
      .values({
        title: "opencode Essentials",
        slug: seriesSlug,
        description: "A short course covering the core concepts.",
        createdById: adminId,
      })
      .returning();
    seriesId = s[0].id;
    console.log(`✓ Series: opencode Essentials`);
  }

  // 4) Sample videos (placeholder URLs — real ones go through moderation)
  const samples = [
    {
      title: "opencode in 5 minutes — first impressions",
      shortDescription: "A whirlwind tour of the opencode CLI and editor.",
      description: "We install opencode, configure a model, run a small task.",
      externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "YOUTUBE" as const,
      level: "BEGINNER" as const,
      order: 1,
      isFeatured: true,
      isSponsored: true,
      durationSec: 312,
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    },
    {
      title: "Configuring LSP for your favorite language",
      shortDescription: "Set up LSP servers to get inline completions and diagnostics.",
      description: "",
      externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "YOUTUBE" as const,
      level: "INTERMEDIATE" as const,
      order: 2,
      durationSec: 845,
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    },
    {
      title: "MCP servers deep dive",
      shortDescription: "Connect opencode to your editor, browser, and shell via MCP.",
      description: "",
      externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      platform: "YOUTUBE" as const,
      level: "ADVANCED" as const,
      order: 10,
      durationSec: 1640,
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    },
  ];

  for (const s of samples) {
    const slug = slugify(s.title, { lower: true, strict: true }).slice(0, 220);
    const exists = await db
      .select()
      .from(videos)
      .where(eq(videos.slug, slug))
      .limit(1);
    if (exists[0]) continue;

    const inserted = await db
      .insert(videos)
      .values({
        ...s,
        slug,
        platformVideoId: "dQw4w9WgXcQ",
        submittedById: adminId,
        reviewedById: adminId,
        reviewedAt: new Date(),
        status: "APPROVED",
        published: true,
        publishedAt: new Date(),
        seriesId: s.order === 1 ? seriesId : null,
      })
      .returning();

    // Attach first 2 tags as a sample
    const tIds = tagRows.slice(0, 2).map((t) => t.id);
    if (tIds.length > 0) {
      await db
        .insert(videoTags)
        .values(tIds.map((tagId) => ({ videoId: inserted[0].id, tagId })));
    }
    console.log(`✓ Video: ${s.title}`);
  }

  // 5) A couple of demo comments
  const allVideos = await db.select().from(videos).limit(3);
  for (const v of allVideos) {
    await db.insert(comments).values({
      videoId: v.id,
      userId: adminId,
      body: "Great breakdown — thanks for putting this together!",
    });
    await db.insert(videoLikes).values({
      videoId: v.id,
      userId: adminId,
      value: "LIKE",
    });
  }

  console.log("\n🎉 Seed complete.");
  console.log(`\nNext steps:`);
  console.log(`1. Sign in with GitHub using the email: ${ADMIN_EMAIL}`);
  console.log(`2. Manually promote yourself in DB to SUPER_ADMIN if not already:`);
  console.log(`   UPDATE users SET role='SUPER_ADMIN' WHERE email='${ADMIN_EMAIL}';`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
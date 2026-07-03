/**
 * Seed script — idempotent. Populates an admin user, tags, and a few demo
 * videos. Safe to re-run; existing rows are detected and skipped.
 *
 * Auto-runs on every Vercel build (see vercel.json) but only inserts data if
 * the DB is empty.
 *
 * Environment: POSTGRES_URL (or POSTGRES_URL_NON_POOLING for migrations-style
 * connections) must be set.
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
  if (process.env.SEED_ENABLED === "false") {
    console.log("[seed] SEED_ENABLED=false — skipping.");
    process.exit(0);
  }
  console.log("[seed] Checking current state…");

  const existingVideos = await db.select().from(videos).limit(1);
  if (existingVideos.length > 0) {
    console.log(
      `[seed] DB already has ${existingVideos.length > 0 ? "content" : "data"} — skipping seed.`,
    );
    console.log("[seed] To force re-seed, manually DELETE FROM videos CASCADE first.");
    process.exit(0);
  }

  console.log("[seed] DB is empty — seeding…");

  // 1) Admin user
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);
  let adminId: string;
  if (existingAdmin[0]) {
    adminId = existingAdmin[0].id;
    console.log(`[seed] ✓ Admin already exists: ${ADMIN_EMAIL}`);
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
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) {
      adminId = inserted[0].id;
      console.log(`[seed] ✓ Created admin ${ADMIN_EMAIL}`);
    } else {
      // Lost the race — re-read
      const r = await db
        .select()
        .from(users)
        .where(eq(users.email, ADMIN_EMAIL))
        .limit(1);
      adminId = r[0].id;
    }
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
  console.log(`[seed] ✓ Tags (${tagRows.length} new, ${tagNames.length} total)`);

  // If tags were all already present, fetch them so we can attach to videos
  let allTags = tagRows;
  if (tagRows.length === 0) {
    allTags = await db.select().from(tags);
  }

  // 3) Series
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
      .onConflictDoNothing()
      .returning();
    seriesId = s[0]?.id ?? null;
    if (seriesId) console.log(`[seed] ✓ Series: opencode Essentials`);
  }

  // 4) Sample videos
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

    const tIds = allTags.slice(0, 2).map((t) => t.id);
    if (tIds.length > 0) {
      await db
        .insert(videoTags)
        .values(tIds.map((tagId) => ({ videoId: inserted[0].id, tagId })))
        .onConflictDoNothing();
    }
    console.log(`[seed] ✓ Video: ${s.title}`);
  }

  // 5) Demo comments
  const allVideos = await db.select().from(videos).limit(3);
  for (const v of allVideos) {
    const existing = await db
      .select()
      .from(comments)
      .where(eq(comments.videoId, v.id))
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(comments).values({
      videoId: v.id,
      userId: adminId,
      body: "Great breakdown — thanks for putting this together!",
    });
    await db
      .insert(videoLikes)
      .values({
        videoId: v.id,
        userId: adminId,
        value: "LIKE",
      })
      .onConflictDoNothing();
  }

  console.log("\n[seed] 🎉 Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[seed] ✗ Error:", e);
  process.exit(1);
});
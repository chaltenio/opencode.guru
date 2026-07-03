"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  videos,
  videoTags,
  comments,
  videoLikes,
  watchlist,
  reports,
  notifications,
  subscriptions,
  tags,
  tagSuggestions,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  commentSchema,
  likeSchema,
  reportSchema,
  submitVideoSchema,
  watchProgressSchema,
} from "@/lib/validation";
import { parseVideoUrl, slugFor, thumbnailFor } from "@/lib/video";
import {
  addToWatchlist,
  attachTagsToVideo,
  createComment,
  createReport,
  incrementVideoViews,
  isInWatchlist,
  removeFromWatchlist,
  setVideoLike,
  upsertWatchProgress,
  writeAudit,
} from "@/db/queries";
import slugify from "slugify";

// ---------------------------------------------------------------------------
// Video submission
// ---------------------------------------------------------------------------
export async function submitVideoAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;

  const parsed = submitVideoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    } as const;
  }

  const videoUrl = parseVideoUrl(parsed.data.externalUrl);
  if (!videoUrl) {
    return { ok: false, error: "Unsupported video URL" } as const;
  }

  let slug = slugFor(parsed.data.title);
  let attempt = 0;
  while (
    (await db.select().from(videos).where(eq(videos.slug, slug)).limit(1))
      .length > 0
  ) {
    attempt += 1;
    slug = `${slugFor(parsed.data.title)}-${attempt}`.slice(0, 220);
    if (attempt > 100) break;
  }

  const inserted = await db
    .insert(videos)
    .values({
      title: parsed.data.title,
      slug,
      shortDescription: parsed.data.shortDescription,
      description: parsed.data.description,
      externalUrl: parsed.data.externalUrl,
      platform: videoUrl.platform,
      platformVideoId: videoUrl.videoId,
      thumbnailUrl: thumbnailFor(videoUrl),
      level: parsed.data.level,
      language: parsed.data.language,
      seriesId: parsed.data.seriesId ?? null,
      submittedById: session.user.id,
      status: "REVIEW",
      published: false,
      order: 10,
    })
    .returning();

  if (parsed.data.tagIds.length > 0) {
    await attachTagsToVideo(inserted[0].id, parsed.data.tagIds);
  }

  await writeAudit({
    actorId: session.user.id,
    action: "video.submit",
    entityType: "video",
    entityId: inserted[0].id,
    diff: { title: parsed.data.title, platform: videoUrl.platform },
  });

  // Notify followers of the submitter that they have a new video (if approved later)
  // We do this upon approval, not submission.

  revalidatePath("/admin");
  return { ok: true, videoId: inserted[0].id, slug: inserted[0].slug } as const;
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
export async function commentAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;

  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    } as const;
  }

  const video = await db
    .select()
    .from(videos)
    .where(eq(videos.id, parsed.data.videoId))
    .limit(1);
  if (!video[0] || video[0].status !== "APPROVED" || !video[0].published) {
    return { ok: false, error: "Video not available" } as const;
  }

  const created = await createComment({
    videoId: parsed.data.videoId,
    userId: session.user.id,
    body: parsed.data.body,
  });

  // Notify the submitter of the video
  if (video[0].submittedById !== session.user.id) {
    await db.insert(notifications).values({
      userId: video[0].submittedById,
      type: "NEW_COMMENT",
      payload: {
        videoId: video[0].id,
        videoSlug: video[0].slug,
        commentId: created.id,
        fromUser: session.user.username,
      },
    });
  }

  revalidatePath(`/v/${video[0].slug}`);
  return {
    ok: true,
    comment: {
      id: created.id,
      body: created.body,
      likeCount: 0,
      status: "VISIBLE",
      createdAt: created.createdAt,
      editedAt: null,
      author: {
        id: session.user.id,
        username: session.user.username,
        displayName: session.user.name ?? session.user.username,
        avatarUrl: session.user.image ?? null,
        role: session.user.role,
      },
    },
  } as const;
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------
export async function likeAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;

  const parsed = likeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" } as const;
  }

  await setVideoLike({
    videoId: parsed.data.videoId,
    userId: session.user.id,
    value: parsed.data.value === "NONE" ? null : parsed.data.value,
  });

  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------
export async function watchlistAction(input: {
  videoId: string;
  action: "ADD" | "REMOVE";
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;
  if (input.action === "ADD") {
    await addToWatchlist(session.user.id, input.videoId);
  } else {
    await removeFromWatchlist(session.user.id, input.videoId);
  }
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Watch progress (continue watching)
// ---------------------------------------------------------------------------
export async function watchProgressAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false } as const;
  const parsed = watchProgressSchema.safeParse(input);
  if (!parsed.success) return { ok: false } as const;
  await upsertWatchProgress({
    userId: session.user.id,
    videoId: parsed.data.videoId,
    watchedSeconds: parsed.data.watchedSeconds,
    totalDurationSec: parsed.data.totalDurationSec,
  });
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
export async function reportAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    } as const;
  }
  await createReport({
    reporterId: session.user.id,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
  });
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Tag suggestion (any user)
// ---------------------------------------------------------------------------
export async function suggestTagAction(input: { name: string; description?: string; category?: "TOPIC" | "TOOL" | "LANGUAGE" }) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;
  if (input.name.trim().length < 2) return { ok: false, error: "Name too short" } as const;

  await db.insert(tagSuggestions).values({
    name: input.name.trim(),
    description: input.description ?? null,
    category: input.category ?? "TOPIC",
    suggestedById: session.user.id,
    status: "PENDING",
  });
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Admin: review decision
// ---------------------------------------------------------------------------
export async function reviewVideoAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sign in required" } as const;
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    return { ok: false, error: "Forbidden" } as const;
  }

  const { reviewDecisionSchema } = await import("@/lib/validation");
  const parsed = reviewDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  const existing = await db
    .select()
    .from(videos)
    .where(eq(videos.id, parsed.data.videoId))
    .limit(1);
  if (!existing[0]) return { ok: false, error: "Not found" } as const;

  if (parsed.data.decision === "APPROVE") {
    await db
      .update(videos)
      .set({
        status: "APPROVED",
        published: parsed.data.publish,
        publishedAt: parsed.data.publish ? new Date() : null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, parsed.data.videoId));
    // Notify the submitter
    await db.insert(notifications).values({
      userId: existing[0].submittedById,
      type: "VIDEO_APPROVED",
      payload: { videoId: existing[0].id, videoSlug: existing[0].slug },
    });
    await writeAudit({
      actorId: session.user.id,
      action: "video.approve",
      entityType: "video",
      entityId: existing[0].id,
      diff: { published: parsed.data.publish },
    });
    // Notify subscribers of the submitter
    const subs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.targetType, "USER"),
          eq(subscriptions.targetId, existing[0].submittedById),
        ),
      );
    if (subs.length > 0) {
      await db.insert(notifications).values(
        subs.map((s) => ({
          userId: s.followerId,
          type: "NEW_VIDEO_FROM_SUBSCRIPTION" as const,
          payload: {
            videoId: existing[0].id,
            videoSlug: existing[0].slug,
            fromUserId: existing[0].submittedById,
          },
        })),
      );
    }
  } else {
    await db
      .update(videos)
      .set({
        status: "REJECTED",
        published: false,
        publishedAt: null,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        rejectionReason: parsed.data.rejectionReason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, parsed.data.videoId));
    await db.insert(notifications).values({
      userId: existing[0].submittedById,
      type: "VIDEO_REJECTED",
      payload: {
        videoId: existing[0].id,
        videoSlug: existing[0].slug,
        reason: parsed.data.rejectionReason ?? null,
      },
    });
    await writeAudit({
      actorId: session.user.id,
      action: "video.reject",
      entityType: "video",
      entityId: existing[0].id,
      diff: { reason: parsed.data.rejectionReason },
    });
  }

  revalidatePath("/admin");
  revalidatePath(`/v/${existing[0].slug}`);
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Admin: order / featured / sponsored
// ---------------------------------------------------------------------------
export async function updateVideoOrderAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Forbidden" } as const;
  }
  const { updateVideoOrderSchema } = await import("@/lib/validation");
  const parsed = updateVideoOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" } as const;

  await db
    .update(videos)
    .set({
      order: parsed.data.order,
      isSponsored: parsed.data.isSponsored ?? parsed.data.order <= 3,
      isFeatured:
        parsed.data.isFeatured ?? (parsed.data.order === 1),
      updatedAt: new Date(),
    })
    .where(eq(videos.id, parsed.data.videoId));

  await writeAudit({
    actorId: session.user.id,
    action: "video.reorder",
    entityType: "video",
    entityId: parsed.data.videoId,
    diff: parsed.data,
  });

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Admin: user role
// ---------------------------------------------------------------------------
export async function setUserRoleAction(input: {
  userId: string;
  role: "USER" | "MODERATOR" | "SUPER_ADMIN";
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Forbidden" } as const;
  }
  await db
    .update(users)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(users.id, input.userId));
  await writeAudit({
    actorId: session.user.id,
    action: "user.setRole",
    entityType: "user",
    entityId: input.userId,
    diff: { role: input.role },
  });
  revalidatePath("/admin/users");
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Admin: user status (suspend / ban)
// ---------------------------------------------------------------------------
export async function setUserStatusAction(input: {
  userId: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
}) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Forbidden" } as const;
  if (
    session.user.role !== "SUPER_ADMIN" &&
    session.user.role !== "MODERATOR"
  ) {
    return { ok: false, error: "Forbidden" } as const;
  }
  // Only SUPER_ADMIN can BAN
  if (input.status === "BANNED" && session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Forbidden" } as const;
  }
  await db
    .update(users)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(users.id, input.userId));
  await writeAudit({
    actorId: session.user.id,
    action: "user.setStatus",
    entityType: "user",
    entityId: input.userId,
    diff: { status: input.status },
  });
  return { ok: true } as const;
}

// ---------------------------------------------------------------------------
// Admin: tag management
// ---------------------------------------------------------------------------
export async function createTagAction(input: {
  name: string;
  description?: string;
  category?: "TOPIC" | "TOOL" | "LANGUAGE";
}) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "MODERATOR" && session.user.role !== "SUPER_ADMIN")
  ) {
    return { ok: false, error: "Forbidden" } as const;
  }
  const slug = slugify(input.name, { lower: true, strict: true }).slice(0, 80);
  const inserted = await db
    .insert(tags)
    .values({
      name: input.name.trim(),
      slug,
      description: input.description ?? null,
      category: input.category ?? "TOPIC",
      createdById: session.user.id,
    })
    .onConflictDoNothing()
    .returning();
  await writeAudit({
    actorId: session.user.id,
    action: "tag.create",
    entityType: "tag",
    entityId: inserted[0]?.id,
    diff: { name: input.name },
  });
  revalidatePath("/admin/tags");
  return { ok: true, tag: inserted[0] } as const;
}

export async function resolveTagSuggestionAction(input: {
  suggestionId: string;
  decision: "APPROVE" | "REJECT";
}) {
  const session = await auth();
  if (
    !session?.user?.id ||
    (session.user.role !== "MODERATOR" && session.user.role !== "SUPER_ADMIN")
  ) {
    return { ok: false, error: "Forbidden" } as const;
  }
  const rows = await db
    .select()
    .from(tagSuggestions)
    .where(eq(tagSuggestions.id, input.suggestionId))
    .limit(1);
  if (!rows[0]) return { ok: false, error: "Not found" } as const;

  await db
    .update(tagSuggestions)
    .set({
      status: input.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    })
    .where(eq(tagSuggestions.id, input.suggestionId));

  if (input.decision === "APPROVE") {
    const slug = slugify(rows[0].name, { lower: true, strict: true }).slice(0, 80);
    await db
      .insert(tags)
      .values({
        name: rows[0].name,
        slug,
        description: rows[0].description,
        category: rows[0].category,
        createdById: session.user.id,
      })
      .onConflictDoNothing();
  }

  await writeAudit({
    actorId: session.user.id,
    action: "tag.suggestion.resolve",
    entityType: "tagSuggestion",
    entityId: input.suggestionId,
    diff: { decision: input.decision },
  });

  revalidatePath("/admin/tags");
  return { ok: true } as const;
}